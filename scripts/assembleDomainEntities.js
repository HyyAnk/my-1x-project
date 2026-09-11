import fs from 'node:fs';
import path from 'node:path';
import { validateEntities } from './validateKnowledgeEntities.js';

export function assembleDomain(domainId) {
  const stagingDir = path.join(process.cwd(), '.quiz-studio', 'knowledge_base', 'entities', '.staging', domainId);
  const manifestPath = path.join(stagingDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found at: ${manifestPath}`);
    return false;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const totalChunks = manifest.batches 
    ? manifest.batches.reduce((acc, b) => acc + b.chunks.length, 0)
    : (manifest.total_chunks || (manifest.chunks ? manifest.chunks.length : 0));

  const missing = [];
  const allEntities = [];

  for (let i = 1; i <= totalChunks; i++) {
    const chunkName = `chunk_${String(i).padStart(2, '0')}.json`;
    const chunkPath = path.join(stagingDir, chunkName);
    if (!fs.existsSync(chunkPath)) {
      missing.push(chunkName);
    } else {
      try {
        let raw = fs.readFileSync(chunkPath, 'utf8');
        // Normalize any accents to pure ASCII
        raw = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          allEntities.push(...parsed);
        } else {
          console.error(`Error: ${chunkName} is not an array.`);
        }
      } catch (err) {
        console.error(`Error reading ${chunkName}:`, err.message);
      }
    }
  }

  console.log(`[${domainId}] Chunks present: ${totalChunks - missing.length}/${totalChunks}. Entities gathered: ${allEntities.length}/${manifest.total_entities}`);
  if (missing.length > 0) {
    console.log(`Waiting for chunks: ${missing.join(', ')}`);
    return false;
  }

  // Sort by entity ID number
  allEntities.sort((a, b) => {
    const numA = parseInt(a.id.replace(/^ENT-[A-Z]+-/, ''), 10);
    const numB = parseInt(b.id.replace(/^ENT-[A-Z]+-/, ''), 10);
    return numA - numB;
  });

  // Validate
  const errors = validateEntities(allEntities, domainId);
  if (errors.length > 0) {
    console.error(`\n[${domainId}] Assembly aborted! Found ${errors.length} validation errors:`);
    console.error(errors.slice(0, 20).join('\n'));
    return false;
  }

  const outputDir = path.join(process.cwd(), '.quiz-studio', 'knowledge_base', 'entities');
  const outputFile = path.join(outputDir, `${domainId}.json`);

  fs.writeFileSync(outputFile, JSON.stringify(allEntities, null, 2), 'utf8');
  console.log(`\n[${domainId}] Successfully assembled and validated ${allEntities.length} entities into: ${outputFile}`);
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('assembleDomainEntities.js')) {
  const domainId = process.argv[2];
  if (!domainId) {
    console.error('Please specify a domainId.');
    process.exit(1);
  }
  const success = assembleDomain(domainId);
  process.exit(success ? 0 : 1);
}
