import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const scratchTestDir = 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/composed_test';
fs.mkdirSync(scratchTestDir, { recursive: true });

function getSunnyBackgroundSvg(options = {}) {
  const sunX = options.sunX || 1060;
  const sunY = options.sunY || 130;
  return `<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#38BDF8"/>
        <stop offset="55%" stop-color="#7DD3FC"/>
        <stop offset="100%" stop-color="#E0F2FE"/>
      </linearGradient>
      <linearGradient id="hillBackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#65A30D"/>
        <stop offset="100%" stop-color="#3F6212"/>
      </linearGradient>
      <linearGradient id="hillForeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#84CC16"/>
        <stop offset="100%" stop-color="#4D7C0F"/>
      </linearGradient>
      <radialGradient id="sunGlow" cx="${sunX}" cy="${sunY}" r="220" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FEF08A" stop-opacity="0.9"/>
        <stop offset="40%" stop-color="#FDE047" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#FACC15" stop-opacity="0"/>
      </radialGradient>
      <!-- Soft cartoon clouds -->
      <filter id="cloudShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
        <feOffset dx="0" dy="3" result="offsetblur"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.12"/>
        </feComponentTransfer>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <!-- Sky -->
    <rect width="1280" height="720" fill="url(#skyGrad)"/>
    <!-- Sun glow and disk -->
    <circle cx="${sunX}" cy="${sunY}" r="180" fill="url(#sunGlow)"/>
    <circle cx="${sunX}" cy="${sunY}" r="46" fill="#FDE047"/>

    <!-- Fluffy cartoon clouds -->
    <g filter="url(#cloudShadow)" fill="#FFFFFF" opacity="0.88">
      <ellipse cx="220" cy="140" rx="70" ry="32"/>
      <circle cx="190" cy="130" r="38"/>
      <circle cx="245" cy="125" r="44"/>
      
      <ellipse cx="580" cy="180" rx="90" ry="36"/>
      <circle cx="540" cy="170" r="42"/>
      <circle cx="610" cy="165" r="48"/>
    </g>

    <!-- Gentle distant hills -->
    <path d="M-50 540 Q 280 430, 680 480 T 1330 450 L 1330 720 L -50 720 Z" fill="url(#hillBackGrad)" opacity="0.88"/>
    <!-- Gentle foreground green hill -->
    <path d="M-80 585 Q 380 505, 820 550 T 1360 520 L 1360 720 L -80 720 Z" fill="url(#hillForeGrad)"/>
  </svg>`;
}

async function composeCharacter(charKey, srcPath, maxHeight, yOffset = 25, xOffset = 0) {
  const bgSvg = getSunnyBackgroundSvg();
  const meta = await sharp(srcPath).metadata();
  
  // Resize character nicely
  const resized = await sharp(srcPath)
    .resize({
      width: Math.min(850, Math.round(maxHeight * (meta.width / meta.height))),
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: false
    })
    .png()
    .toBuffer();

  const rMeta = await sharp(resized).metadata();
  const left = Math.round((1280 - rMeta.width) / 2) + xOffset;
  const top = 720 - rMeta.height - yOffset; // Grounded on the hill

  const finalImg = await sharp(Buffer.from(bgSvg))
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();

  const outPath = path.join(scratchTestDir, `${charKey}_test.png`);
  fs.writeFileSync(outPath, finalImg);
  console.log(`Created ${charKey}_test.png at ${outPath}`);
  return outPath;
}

async function run() {
  // Mickey
  await composeCharacter('mickey_2d', 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/top_hd/mickey_84.png', 540, 30);
  await composeCharacter('mickey_3d', 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/candidates/mickey/cand_5_639x904.png', 540, 30);

  // Minnie
  await composeCharacter('minnie', 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/candidates/minnie/cand_1_845x1566.png', 560, 25);

  // Donald
  await composeCharacter('donald_3d', 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/top_hd/donald_68.png', 540, 30);
  await composeCharacter('donald_2d', 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/candidates/daisy/cand_3_542x768.png', 530, 30);

  // Daisy
  await composeCharacter('daisy', 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/candidates/daisy/cand_4_410x733.png', 540, 25);

  // Goofy
  await composeCharacter('goofy', 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/candidates/goofy/cand_6_928x1186.png', 580, 20);

  // Scrooge
  await composeCharacter('scrooge', 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/candidates/scrooge/cand_1_820x820.png', 520, 35);

  console.log('All test compositions finished!');
}

run().catch(console.error);
