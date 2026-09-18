# Knowledge Base Maintenance Tools

This directory contains standalone CLI utilities for maintaining, validating, and synchronizing knowledge base entities and taxonomies.

## Scripts

### 1. `validateKnowledgeEntities.js`

Validates an entity JSON dataset against schema specifications, ID formatting (`^ENT-[A-Z]{3}-[0-9]{3,}$`), English-only character constraints, and required fields.

```bash
node scripts/knowledge/validateKnowledgeEntities.js .quiz-studio/knowledge_base/entities/anime_manga.json
```

### 2. `validateGlobalBrands.js`

Validates global brand entity definitions against schema standards.

```bash
node scripts/knowledge/validateGlobalBrands.js [.quiz-studio/knowledge_base/entities/global_brands.json]
```

### 3. `syncTaxonomy.js`

Scans all entity domain JSON files in `.quiz-studio/knowledge_base/entities/` and regenerates `.quiz-studio/question_bank/taxonomy.json`.

```bash
node scripts/knowledge/syncTaxonomy.js
```
