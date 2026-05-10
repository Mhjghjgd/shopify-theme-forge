import { put, del, list } from '@vercel/blob';

export async function uploadImageToBlob(
  imageUrl: string,
  filename: string
): Promise<{ url: string; size: number }> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'image/jpeg';

  const blob = await put(filename, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  });

  return { url: blob.url, size: buffer.byteLength };
}

export async function uploadFileToBlob(
  content: Buffer | ArrayBuffer,
  filename: string,
  contentType: string
): Promise<{ url: string; size: number }> {
  const blob = await put(filename, content, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  });

  const size = content instanceof Buffer ? content.byteLength : content.byteLength;
  return { url: blob.url, size };
}

export async function uploadUserImageToBlob(
  file: File,
  jobId: string,
  index: number
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `jobs/${jobId}/refs/ref-${index}.${ext}`;

  const blob = await put(filename, file, {
    access: 'public',
    contentType: file.type,
    addRandomSuffix: false,
  });

  return blob.url;
}

export { del as deleteBlob, list as listBlobs };
