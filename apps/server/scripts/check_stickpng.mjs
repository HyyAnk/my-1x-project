import fs from 'node:fs';

const pages = [
  'https://www.stickpng.com/img/cartoons/ducktales/scrooge-mcduck',
  'https://www.stickpng.com/img/cartoons/ducktales/scrooge-mcduck-dancing',
  'https://www.stickpng.com/img/cartoons/ducktales/scrooge-mcduck-lying-on-money-bags',
  'https://www.stickpng.com/img/cartoons/ducktales/scrooge-mcduck-holding-money-bag'
];

async function checkStickPng() {
  for (const p of pages) {
    try {
      const res = await fetch(p, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const matches = [...html.matchAll(/https:\/\/assets\.stickpng\.com\/images\/[a-zA-Z0-9_-]+\.png/g)].map(m => m[0]);
      console.log(p, 'matches:', matches);
    } catch (e) {
      console.error(p, e.message);
    }
  }
}

checkStickPng();
