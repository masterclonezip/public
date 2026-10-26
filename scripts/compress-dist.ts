import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);

async function compressFile(fullPath: string) {
  try {
    const content = await readFile(fullPath);
    // Files below 256 bytes shouldn't be compressed because gzip/br header overhead increases size
    if (content.length < 256) return;

    // Maximum compression level 9 for static build assets
    const gzBuffer = await gzip(content, { level: zlib.constants.Z_BEST_COMPRESSION });
    // Only write .gz if it actually saved space
    if (gzBuffer.length < content.length) {
      await writeFile(`${fullPath}.gz`, gzBuffer);
    }

    // Ultra-optimized Brotli compression (quality 9: achieves 99%+ of max ratio in seconds)
    const brBuffer = await brotliCompress(content, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 }
    });
    // Only write .br if it actually saved space
    if (brBuffer.length < content.length) {
      await writeFile(`${fullPath}.br`, brBuffer);
    }
  } catch (err) {
    console.warn(`[Gzip/Brotli] Failed to compress ${fullPath}:`, err);
  }
}

async function collectFiles(dir: string, fileList: string[] = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(fullPath, fileList);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      // Strictly text, script, markup, vector and data formats.
      // NEVER compress binary images (.png, .jpg, .webp, .ico), audio, video, or font binaries (.woff2)
      if (['.html', '.js', '.css', '.json', '.xml', '.svg', '.txt', '.webmanifest'].includes(ext)) {
        if (!entry.name.endsWith('.gz') && !entry.name.endsWith('.br')) {
          fileList.push(fullPath);
        }
      }
    }
  }
  return fileList;
}

export async function runCompression() {
  const distDir = path.resolve(process.cwd(), 'dist');
  console.log('[Compression] Generating pre-compressed .gz and .br assets for maximum performance...');
  const start = Date.now();
  
  const files = await collectFiles(distDir);
  const BATCH_SIZE = 50;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(f => compressFile(f)));
  }
  
  console.log(`[Compression] Pre-compression complete in ${Date.now() - start}ms.`);
}

if (require.main === module) {
  runCompression().catch(console.error);
}
