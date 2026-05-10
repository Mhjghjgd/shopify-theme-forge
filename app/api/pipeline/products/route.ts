import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyQStashSignature, publishToQStash } from '@/lib/upstash';
import { generateWithClaude } from '@/lib/anthropic';
import { ProductsResponseSchema, DesignBriefSchema } from '@/lib/validators/job';
import { removeTrailingCommas } from '@/lib/shopify/liquid-validator';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    const cloned = req.clone();
    const valid = await verifyQStashSignature(cloned);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { jobId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { jobId } = body;
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  await db.job.update({
    where: { id: jobId },
    data: { progress: 22, currentStep: 'Generating product catalog...' },
  });

  try {
    const brief = DesignBriefSchema.parse(job.designBrief);

    const systemPrompt = `Tu es un expert en e-commerce et copywriting pour la niche ${job.niche}.
Génère des fiches produits professionnelles, attrayantes et cohérentes avec le brand voice fourni.
Réponds UNIQUEMENT en JSON valide, sans markdown.`;

    const userPrompt = `Store: ${job.storeName}
Niche: ${job.niche}
Brand voice: ${brief.brandVoice}
Style: ${brief.style.layoutType}
Image prompt base: ${brief.imagePromptBase}

Génère exactement 4 produits cohérents avec cette niche. Format JSON strict :
{
  "products": [
    {
      "id": "prod_1",
      "name": "Nom du produit",
      "shortDescription": "1 phrase accrocheuse",
      "longDescription": "3 paragraphes détaillés séparés par \\n\\n",
      "price": 149.99,
      "compareAtPrice": 199.99,
      "variants": [
        {"option": "Size", "values": ["S", "M", "L", "XL"]},
        {"option": "Color", "values": ["Black", "White", "Navy"]}
      ],
      "tags": ["tag1", "tag2", "tag3"],
      "imagePrompt": "prompt ultra-précis pour générer l'image de ce produit avec GPT-Image-2, en anglais, photographie commerciale"
    }
  ]
}`;

    const rawJson = await generateWithClaude(systemPrompt, userPrompt, 3000);

    const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Claude response for products');

    const cleaned = removeTrailingCommas(jsonMatch[0]);
    const parsed = ProductsResponseSchema.safeParse(JSON.parse(cleaned));
    if (!parsed.success) {
      throw new Error(`Invalid products response: ${JSON.stringify(parsed.error.flatten())}`);
    }

    await db.job.update({
      where: { id: jobId },
      data: {
        products: parsed.data.products as unknown as import('@prisma/client').Prisma.InputJsonValue,
        progress: 35,
        currentStep: 'Products ready — generating images...',
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await publishToQStash(`${appUrl}/api/pipeline/images`, { jobId });

    return NextResponse.json({ ok: true, step: 'products', count: parsed.data.products.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[products] FATAL job=${jobId}:`, error);
    console.error(`[products] Stack:`, (error as Error)?.stack);
    await db.job.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: `[products] ${message}` },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
