import sharp from 'sharp';
import fs from 'node:fs';

async function composeTransparentPluto() {
  const plutoPath = 'C:/Users/AdminZ/.gemini/antigravity/brain/fe0bff73-b5a7-48f7-bc79-fddb179fafe8/scratch/pluto_test.png';
  
  // Create a vibrant, sunny cartoon background with hills and blue sky (1280x720)
  const bgSvg = `<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#38BDF8"/>
        <stop offset="60%" stop-color="#7DD3FC"/>
        <stop offset="100%" stop-color="#E0F2FE"/>
      </linearGradient>
      <linearGradient id="hillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#84CC16"/>
        <stop offset="100%" stop-color="#4D7C0F"/>
      </linearGradient>
      <radialGradient id="sun" cx="80%" cy="20%" r="30%">
        <stop offset="0%" stop-color="#FEF08A"/>
        <stop offset="100%" stop-color="#FDE047" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <!-- Sky & Sun -->
    <rect width="1280" height="720" fill="url(#skyGrad)"/>
    <circle cx="1024" cy="144" r="180" fill="url(#sun)"/>
    <circle cx="1024" cy="144" r="48" fill="#FACC15"/>
    <!-- Gentle cartoon hills -->
    <path d="M-100 560 Q 250 440, 640 500 T 1380 460 L 1380 720 L -100 720 Z" fill="#65A30D" opacity="0.85"/>
    <path d="M-100 600 Q 400 520, 800 570 T 1380 540 L 1380 720 L -100 720 Z" fill="url(#hillGrad)"/>
  </svg>`;

  // Pluto is transparent HD PNG. Let's resize and position him joyfully in the scene!
  const plutoResized = await sharp(plutoPath)
    .resize({
      width: 950,
      height: 580,
      fit: 'inside',
    })
    .png()
    .toBuffer();

  const meta = await sharp(plutoResized).metadata();
  const left = Math.round((1280 - (meta.width || 0)) / 2);
  const top = 720 - (meta.height || 0) - 30; // grounded nicely on the green hill

  const finalCanvas = await sharp(Buffer.from(bgSvg))
    .composite([{ input: plutoResized, left, top }])
    .png()
    .toBuffer();

  const outPath = 'C:/Users/AdminZ/.gemini/antigravity/brain/fe0bff73-b5a7-48f7-bc79-fddb179fafe8/scratch/pluto_hero_kid_friendly.png';
  fs.writeFileSync(outPath, finalCanvas);
  console.log('Created pluto_hero_kid_friendly.png');
}

composeTransparentPluto().catch(console.error);
