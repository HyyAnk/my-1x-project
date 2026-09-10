import fs from 'node:fs';
import path from 'node:path';

async function checkDaisyMart() {
  const url = 'https://www.pngmart.com/image/tag/daisy-duck';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const matches = [...new Set([...html.matchAll(/https:\/\/www\.pngmart\.com\/files\/7\/[^\s\"']+\.png/g)].map(m => m[0]))];
  console.log('Daisy PNGMart all:', matches);
}

checkDaisyMart();
