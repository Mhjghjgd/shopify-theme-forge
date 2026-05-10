import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const job = await db.job.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      currentStep: true,
      progress: true,
      storeName: true,
      niche: true,
      zipUrl: true,
      zipSize: true,
      generatedImages: true,
      error: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(job);
}
