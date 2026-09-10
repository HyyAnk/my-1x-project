import fs from 'node:fs';
import path from 'node:path';

const remaining = [
  'https://www.pngmart.com/files/7/Daisy-Duck-PNG-Transparent-Image.png',
  'https://www.pngmart.com/files/7/Daisy-Duck-Transparent-PNG.png',
  'https://www.pngmart.com/files/7/Daisy-Duck-PNG-HD.png',
  'https://www.pngmart.com/files/7/Daisy-Duck-Transparent-Background.png'
];

async function run() {
  const dir = 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/candidates/daisy_extra';
  fs.mkdirSync(dir, { recursive: true });

  for (let i = 0; i < remaining.length; i++) {
    const u = remaining[i];
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(dir, `daisy_extra_${i + 1}.png`), buf);
      console.log(`Saved daisy_extra_${i + 1}.png (${Math.round(buf.length / 1024)} KB)`);
    } catch (e) {
      console.error(u, e.message);
    }
  }
}

run();
