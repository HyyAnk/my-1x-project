import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const scratchDir = 'C:/Users/AdminZ/.gemini/antigravity/brain/78b87544-4c8a-4068-91de-61e63e401cce/scratch/pngmart_downloads';
fs.mkdirSync(scratchDir, { recursive: true });

const searchResults = JSON.parse(fs.readFileSync('C:/Users/AdminZ/.gemini/antigravity/brain/78b87544-4c8a-4068-91de-61e63e401cce/scratch/pngmart_search_results.json', 'utf-8'));
const tagResults = JSON.parse(fs.readFileSync('C:/Users/AdminZ/.gemini/antigravity/brain/78b87544-4c8a-4068-91de-61e63e401cce/scratch/pngmart_results.json', 'utf-8'));

async function download(url, outName) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(scratchDir, outName);
    fs.writeFileSync(outPath, buf);
    const meta = await sharp(buf).metadata();
    console.log(`Saved ${outName}: ${meta.width}x${meta.height}, ${Math.round(buf.length/1024)} KB`);
    return meta;
  } catch (e) {
    console.error(outName, e.message);
  }
}

async function run() {
  // Download Taz
  for (let i = 0; i < Math.min(6, searchResults.taz.pngs.length); i++) {
    await download(searchResults.taz.pngs[i], `taz_${i}.png`);
  }
  // Download Coyote
  for (let i = 0; i < Math.min(6, searchResults.coyote.pngs.length); i++) {
    await download(searchResults.coyote.pngs[i], `coyote_${i}.png`);
  }
  // Download Road Runner
  for (let i = 0; i < Math.min(6, tagResults['road-runner'].length); i++) {
    await download(tagResults['road-runner'][i], `roadrunner_${i}.png`);
  }
  // Download Looney Tunes generic (might have Elmer or Porky)
  for (let i = 0; i < Math.min(10, searchResults.looney.pngs.length); i++) {
    const u = searchResults.looney.pngs[i];
    if (u.toLowerCase().includes('looney-tunes')) {
      await download(u, `looney_${i}.png`);
    }
  }
}

run();
