import fs from 'node:fs';
import path from 'node:path';
import { validateEntities } from './validateGlobalBrands.js';

const stagingDir = path.join(process.cwd(), '.quiz-studio', 'knowledge_base', 'entities', '.staging');
const outputDir = path.join(process.cwd(), '.quiz-studio', 'knowledge_base', 'entities');
const outputFile = path.join(outputDir, 'global_brands.json');

export function checkAndAssemble() {
  const missing = [];
  const allEntities = [];

  for (let i = 1; i <= 18; i++) {
    const chunkName = `chunk_${String(i).padStart(2, '0')}.json`;
    const chunkPath = path.join(stagingDir, chunkName);
    if (!fs.existsSync(chunkPath)) {
      missing.push(chunkName);
    } else {
      try {
        const raw = fs.readFileSync(chunkPath, 'utf8');
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

  console.log(`Chunks present: ${18 - missing.length}/18. Total entities gathered: ${allEntities.length}`);
  if (missing.length > 0) {
    console.log(`Waiting for remaining chunks: ${missing.join(', ')}`);
    return false;
  }

  // Sort by entity ID
  allEntities.sort((a, b) => {
    const numA = parseInt(a.id.replace('ENT-BRD-', ''), 10);
    const numB = parseInt(b.id.replace('ENT-BRD-', ''), 10);
    return numA - numB;
  });

  // Validate
  const errors = validateEntities(allEntities);
  if (errors.length > 0) {
    console.error(`\nAssembly aborted! Found ${errors.length} validation errors:`);
    console.error(errors.slice(0, 20).join('\n'));
    return false;
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(allEntities, null, 2), 'utf8');
  console.log(`\nSuccessfully assembled and validated ${allEntities.length} entities into:`);
  console.log(outputFile);
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('assembleGlobalBrands.js')) {
  const success = checkAndAssemble();
  process.exit(success ? 0 : 1);
}
