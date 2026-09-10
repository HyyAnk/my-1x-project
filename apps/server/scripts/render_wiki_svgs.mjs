import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const scratchDir = 'C:/Users/AdminZ/.gemini/antigravity/brain/78b87544-4c8a-4068-91de-61e63e401cce/scratch/wiki_svgs';
fs.mkdirSync(scratchDir, { recursive: true });

const svgs = [
  { name: 'bugs_bunny', url: 'https://upload.wikimedia.org/wikipedia/en/1/17/Bugs_Bunny.svg' },
  { name: 'daffy_duck', url: 'https://upload.wikimedia.org/wikipedia/en/f/f4/Daffy_Duck.svg' },
  { name: 'porky_pig', url: 'https://upload.wikimedia.org/wikipedia/en/8/88/Porky_Pig.svg' },
  { name: 'tweety', url: 'https://upload.wikimedia.org/wikipedia/en/0/02/Tweety.svg' },
  { name: 'sylvester', url: 'https://upload.wikimedia.org/wikipedia/en/8/82/Sylvester_the_Cat.svg' },
  { name: 'taz', url: 'https://upload.wikimedia.org/wikipedia/en/c/c4/Taz-Looney_Tunes.svg' }
];

async function run() {
  for (const item of svgs) {
    try {
      const res = await fetch(item.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const svgText = await res.text();
      const pngBuf = await sharp(Buffer.from(svgText), { density: 600 }).png().toBuffer();
      const outPath = path.join(scratchDir, `${item.name}.png`);
      fs.writeFileSync(outPath, pngBuf);
      const meta = await sharp(pngBuf).metadata();
      console.log(`${item.name}: ${meta.width}x${meta.height}, size=${Math.round(pngBuf.length / 1024)} KB`);
    } catch (e) {
      console.error(item.name, e.message);
    }
  }
}

run();
