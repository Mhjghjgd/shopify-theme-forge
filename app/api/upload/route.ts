import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, or WEBP.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
  }

  const ext = file.type.split('/')[1];
  const filename = `refs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(filename, file, {
    access: 'public',
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
