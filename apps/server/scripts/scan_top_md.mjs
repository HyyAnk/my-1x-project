import fs from 'node:fs';
import sharp from 'sharp';

const mickeyUrls = JSON.parse(fs.readFileSync('C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/mickey_urls.json')).filter(u => !u.includes('/small/'));
const donaldUrls = JSON.parse(fs.readFileSync('C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/donald_urls.json')).filter(u => !u.includes('/small/'));

async function inspectList(name, urls, maxScan = 40) {
  console.log(`Scanning ${name} ${urls.length} urls...`);
  const topList = [];
  for (let i = 0; i < Math.min(urls.length, maxScan); i++) {
    const u = urls[i];
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();
      if (meta.width >= 500 && meta.height >= 500 && meta.hasAlpha) {
        topList.push({
          url: u,
          width: meta.width,
          height: meta.height,
          sizeKb: Math.round(buf.length / 1024)
        });
      }
    } catch (e) {
      // ignore
    }
  }
  // Sort by resolution
  topList.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  console.log(`${name} top 10 by res:`, topList.slice(0, 10));
  return topList;
}

async function run() {
  const mTop = await inspectList('mickey', mickeyUrls, 40);
  const dTop = await inspectList('donald', donaldUrls, 40);
  fs.writeFileSync('C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/top_m_d.json', JSON.stringify({ mTop, dTop }, null, 2));
}

run().catch(console.error);
