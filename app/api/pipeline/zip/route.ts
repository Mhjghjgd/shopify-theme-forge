import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyQStashSignature } from '@/lib/upstash';
import { buildThemeZip, cleanupJobTmp } from '@/lib/shopify/zipper';
import path from 'path';

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
    data: { progress: 93, currentStep: 'Creating .zip archive...' },
  });

  try {
    const themePath = path.join(process.cwd(), 'tmp', 'jobs', jobId, 'theme');
    const { url, size, compressed } = await buildThemeZip(themePath, jobId, job.storeName);

    await db.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        currentStep: 'Theme ready for download!',
        zipUrl: url,
        zipSize: size,
      },
    });

    // Cleanup tmp files
    await cleanupJobTmp(jobId);

    return NextResponse.json({
      ok: true,
      step: 'zip',
      zipUrl: url,
      zipSize: size,
      sizeMb: (size / 1024 / 1024).toFixed(2),
      compressed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.job.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: `[zip] ${message}` },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
