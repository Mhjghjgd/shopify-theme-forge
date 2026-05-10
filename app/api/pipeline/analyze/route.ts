/**
 * app/api/pipeline/analyze/route.ts
 * Step 1 — Analyze images + prompt → DesignBrief JSON
 * Prisma + NanoBanana/Gemini + QStash (via lib/upstash.ts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyQStashSignature, publishToQStash, acquireJobLock } from '@/lib/upstash';
import {
  generateWithNanobanana,
  urlToInlinePart,
  extractJson,
  type NanoBananaPart,
  type NanoBananaMessage,
} from '@/lib/nanobanana';

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

  // 2. Load job
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  // 3. Acquire Redis lock — prevents duplicate runs
  const locked = await acquireJobLock(jobId, 600);
  if (!locked) {
    console.warn(`[analyze] Job ${jobId} already locked — skipping`);
    return NextResponse.json({ skipped: true });
  }

  await db.job.update({
    where: { id: jobId },
    data: { status: 'RUNNING', currentStep: 'Analyzing references...', progress: 5, error: null },
  });

  try {
    const userPrompt = job.prompt ?? '';
    const referenceImageUrls: string[] = job.referenceImages ?? [];
    console.log(`[analyze] job=${jobId} images=${referenceImageUrls.length}`);

    // 4. Build multimodal Gemini message
    const userParts: NanoBananaPart[] = [];
    userParts.push({ text: buildPrompt(userPrompt, job.storeName, job.niche, job.colorMood, job.layoutStyle) });

    if (referenceImageUrls.length > 0) {
      console.log(`[analyze] Fetching ${referenceImageUrls.length} reference image(s)...`);
      const results = await Promise.allSettled(
        referenceImageUrls.map((url) => urlToInlinePart(url))
      );
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === 'fulfilled') {
          userParts.push(r.value);
          console.log(`[analyze] Image ${i + 1} loaded OK`);
        } else {
          console.warn(`[analyze] Image ${i + 1} failed: ${r.reason}`);
        }
      }
    }

    const messages: NanoBananaMessage[] = [{ role: 'user', parts: userParts }];

    // 5. Call NanoBanana/Gemini
    await db.job.update({
      where: { id: jobId },
      data: { progress: 15, currentStep: 'Analyzing reference images...' },
    });

    console.log(`[analyze] Calling NanoBanana...`);
    const aiResponse = await generateWithNanobanana(messages, {
      temperature: 0.7,
      maxOutputTokens: 4096,
      generateImage: false,
    });
    console.log(`[analyze] Response length=${aiResponse.text.length}`);

    // 6. Parse JSON
    let designBrief: Record<string, unknown>;
    try {
      designBrief = extractJson<Record<string, unknown>>(aiResponse.text);
    } catch (e) {
      console.error(`[analyze] JSON parse failed:`, e);
      console.error(`[analyze] Raw text snippet:`, aiResponse.text.slice(0, 500));
      throw new Error(`Failed to parse design brief: ${(e as Error).message}`);
    }

    // Inject imageSpecs if Gemini didn't produce any
    if (!Array.isArray(designBrief.imageSpecs) || (designBrief.imageSpecs as unknown[]).length === 0) {
      console.warn(`[analyze] No imageSpecs in response — injecting defaults`);
      designBrief.imageSpecs = buildDefaultImageSpecs(job.niche, job.colorMood);
    }

    // Ensure brandVoice + imagePromptBase exist (used by products step)
    if (!designBrief.brandVoice) {
      const brand = designBrief.brand as Record<string, string> | undefined;
      designBrief.brandVoice = brand?.voice ?? 'friendly and professional';
    }
    if (!designBrief.imagePromptBase) {
      const style = designBrief.style as Record<string, string> | undefined;
      const palette = designBrief.palette as Record<string, string> | undefined;
      designBrief.imagePromptBase =
        `${style?.aesthetic ?? 'modern'} style, ${palette?.primary ?? '#000'} color palette, professional photography, ${job.niche}`;
    }
    // Ensure style.layoutType exists (used by products step)
    if (designBrief.style && typeof designBrief.style === 'object') {
      const style = designBrief.style as Record<string, unknown>;
      if (!style.layoutType) style.layoutType = job.layoutStyle ?? style.aesthetic ?? 'modern';
    }

    // 7. Save to DB
    await db.job.update({
      where: { id: jobId },
      data: {
        designBrief: designBrief as unknown as import('@prisma/client').Prisma.InputJsonValue,
        progress: 25,
        currentStep: 'Generating product catalog...',
      },
    });
    console.log(`[analyze] DesignBrief saved. Triggering products step...`);

    // 8. Trigger products step via QStash
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await publishToQStash(`${appUrl}/api/pipeline/products`, { jobId });
    console.log(`[analyze] Products step queued via QStash ✓`);

    return NextResponse.json({
      ok: true,
      step: 'analyze',
      imageSpecCount: (designBrief.imageSpecs as unknown[]).length,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[analyze] FATAL job=${jobId}:`, err);
    console.error(`[analyze] Stack:`, (err as Error)?.stack);
    await db.job.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: `Analyzing reference images: ${message}`,
        currentStep: 'analyze:error',
      },
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Gemini prompt ─────────────────────────────────────────────────────────────

function buildPrompt(
  prompt: string,
  storeName: string,
  niche: string,
  colorMood?: string | null,
  layoutStyle?: string | null
): string {
  return `You are an expert Shopify theme designer and brand strategist.
Analyze the reference images and description to create a complete design brief.

STORE: ${storeName}
NICHE: ${niche}
${colorMood ? `COLOR MOOD: ${colorMood}` : ''}
${layoutStyle ? `LAYOUT STYLE: ${layoutStyle}` : ''}
DESCRIPTION: ${prompt}

Respond ONLY with raw JSON — no markdown, no code fences, no explanation:
{
  "palette": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "surface": "#hex",
    "text": "#hex",
    "textLight": "#hex"
  },
  "typography": {
    "headingFont": "Font Name",
    "bodyFont": "Font Name",
    "headingWeight": "700",
    "bodyWeight": "400",
    "headingStyle": "sans-serif",
    "scale": "normal"
  },
  "style": {
    "aesthetic": "modern",
    "layoutType": "${layoutStyle ?? 'modern'}",
    "mood": "...",
    "visualComplexity": "medium",
    "cornerRadius": "small",
    "shadowStyle": "subtle",
    "animationLevel": "${colorMood ?? 'subtle'}"
  },
  "brand": {
    "name": "${storeName}",
    "tagline": "...",
    "voice": "friendly",
    "productCategory": "${niche}",
    "targetAudience": "..."
  },
  "brandVoice": "concise description of brand tone and communication style",
  "imagePromptBase": "base prompt describing the visual style for all images: lighting, mood, setting, aesthetic",
  "sections": [
    { "type": "hero", "layout": "fullwidth", "hasMedia": true, "priority": 1 },
    { "type": "featured_product", "layout": "split", "hasMedia": true, "priority": 2 },
    { "type": "collection", "layout": "grid", "hasMedia": true, "priority": 3 },
    { "type": "testimonials", "layout": "centered", "hasMedia": false, "priority": 4 },
    { "type": "newsletter", "layout": "centered", "hasMedia": false, "priority": 5 },
    { "type": "footer", "layout": "fullwidth", "hasMedia": false, "priority": 6 }
  ],
  "imageSpecs": [
    { "id": "hero_main", "type": "hero", "prompt": "...", "aspectRatio": "16:9", "width": 1920, "height": 1080, "quality": "high", "style": "photographic" },
    { "id": "banner_promo", "type": "banner", "prompt": "...", "aspectRatio": "16:9", "width": 1920, "height": 600, "quality": "high", "style": "photographic" },
    { "id": "product_main_1", "type": "product_main", "prompt": "...", "aspectRatio": "1:1", "width": 1200, "height": 1200, "quality": "high", "style": "photographic" },
    { "id": "product_lifestyle_1", "type": "product_lifestyle", "prompt": "...", "aspectRatio": "4:3", "width": 1200, "height": 900, "quality": "high", "style": "photographic" },
    { "id": "about_brand", "type": "about", "prompt": "...", "aspectRatio": "4:3", "width": 1200, "height": 900, "quality": "medium", "style": "photographic" }
  ],
  "contentTone": {
    "headlines": "...",
    "descriptions": "...",
    "cta": "...",
    "sampleHeadline": "...",
    "sampleTagline": "..."
  }
}`;
}

// ── Default imageSpecs fallback ───────────────────────────────────────────────

function buildDefaultImageSpecs(niche: string, colorMood?: string | null) {
  const mood = colorMood ?? 'professional';
  return [
    { id: 'hero_main', type: 'hero', prompt: `${mood} hero image for ${niche} brand, cinematic lighting, 8K`, aspectRatio: '16:9', width: 1920, height: 1080, quality: 'high', style: 'photographic' },
    { id: 'banner_promo', type: 'banner', prompt: `${mood} promotional banner for ${niche}, wide format`, aspectRatio: '16:9', width: 1920, height: 600, quality: 'high', style: 'photographic' },
    { id: 'product_main_1', type: 'product_main', prompt: `Studio product photography for ${niche}, white background, sharp`, aspectRatio: '1:1', width: 1200, height: 1200, quality: 'high', style: 'photographic' },
    { id: 'product_lifestyle_1', type: 'product_lifestyle', prompt: `${niche} lifestyle photo, ${mood} mood, natural light`, aspectRatio: '4:3', width: 1200, height: 900, quality: 'high', style: 'photographic' },
    { id: 'about_brand', type: 'about', prompt: `Brand story image for ${niche}, warm and authentic`, aspectRatio: '4:3', width: 1200, height: 900, quality: 'medium', style: 'photographic' },
  ];
}
