/**
 * optimize-images.mjs
 * דוחס תמונות בלוג ל-JPG + WebP — הרץ לאחר העלאת תמונה חדשה.
 *
 * Usage: node optimize-images.mjs
 */

import sharp from 'sharp';
import { readdir, stat, rename } from 'fs/promises';
import { join, extname, basename } from 'path';

const IMAGES_DIR = join(process.cwd(), 'images', 'blog');
const MAX_WIDTH  = 1280;
const MAX_HEIGHT = 720;
const JPG_QUALITY  = 85;
const WEBP_QUALITY = 80;

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png']);

async function optimizeImage(filePath) {
  const ext  = extname(filePath).toLowerCase();
  const base = basename(filePath, ext);
  const dir  = filePath.replace(basename(filePath), '');

  const jpgOut  = join(dir, `${base}.jpg`);
  const webpOut = join(dir, `${base}.webp`);

  const before = (await stat(filePath)).size;

  const tmpOut = join(dir, `${base}.tmp.jpg`);
  const pipeline = sharp(filePath)
    .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true });

  await pipeline.clone().jpeg({ quality: JPG_QUALITY, mozjpeg: true }).toFile(tmpOut);
  await pipeline.clone().webp({ quality: WEBP_QUALITY }).toFile(webpOut);
  await rename(tmpOut, jpgOut);

  const after  = (await stat(jpgOut)).size;
  const saved  = Math.round((1 - after / before) * 100);

  console.log(`  ✅ ${base}  ${kb(before)} → JPG ${kb(after)} (${saved}% חיסכון) + WebP`);
}

function kb(bytes) { return `${Math.round(bytes / 1024)}KB`; }

async function main() {
  console.log('\n🖼  אופטימיזציית תמונות בלוג\n' + '─'.repeat(40));

  let files;
  try {
    files = await readdir(IMAGES_DIR);
  } catch {
    console.error(`❌ תיקייה לא נמצאה: images/blog/`);
    process.exit(1);
  }

  const toProcess = files.filter(f => SUPPORTED.has(extname(f).toLowerCase()));

  if (toProcess.length === 0) {
    console.log('ℹ️  אין תמונות לעיבוד.');
    return;
  }

  for (const file of toProcess) {
    process.stdout.write(`  עובד: ${file}... `);
    try {
      await optimizeImage(join(IMAGES_DIR, file));
    } catch (err) {
      console.error(`❌ שגיאה ב-${file}: ${err.message}`);
    }
  }

  console.log('\n✅ סיום אופטימיזציה!\n');
}

main();
