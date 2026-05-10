import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ratelimit, publishToQStash } from '@/lib/upstash';
import { CreateJobSchema } from '@/lib/validators/job';

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';
  const { success, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 3 theme generations per hour.' },
      { status: 429, headers: { 'X-RateLimit-Remaining': String(remaining) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = CreateJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prompt, storeName, niche, colorMood, layoutStyle, animationLevel, referenceImages } =
    parsed.data;

  const job = await db.job.create({
    data: {
      prompt,
      storeName,
      niche,
      colorMood,
      layoutStyle,
      animationLevel,
      referenceImages,
      status: 'PENDING',
      progress: 0,
      currentStep: 'Queued...',
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Trigger pipeline via QStash
  await publishToQStash(`${appUrl}/api/pipeline/analyze`, { jobId: job.id });

  return NextResponse.json({ jobId: job.id, status: 'PENDING' }, { status: 201 });
}
