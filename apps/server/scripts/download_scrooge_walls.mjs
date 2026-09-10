import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const urls = [
  'https://images.alphacoders.com/475/475510.jpg',
  'https://images.alphacoders.com/104/1046404.jpg',
  'https://images8.alphacoders.com/136/1369920.png',
  'https://images5.alphacoders.com/136/1369921.png',
  'https://images3.alphacoders.com/748/748918.jpg',
  'https://images4.alphacoders.com/136/1369919.png',
  'https://images4.alphacoders.com/112/1121570.jpg'
];

async function download() {
  const dir = 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/candidates/scrooge_walls';
  fs.mkdirSync(dir, { recursive: true });

  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();
      const ext = meta.format === 'png' ? 'png' : 'jpg';
      const fp = path.join(dir, `wall_${i + 1}_${meta.width}x${meta.height}.${ext}`);
      fs.writeFileSync(fp, buf);
      console.log(`Saved wall ${i + 1}: ${meta.width}x${meta.height}`);
    } catch (e) {
      console.error(u, e.message);
    }
  }
}

download().catch(console.error);
