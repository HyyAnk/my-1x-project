import fs from 'node:fs';
import path from 'node:path';

const scratchDir = 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/top_hd';
fs.mkdirSync(scratchDir, { recursive: true });

const list = [
  { name: 'mickey_84', url: 'https://pngimg.com/uploads/mickey_mouse/mickey_mouse_PNG84.png' },
  { name: 'mickey_82', url: 'https://pngimg.com/uploads/mickey_mouse/mickey_mouse_PNG82.png' },
  { name: 'mickey_63', url: 'https://pngimg.com/uploads/mickey_mouse/mickey_mouse_PNG63.png' },
  { name: 'mickey_64', url: 'https://pngimg.com/uploads/mickey_mouse/mickey_mouse_PNG64.png' },
  { name: 'donald_73', url: 'https://pngimg.com/uploads/donald_duck/donald_duck_PNG73.png' },
  { name: 'donald_68', url: 'https://pngimg.com/uploads/donald_duck/donald_duck_PNG68.png' },
  { name: 'donald_67', url: 'https://pngimg.com/uploads/donald_duck/donald_duck_PNG67.png' },
  { name: 'donald_54', url: 'https://pngimg.com/uploads/donald_duck/donald_duck_PNG54.png' },
  { name: 'donald_50', url: 'https://pngimg.com/uploads/donald_duck/donald_duck_PNG50.png' }
];

async function run() {
  for (const item of list) {
    try {
      const res = await fetch(item.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(path.join(scratchDir, `${item.name}.png`), buf);
      console.log(`Saved ${item.name}.png (${Math.round(buf.length / 1024)} KB)`);
    } catch (e) {
      console.error(item.name, e.message);
    }
  }
}

run();
