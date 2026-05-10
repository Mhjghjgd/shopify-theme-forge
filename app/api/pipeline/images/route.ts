/**
 * app/api/pipeline/images/route.ts
 * Step 3 — Generate images via NanoBanana + upload to Vercel Blob
 * Prisma + NanoBanana/Gemini + Vercel Blob + QStash
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { verifyQStashSignature, publishToQStash } from '@/lib/upstash';
import { generateImageWithNanobanana } from '@/lib/nanobanana';

interface ImageSpec {
  id: string;
  type: string;
  prompt: string;
  aspectRatio: string;
  width: number;
  height: number;
  quality: 'high' | 'medium';
  style: string;
}

interface GeneratedImage {
  id: string;
  type: string;
  url: string;
  width: number;
  height: number;
}

export async function POST(req: NextRequest) {
  // 1. Verify QStash signature in production
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
    data: { progress: 40, currentStep: 'Creating product images...' },
  });

  try {
    const designBrief = job.designBrief as Record<string, unknown> | null;
    const rawSpecs = designBrief?.imageSpecs;

    if (!Array.isArray(rawSpecs) || rawSpecs.length === 0) {
      throw new Error('No imageSpecs found in designBrief. Run analyze step first.');
    }

    const imageSpecs = rawSpecs as ImageSpec[];
    const total = imageSpecs.length;
    console.log(`[images] ${total} images to generate for job=${jobId}`);

    // Priority order for generation
    const priorityOrder = ['hero', 'banner', 'about', 'product_main', 'product_lifestyle', 'product_detail'];
    const sorted = [...imageSpecs].sort((a, b) => {
      const ai = priorityOrder.indexOf(a.type);
      const bi = priorityOrder.indexOf(b.type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const generated: GeneratedImage[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (let i = 0; i < sorted.length; i++) {
      const spec = sorted[i];
      const progress = Math.round(40 + ((i + 1) / total) * 28); // 40% → 68%

      try {
        console.log(`[images] Generating ${spec.id} (${i + 1}/${total})...`);
        const enrichedPrompt = enrichPrompt(spec);

        // Retry logic
        let base64: string | null = null;
        let mimeType = 'image/png';
        for (let attempt = 0; attempt <= 2; attempt++) {
          try {
            const result = await generateImageWithNanobanana(enrichedPrompt);
            base64 = result.base64;
            mimeType = result.mimeType;
            break;
          } catch (e) {
            console.warn(`[images] ${spec.id} attempt ${attempt + 1} failed: ${(e as Error).message}`);
            if (attempt < 2) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
            else throw e;
          }
        }

        if (!base64) throw new Error('No image data returned');

        // Upload to Vercel Blob
        const ext = mimeType.includes('png') ? 'png' : 'jpg';
        const pathname = `jobs/${jobId}/images/${spec.id}.${ext}`;
        const buffer = Buffer.from(base64, 'base64');
        const blob = await put(pathname, buffer, {
          access: 'public',
          contentType: mimeType,
          addRandomSuffix: false,
        });

        console.log(`[images] ${spec.id} uploaded → ${blob.url}`);
        generated.push({ id: spec.id, type: spec.type, url: blob.url, width: spec.width, height: spec.height });

        await db.job.update({
          where: { id: jobId },
          data: { progress, currentStep: `Creating product images... (${i + 1}/${total})` },
        });

      } catch (imgErr) {
        const msg = imgErr instanceof Error ? imgErr.message : String(imgErr);
        console.error(`[images] ${spec.id} failed permanently: ${msg}`);
        failed.push({ id: spec.id, error: msg });

        // Hero is critical — abort if it fails
        if (spec.type === 'hero' && generated.length === 0) {
          throw new Error(`Hero image generation failed: ${msg}`);
        }
      }
    }

    if (generated.length === 0) {
      throw new Error('All image generations failed — no images produced');
    }

    // Build URL map for easy lookup by downstream steps
    const imageMap: Record<string, string> = {};
    for (const img of generated) imageMap[img.id] = img.url;

    await db.job.update({
      where: { id: jobId },
      data: {
        generatedImages: { images: generated, imageMap, failed } as unknown as import('@prisma/client').Prisma.InputJsonValue,
        progress: 70,
        currentStep: 'Building theme files...',
      },
    });

    console.log(`[images] ${generated.length}/${total} images done. Triggering customize step...`);

    // Trigger next step
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await publishToQStash(`${appUrl}/api/pipeline/customize`, { jobId });

    return NextResponse.json({
      ok: true,
      step: 'images',
      generated: generated.length,
      failed: failed.length,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[images] FATAL job=${jobId}:`, err);
    console.error(`[images] Stack:`, (err as Error)?.stack);
    await db.job.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: `Creating product images: ${message}` },
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Prompt enrichment ─────────────────────────────────────────────────────────

function enrichPrompt(spec: ImageSpec): string {
  const qualityTag = spec.quality === 'high'
    ? 'ultra high quality, 8K resolution, professional photography, sharp focus, perfect lighting'
    : 'high quality, professional, clean';

  const styleMap: Record<string, string> = {
    photographic: 'photorealistic, DSLR photography, natural lighting',
    illustration: 'digital illustration, professional graphic design',
    abstract: 'abstract art, creative composition',
  };

  return `${spec.prompt}. ${qualityTag}. ${styleMap[spec.style] ?? 'professional'}. ${spec.width}x${spec.height}px. No text, no watermarks, no UI elements.`;
}
