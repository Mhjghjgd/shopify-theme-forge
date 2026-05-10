import path from 'path';
import fs from 'fs-extra';
import archiver from 'archiver';
import sharp from 'sharp';
import { uploadFileToBlob } from '../blob';

const MAX_ZIP_SIZE = 52428800; // 50MB
const WARN_SIZE = 47185920; // 45MB — start compressing

export interface ZipResult {
  url: string;
  size: number;
  compressed: boolean;
}

export async function buildThemeZip(
  themePath: string,
  jobId: string,
  storeName: string
): Promise<ZipResult> {
  // First pass — check raw size
  const rawSize = await getDirSize(themePath);
  let compressed = false;

  if (rawSize > WARN_SIZE) {
    // Compress images to WebP
    await compressImagesInDir(path.join(themePath, 'assets'));
    compressed = true;
  }

  const date = new Date().toISOString().split('T')[0];
  const zipName = `theme-${storeName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${date}.zip`;
  const zipPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'tmp', 'zips', jobId, zipName);
  await fs.ensureDir(path.dirname(zipPath));

  await createZip(themePath, zipPath);

  const zipBuffer = await fs.readFile(zipPath);
  const finalSize = zipBuffer.length;

  if (finalSize > MAX_ZIP_SIZE) {
    throw new Error(
      `ZIP size ${(finalSize / 1024 / 1024).toFixed(1)}MB exceeds 50MB Shopify limit. Contact support.`
    );
  }

  const { url } = await uploadFileToBlob(
    zipBuffer,
    `jobs/${jobId}/${zipName}`,
    'application/zip'
  );

  // Cleanup tmp
  await fs.remove(path.dirname(zipPath)).catch(() => {});

  return { url, size: finalSize, compressed };
}

async function createZip(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function getDirSize(dir: string): Promise<number> {
  let total = 0;
  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      total += await getDirSize(full);
    } else {
      const stat = await fs.stat(full);
      total += stat.size;
    }
  }

  return total;
}

async function compressImagesInDir(assetsDir: string): Promise<void> {
  if (!(await fs.pathExists(assetsDir))) return;

  const files = await fs.readdir(assetsDir);
  const imageFiles = files.filter((f) => /\.(jpg|jpeg|png)$/i.test(f));

  for (const file of imageFiles) {
    const filePath = path.join(assetsDir, file);
    const stat = await fs.stat(filePath);

    // Only compress files > 500KB
    if (stat.size < 512000) continue;

    const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');

    try {
      await sharp(filePath).webp({ quality: 80 }).toFile(webpPath);
      // If WebP is smaller, replace
      const webpStat = await fs.stat(webpPath);
      if (webpStat.size < stat.size) {
        await fs.remove(filePath);
      } else {
        await fs.remove(webpPath);
      }
    } catch {
      // Skip if sharp can't process
    }
  }
}

export async function cleanupJobTmp(jobId: string): Promise<void> {
  const jobTmpDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'tmp', 'jobs', jobId);
  await fs.remove(jobTmpDir).catch(() => {});
}
