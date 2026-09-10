import fs from 'node:fs';

const pages = [
  'https://www.pngmart.com/image/tag/minnie-mouse',
  'https://www.pngmart.com/image/tag/daisy-duck',
  'https://www.pngmart.com/image/tag/scrooge-mcduck'
];

async function fetchPngMartTags() {
  for (const pageUrl of pages) {
    try {
      console.log('Fetching', pageUrl);
      const res = await fetch(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const html = await res.text();
      // Look for links to pngmart.com/files/
      const matches = [...html.matchAll(/https:\/\/www\.pngmart\.com\/files\/[^\s\"']+\.png/g)].map(m => m[0]);
      const unique = [...new Set(matches)];
      console.log('Found', unique.length, 'PNGs for', pageUrl);
      console.log('Samples:', unique.slice(0, 5));
    } catch (e) {
      console.error(pageUrl, e.message);
    }
  }
}

fetchPngMartTags();
