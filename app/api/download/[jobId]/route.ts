import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { status: true, zipUrl: true, storeName: true },
  });

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.status !== 'COMPLETED' || !job.zipUrl) {
    return NextResponse.json({ error: 'Theme not ready yet' }, { status: 404 });
  }

  // Redirect to Blob URL for direct download
  return NextResponse.redirect(job.zipUrl, { status: 302 });
}
