export async function generateImage(
  prompt: string,
  size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
  quality: 'high' | 'medium' | 'low' = 'high'
): Promise<string> {
  if (!process.env.NANOBANANA_API_KEY || !process.env.NANOBANANA_API_URL) {
    throw new Error('NanoBanana Pro API not configured');
  }

  const response = await fetch(process.env.NANOBANANA_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NANOBANANA_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.NANOBANANA_IMAGE_MODEL,
      prompt,
      size,
      quality,
      n: 1,
    }),
  });

  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json ?? data?.image_base64 ?? null;
  if (!b64) throw new Error('No base64 image returned from NanoBanana');
  return b64;
}