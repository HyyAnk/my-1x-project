import fs from 'node:fs';
import sharp from 'sharp';

const goofyUrls = JSON.parse(fs.readFileSync('C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/goofy_urls.json')).filter(u => !u.includes('/small/'));

async function scanGoofy() {
  const list = [];
  for (const u of goofyUrls) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();
      if (meta.width >= 600 && meta.height >= 600 && meta.hasAlpha) {
        list.push({ url: u, width: meta.width, height: meta.height, sizeKb: Math.round(buf.length / 1024) });
      }
    } catch (e) {}
  }
  list.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  console.log('Goofy top 5:', list.slice(0, 5));
}

scanGoofy();
