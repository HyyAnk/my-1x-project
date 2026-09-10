import sharp from 'sharp';
import fs from 'node:fs';

async function testLooneyTunesStage() {
  // Classic Looney Tunes concentric bullseye stage (1280x720)
  const bgSvg = `<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="ringGrad" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#FEF08A"/>
        <stop offset="22%" stop-color="#F59E0B"/>
        <stop offset="45%" stop-color="#EA580C"/>
        <stop offset="70%" stop-color="#DC2626"/>
        <stop offset="90%" stop-color="#991B1B"/>
        <stop offset="100%" stop-color="#7F1D1D"/>
      </radialGradient>
      <radialGradient id="spotlight" cx="50%" cy="45%" r="45%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <!-- Deep Warner Bros blue-red border -->
    <rect width="1280" height="720" fill="#7F1D1D"/>
    <!-- Concentric classic circles -->
    <circle cx="640" cy="360" r="460" fill="url(#ringGrad)"/>
    <circle cx="640" cy="360" r="380" fill="none" stroke="#FDE047" stroke-width="4" opacity="0.3"/>
    <circle cx="640" cy="360" r="280" fill="none" stroke="#FEF08A" stroke-width="3" opacity="0.35"/>
    <circle cx="640" cy="360" r="180" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.4"/>
    <!-- Glow -->
    <circle cx="640" cy="360" r="300" fill="url(#spotlight)"/>
  </svg>`;

  // Sourced high-res transparent Bugs Bunny (from Wikimedia SVG rendered at high res)
  const bugsSvgUrl = 'https://upload.wikimedia.org/wikipedia/en/1/17/Bugs_Bunny.svg';
  const res = await fetch(bugsSvgUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  const bugsSvgBuf = Buffer.from(await res.arrayBuffer());

  // Rasterize Bugs at high resolution
  const bugsResized = await sharp(bugsSvgBuf, { density: 300 })
    .resize({ height: 600, fit: 'inside' })
    .png()
    .toBuffer();

  const meta = await sharp(bugsResized).metadata();
  const left = Math.round((1280 - (meta.width || 0)) / 2);
  const top = Math.round((720 - (meta.height || 0)) / 2) + 20;

  const finalCanvas = await sharp(Buffer.from(bgSvg))
    .composite([{ input: bugsResized, left, top }])
    .png()
    .toBuffer();

  const outPath = 'C:/Users/AdminZ/.gemini/antigravity/brain/fe0bff73-b5a7-48f7-bc79-fddb179fafe8/scratch/bugs_bunny_stage.png';
  fs.writeFileSync(outPath, finalCanvas);
  console.log('Created bugs_bunny_stage.png');
}

testLooneyTunesStage().catch(console.error);
