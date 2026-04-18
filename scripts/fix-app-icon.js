#!/usr/bin/env node
/**
 * Generate app icon with brand-violet background + white OP logo.
 * Inverts the black-on-white logo → white-on-violet.
 *
 * Output: apps/mobile/assets/images/icon.png (1024×1024)
 *         apps/mobile/assets/images/adaptive-icon.png (1024×1024)
 */

const sharp = require('sharp');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'apps', 'mobile', 'assets', 'images', 'icon.png');
const OUT_ICON = SRC;
const OUT_ADAPTIVE = path.resolve(__dirname, '..', 'apps', 'mobile', 'assets', 'images', 'adaptive-icon.png');

// Brand violet
const BG_R = 91, BG_G = 33, BG_B = 182; // #5b21b6 (violet-800)

async function main() {
  const img = sharp(SRC);
  const { width, height } = await img.metadata();
  console.log(`Source: ${width}×${height}`);

  // Extract raw pixels
  const raw = await img.raw().toBuffer();
  const channels = 3; // RGB
  const newBuf = Buffer.alloc(raw.length);

  for (let i = 0; i < raw.length; i += channels) {
    const r = raw[i], g = raw[i + 1], b = raw[i + 2];

    // Calculate luminance (how dark the pixel is)
    const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

    // Dark pixels (logo) → white, Light pixels (bg) → brand violet
    // Use smooth blending for anti-aliased edges
    const t = Math.min(1, Math.max(0, (lum - 0.3) / 0.5)); // 0=dark(logo), 1=light(bg)

    newBuf[i]     = Math.round(255 * (1 - t) + BG_R * t);
    newBuf[i + 1] = Math.round(255 * (1 - t) + BG_G * t);
    newBuf[i + 2] = Math.round(255 * (1 - t) + BG_B * t);
  }

  await sharp(newBuf, { raw: { width, height, channels } })
    .png()
    .toFile(OUT_ICON + '.new.png');

  // Replace original
  const fs = require('fs');
  fs.copyFileSync(OUT_ICON, OUT_ICON + '.bak');
  fs.renameSync(OUT_ICON + '.new.png', OUT_ICON);

  // Also create adaptive icon (same image for android)
  fs.copyFileSync(OUT_ADAPTIVE, OUT_ADAPTIVE + '.bak');
  fs.copyFileSync(OUT_ICON, OUT_ADAPTIVE);

  console.log('✅ Icon updated: white logo on violet background');
  console.log(`   ${OUT_ICON}`);
  console.log(`   ${OUT_ADAPTIVE}`);
}

main().catch(err => { console.error(err); process.exit(1); });
