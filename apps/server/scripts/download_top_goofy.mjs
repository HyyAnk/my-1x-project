import fs from 'node:fs';
import path from 'node:path';

const scratchDir = 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/top_hd';

async function run() {
  for (const num of [24, 11, 20]) {
    const url = `https://pngimg.com/uploads/goofy/goofy_PNG${num}.png`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(scratchDir, `goofy_${num}.png`), buf);
    console.log(`Saved goofy_${num}.png (${Math.round(buf.length / 1024)} KB)`);
  }
}

run();
