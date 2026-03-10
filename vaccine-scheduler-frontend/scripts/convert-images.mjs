import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { existsSync } from 'fs';

const LANDING_DIR = join('public', 'Images', 'landing_page');
const HERO_B2B_DIR = join(LANDING_DIR, 'hero-b2b');
const SIZES = [480, 768, 1024];
const HERO_SIZES = [480, 768, 1024, 1440, 2560];

// Download the Unsplash hero image at full resolution
async function downloadHeroImage() {
  const url = 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=2560&q=80&fm=jpg';
  console.log('Downloading Unsplash hero image...');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  await mkdir(HERO_B2B_DIR, { recursive: true });

  // Generate WebP at each size
  for (const width of HERO_SIZES) {
    const outPath = join(HERO_B2B_DIR, `hero-b2b-${width}w.webp`);
    await sharp(buffer)
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality: width <= 480 ? 70 : width <= 768 ? 75 : 80 })
      .toFile(outPath);
    console.log(`  Created ${outPath}`);
  }

  // JPEG fallback at 1440w
  const jpgPath = join(HERO_B2B_DIR, 'hero-b2b-1440w.jpg');
  await sharp(buffer)
    .resize(1440, null, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(jpgPath);
  console.log(`  Created ${jpgPath}`);
}

// Convert existing landing page PNGs to WebP at multiple sizes
async function convertLandingImages() {
  const files = await readdir(LANDING_DIR);
  const pngFiles = files.filter(f =>
    f.startsWith('Puppy vaccine shot') && extname(f).toLowerCase() === '.png'
  );

  for (const file of pngFiles) {
    const srcPath = join(LANDING_DIR, file);
    const meta = await sharp(srcPath).metadata();
    const nameBase = basename(file, extname(file))
      .replace(/\s+/g, '-')
      .toLowerCase();

    console.log(`Converting ${file} (${meta.width}x${meta.height})...`);

    for (const width of SIZES) {
      if (width > meta.width) {
        console.log(`  Skipping ${width}w (source is only ${meta.width}px)`);
        continue;
      }
      const outPath = join(LANDING_DIR, `${nameBase}-${width}w.webp`);
      await sharp(srcPath)
        .resize(width, null, { withoutEnlargement: true })
        .webp({ quality: width <= 480 ? 70 : width <= 768 ? 75 : 80 })
        .toFile(outPath);
      console.log(`  Created ${outPath}`);
    }
  }
}

async function main() {
  console.log('=== Image Conversion Script ===\n');

  console.log('Phase 1: B2B Hero Image');
  await downloadHeroImage();

  console.log('\nPhase 2: B2C Landing Page Images');
  await convertLandingImages();

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
