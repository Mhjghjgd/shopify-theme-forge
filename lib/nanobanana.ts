/**
 * lib/nanobanana.ts
 * NanoBanana / Gemini API utility
 * - generateWithNanobanana() : text + vision (multimodal)
 * - generateImageWithNanobanana() : image generation
 * - urlToInlinePart() : fetch URL → base64 inline part
 * - extractJson() : safe JSON extraction from AI text
 */

const API_KEY   = () => process.env.NANOBANANA_API_KEY!;
const API_URL   = () => (process.env.NANOBANANA_API_URL ?? 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
const API_MODEL = () => process.env.NANOBANANA_IMAGE_MODEL ?? 'gemini-2.0-flash-preview-image-generation';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NanoBananaPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface NanoBananaMessage {
  role: 'user' | 'model';
  parts: NanoBananaPart[];
}

export interface NanoBananaOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  generateImage?: boolean;
}

export interface NanoBananaResponse {
  text: string;
  imageBase64?: string;
  imageMimeType?: string;
}

// ── Core API call ─────────────────────────────────────────────────────────────

export async function generateWithNanobanana(
  messages: NanoBananaMessage[],
  options: NanoBananaOptions = {}
): Promise<NanoBananaResponse> {
  const {
    model        = API_MODEL(),
    temperature  = 1,
    maxOutputTokens = 8192,
    generateImage = false,
  } = options;

  const key = API_KEY();
  const base = API_URL();

  if (!key)   throw new Error('NANOBANANA_API_KEY is not set');
  if (!base)  throw new Error('NANOBANANA_API_URL is not set');
  if (!model) throw new Error('NANOBANANA_IMAGE_MODEL is not set');

  const url = `${base}/v1beta/models/${model}:generateContent?key=${key}`;

  const body = {
    contents: messages,
    generationConfig: {
      temperature,
      maxOutputTokens,
      responseModalities: generateImage ? ['Text', 'Image'] : ['Text'],
    },
  };

  console.log(`[nanobanana] POST model=${model} generateImage=${generateImage}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NanoBanana API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];

  if (!candidate) {
    // Surface finish reason if available
    const reason = data?.promptFeedback?.blockReason ?? 'unknown';
    throw new Error(`NanoBanana: no candidates returned. blockReason=${reason}`);
  }

  let text = '';
  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;

  for (const part of candidate.content?.parts ?? []) {
    if (part.text) {
      text += part.text;
    } else if (part.inlineData?.data) {
      imageBase64  = part.inlineData.data;
      imageMimeType = part.inlineData.mimeType ?? 'image/png';
    }
  }

  return { text, imageBase64, imageMimeType };
}

// ── Image generation ──────────────────────────────────────────────────────────

export async function generateImageWithNanobanana(
  prompt: string,
  options: Omit<NanoBananaOptions, 'generateImage'> = {}
): Promise<{ base64: string; mimeType: string }> {
  const result = await generateWithNanobanana(
    [{ role: 'user', parts: [{ text: prompt }] }],
    { ...options, generateImage: true }
  );

  if (!result.imageBase64) {
    throw new Error(`NanoBanana returned no image for prompt: "${prompt.slice(0, 80)}"`);
  }

  return { base64: result.imageBase64, mimeType: result.imageMimeType ?? 'image/png' };
}

// ── URL → inline part ─────────────────────────────────────────────────────────

export async function urlToInlinePart(imageUrl: string): Promise<NanoBananaPart> {
  if (imageUrl.startsWith('data:')) {
    const [meta, data] = imageUrl.split(',');
    const mimeType = meta.replace('data:', '').replace(';base64', '');
    return { inlineData: { mimeType, data } };
  }

  const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Failed to fetch image ${imageUrl}: HTTP ${res.status}`);

  const contentType = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0];
  const buffer = await res.arrayBuffer();
  const data = Buffer.from(buffer).toString('base64');

  return { inlineData: { mimeType: contentType, data } };
}

// ── Safe JSON extractor ───────────────────────────────────────────────────────

export function extractJson<T = unknown>(raw: string): T {
  // Strip markdown fences
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Find first { or [
  const start = cleaned.search(/[{[]/);
  if (start === -1) {
    throw new Error(`No JSON found in response. Preview: ${cleaned.slice(0, 200)}`);
  }

  try {
    return JSON.parse(cleaned.slice(start)) as T;
  } catch (e) {
    throw new Error(
      `JSON.parse failed: ${(e as Error).message}. Preview: ${cleaned.slice(start, start + 300)}`
    );
  }
}
