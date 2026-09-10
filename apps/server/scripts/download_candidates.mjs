import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const scratchDir = 'C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/candidates';
fs.mkdirSync(scratchDir, { recursive: true });

async function getPngMartUrls(tag) {
  const url = `https://www.pngmart.com/image/tag/${tag}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const matches = [...html.matchAll(/https:\/\/www\.pngmart\.com\/files\/[^\s\"']+\.png/g)].map(m => m[0]);
  return [...new Set(matches)];
}

function getPngImgUrls(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath)).filter(u => !u.includes('/small/'));
}

async function downloadAndInspect(name, urls, maxCount = 6) {
  const targetDir = path.join(scratchDir, name);
  fs.mkdirSync(targetDir, { recursive: true });
  const candidates = [];

  for (let i = 0; i < urls.length && candidates.length < maxCount; i++) {
    const imgUrl = urls[i];
    try {
      const res = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();
      // We want high res (at least 600px tall/wide) with alpha channel
      if (meta.width >= 400 && meta.height >= 400 && meta.hasAlpha) {
        const fileName = `cand_${candidates.length + 1}_${meta.width}x${meta.height}.png`;
        const filePath = path.join(targetDir, fileName);
        fs.writeFileSync(filePath, buf);
        candidates.push({
          index: candidates.length + 1,
          url: imgUrl,
          file: filePath,
          width: meta.width,
          height: meta.height,
          sizeKb: Math.round(buf.length / 1024)
        });
        console.log(`[${name}] Saved ${fileName} from ${imgUrl}`);
      }
    } catch (e) {
      console.error(`[${name}] Error fetching ${imgUrl}:`, e.message);
    }
  }
  return candidates;
}

async function run() {
  const minnieUrls = await getPngMartUrls('minnie-mouse');
  const daisyUrls = await getPngMartUrls('daisy-duck');
  const scroogeUrls = await getPngMartUrls('scrooge-mcduck');

  const mickeyUrls = getPngImgUrls('C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/mickey_urls.json');
  const donaldUrls = getPngImgUrls('C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/donald_urls.json');
  const goofyUrls = getPngImgUrls('C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/goofy_urls.json');

  const report = {};
  report.mickey = await downloadAndInspect('mickey', mickeyUrls, 6);
  report.minnie = await downloadAndInspect('minnie', minnieUrls, 6);
  report.donald = await downloadAndInspect('donald', donaldUrls, 6);
  report.daisy = await downloadAndInspect('daisy', daisyUrls, 6);
  report.goofy = await downloadAndInspect('goofy', goofyUrls, 6);
  report.scrooge = await downloadAndInspect('scrooge', scroogeUrls, 6);

  fs.writeFileSync(path.join(scratchDir, 'candidates_report.json'), JSON.stringify(report, null, 2));
  console.log('Finished downloading candidate pools!');
}

run().catch(console.error);
