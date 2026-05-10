import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyQStashSignature, publishToQStash } from '@/lib/upstash';
import { buildTheme } from '@/lib/shopify/theme-builder';
import { validateAllSections } from '@/lib/shopify/liquid-validator';
import { DesignBriefSchema, ProductsResponseSchema } from '@/lib/validators/job';
import { GeneratedImageSchema } from '@/lib/validators/theme';
import { z } from 'zod';
import path from 'path';
import fs from 'fs-extra';

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
    data: { progress: 76, currentStep: 'Building theme files...' },
  });

  try {
    const brief = DesignBriefSchema.parse(job.designBrief);
    const { products } = ProductsResponseSchema.parse({ products: job.products });
    const generatedImages = z.array(GeneratedImageSchema).parse(job.generatedImages);

    const themePath = await buildTheme({
      jobId,
      designBrief: brief,
      products,
      generatedImages,
      storeName: job.storeName,
      niche: job.niche,
    });

    // Validate all liquid sections
    const sectionsDir = path.join(themePath, 'sections');
    if (await fs.pathExists(sectionsDir)) {
      const sectionFiles = (await fs.readdir(sectionsDir)).filter((f) => f.endsWith('.liquid'));
      const sections = await Promise.all(
        sectionFiles.map(async (f) => ({
          filename: f,
          content: await fs.readFile(path.join(sectionsDir, f), 'utf-8'),
        }))
      );

      // Only validate custom sections (Dawn originals may have different patterns)
      const customSections = sections.filter((s) => s.filename.startsWith('custom-'));
      const validation = validateAllSections(customSections);

      if (!validation.valid) {
        console.warn('Section validation warnings:', validation.errors);
        // Non-fatal — log but continue
      }
    }

    await db.job.update({
      where: { id: jobId },
      data: {
        progress: 92,
        currentStep: 'Theme built — packaging zip...',
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await publishToQStash(`${appUrl}/api/pipeline/zip`, { jobId });

    return NextResponse.json({ ok: true, step: 'customize' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.job.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: `[customize] ${message}` },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
