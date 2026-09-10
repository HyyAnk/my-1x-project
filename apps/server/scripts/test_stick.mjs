import fs from 'node:fs';

async function checkOne() {
  const p = 'https://www.stickpng.com/img/cartoons/ducktales/scrooge-mcduck';
  const res = await fetch(p, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  console.log('length:', html.length);
  const imgs = [...html.matchAll(/https:\/\/[^"'\s]+\.png/g)].map(m => m[0]);
  console.log('pngs:', imgs);
}

checkOne();
