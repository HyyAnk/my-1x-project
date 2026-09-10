import fs from 'node:fs';

async function getWikiScrooge() {
  const url = 'https://upload.wikimedia.org/wikipedia/en/5/54/Scrooge_McDuck.png';
  const res = await fetch(url, { headers: { 'User-Agent': 'QuizStudioBot/1.0' } });
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync('C:/Users/AdminZ/.gemini/antigravity/brain/57c594d9-ef0e-48da-9d41-7c22bbf52610/scratch/candidates/scrooge/wiki_scrooge.png', buf);
  console.log('Saved wiki_scrooge.png, size:', buf.length);
}

getWikiScrooge();
