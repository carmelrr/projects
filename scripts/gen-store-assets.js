const sharp = require('sharp');
const path = require('path');

const base = path.resolve(__dirname, '..');
const out = path.join(base, 'assets', 'store-listing');
const logo = path.join(base, 'apps', 'web', 'public', 'images', 'op-logo-transparent-512.png');

async function main() {
  // 1. App icon 512x512 — white logo on dark navy
  const logoWhite = await sharp(logo)
    .resize(360, 360)
    .negate({ alpha: false })
    .png()
    .toBuffer();

  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } },
  })
    .composite([{ input: logoWhite, gravity: 'center' }])
    .png()
    .toFile(path.join(out, 'app-icon-512.png'));

  console.log('✓ app-icon-512.png');

  // 2. Feature graphic 1024x500
  const featureLogo = await sharp(logo)
    .resize(280, 280)
    .negate({ alpha: false })
    .png()
    .toBuffer();

  const textSvg = Buffer.from(`<svg width="1024" height="500">
    <text x="570" y="220" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="48" fill="white">Owl Performance</text>
    <text x="570" y="275" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="rgba(255,255,255,0.7)">Coaching that scales with you</text>
  </svg>`);

  await sharp({
    create: { width: 1024, height: 500, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } },
  })
    .composite([
      { input: featureLogo, left: 140, top: 110 },
      { input: textSvg, top: 0, left: 0 },
    ])
    .png()
    .toFile(path.join(out, 'feature-graphic-1024x500.png'));

  console.log('✓ feature-graphic-1024x500.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
