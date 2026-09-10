import fs from 'node:fs';

async function checkWallpapers() {
  const url = 'https://wall.alphacoders.com/search.php?search=Scrooge+McDuck';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html = await res.text();
  const matches = [...html.matchAll(/https:\/\/images[0-9]*\.alphacoders\.com\/[^\s\"']+\.(?:jpg|png)/g)].map(m => m[0]);
  console.log('AlphaCoders Scrooge matches:', [...new Set(matches)]);
}

checkWallpapers().catch(console.error);
