import fs from 'node:fs';
import path from 'node:path';
import { validateEntities } from './validateKnowledgeEntities.js';

const ROOT_DIR = process.cwd();
const ANIME_FILE = path.join(ROOT_DIR, '.quiz-studio', 'knowledge_base', 'entities', 'anime_manga.json');
const POP_FILE = path.join(ROOT_DIR, '.quiz-studio', 'knowledge_base', 'entities', 'pop_culture_classics.json');
const BACKUP_DIR = path.join(ROOT_DIR, '.quiz-studio', 'knowledge_base', 'backups', `pre_phase1_curation_${Date.now()}`);

// Read original dataset
const originalData = JSON.parse(fs.readFileSync(ANIME_FILE, 'utf8'));
const popData = JSON.parse(fs.readFileSync(POP_FILE, 'utf8'));

console.log(`Original entities count: ${originalData.length}`);

// Ensure backup
fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.writeFileSync(path.join(BACKUP_DIR, 'anime_manga.json'), JSON.stringify(originalData, null, 2), 'utf8');
console.log(`Backup saved to ${BACKUP_DIR}`);

// 1. Shonen Legends characters (Goku, Vegeta, Luffy, Zoro, Naruto, Sasuke, Kakashi, Saitama, Pikachu, Ash Ketchum)
const shonenConfig = [
  { name: 'Son Goku', diff: 1 },
  { name: 'Vegeta', diff: 2 },
  { name: 'Monkey D. Luffy', diff: 1 },
  { name: 'Roronoa Zoro', diff: 2 },
  { name: 'Naruto Uzumaki', diff: 1 },
  { name: 'Sasuke Uchiha', diff: 2 },
  { name: 'Kakashi Hatake', diff: 2 },
  { name: 'Saitama', diff: 1 }
];

const curatedList = [];

for (const cfg of shonenConfig) {
  const entity = originalData.find((e) => e.name === cfg.name);
  if (!entity) throw new Error(`Entity not found: ${cfg.name}`);
  curatedList.push({
    ...entity,
    subtopic_id: 'shonen_legends',
    difficulty: cfg.diff
  });
}

// Add Pikachu and Ash Ketchum adapted for anime_manga domain
const pikachuOrig = popData.find((e) => e.name === 'Pikachu');
const ashOrig = popData.find((e) => e.name === 'Ash Ketchum');

if (!pikachuOrig || !ashOrig) {
  throw new Error('Pikachu or Ash Ketchum missing from pop_culture_classics.json');
}

curatedList.push({
  ...pikachuOrig,
  id: '',
  domain_id: 'anime_manga',
  subtopic_id: 'shonen_legends',
  difficulty: 1,
  versus_candidates: ['Ash Ketchum', 'Son Goku', 'Doraemon']
});

curatedList.push({
  ...ashOrig,
  id: '',
  domain_id: 'anime_manga',
  subtopic_id: 'shonen_legends',
  difficulty: 1,
  versus_candidates: ['Gary Oak', 'Red', 'Pikachu']
});

// 2. Modern Phenomena (Tanjiro, Nezuko, Gojo, Yuji Itadori, Eren, Levi)
const modernConfig = [
  { name: 'Tanjiro Kamado', diff: 1 },
  { name: 'Nezuko Kamado', diff: 1 },
  { name: 'Satoru Gojo', diff: 1 },
  { name: 'Yuji Itadori', diff: 2 },
  { name: 'Eren Yeager', diff: 1 },
  { name: 'Levi Ackerman', diff: 2 }
];

for (const cfg of modernConfig) {
  const entity = originalData.find((e) => e.name === cfg.name);
  if (!entity) throw new Error(`Entity not found: ${cfg.name}`);
  curatedList.push({
    ...entity,
    subtopic_id: 'modern_phenomena',
    difficulty: cfg.diff
  });
}

// 3. Ghibli Classics (Totoro, Chihiro, No-Face, Calcifer, Kiki)
const ghibliConfig = [
  { name: 'Totoro', diff: 1 },
  { name: 'Chihiro Ogino', diff: 1 },
  { name: 'No-Face', diff: 1 },
  { name: 'Calcifer', diff: 2 },
  { name: 'Kiki', diff: 1 }
];

for (const cfg of ghibliConfig) {
  const entity = originalData.find((e) => e.name === cfg.name);
  if (!entity) throw new Error(`Entity not found: ${cfg.name}`);
  curatedList.push({
    ...entity,
    subtopic_id: 'ghibli_classics',
    difficulty: cfg.diff
  });
}

// 4. Detective Psychological (Light Yagami, L Lawliet, Ryuk, Conan Edogawa, Kaitou Kid, Anya Forger, Loid Forger)
const detConfig = [
  { name: 'Light Yagami', diff: 1 },
  { name: 'L Lawliet', diff: 1 },
  { name: 'Ryuk', diff: 2 },
  { name: 'Conan Edogawa', diff: 1 },
  { name: 'Kaitou Kid', diff: 2 },
  { name: 'Anya Forger', diff: 1 },
  { name: 'Loid Forger', diff: 2 }
];

for (const cfg of detConfig) {
  const entity = originalData.find((e) => e.name === cfg.name);
  if (!entity) throw new Error(`Entity not found: ${cfg.name}`);
  curatedList.push({
    ...entity,
    subtopic_id: 'detective_psychological',
    difficulty: cfg.diff
  });
}

// 5. Iconic Franchises (All 25 franchise entities)
const franchises = originalData.filter((e) => e.subtopic_id === 'iconic_franchises');
if (franchises.length !== 25) {
  throw new Error(`Expected 25 iconic franchises, found ${franchises.length}`);
}

for (const f of franchises) {
  curatedList.push({
    ...f,
    difficulty: 1
  });
}

// Re-sequence sequential IDs
curatedList.forEach((entity, index) => {
  const idNum = String(index + 1).padStart(3, '0');
  entity.id = `ENT-ANM-${idNum}`;
});

console.log(`Curated entities count: ${curatedList.length}`);

// Validate schema and English-only rules
const validationErrors = validateEntities(curatedList, 'anime_manga');
if (validationErrors.length > 0) {
  console.error(`Validation failed with ${validationErrors.length} errors:`);
  console.error(validationErrors.join('\n'));
  process.exit(1);
}

// Write back to anime_manga.json
fs.writeFileSync(ANIME_FILE, JSON.stringify(curatedList, null, 2) + '\n', 'utf8');
console.log(`Successfully wrote ${curatedList.length} entities to ${ANIME_FILE}`);

// Print subtopic summary
const subtopicCounts = {};
curatedList.forEach((e) => {
  subtopicCounts[e.subtopic_id] = (subtopicCounts[e.subtopic_id] || 0) + 1;
});
console.log('Subtopic breakdown:', JSON.stringify(subtopicCounts, null, 2));
