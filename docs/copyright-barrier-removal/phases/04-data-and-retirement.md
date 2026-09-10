# P4 - Metadata Migration and Module Retirement

## Files and interfaces

Read `DATA_RUNBOOK.md` fully before this phase.

- Create migration modules at `scripts/migrations/knowledge-policy-removal/{types,transform,files,cli}.ts`.
- Create `apps/server/test/knowledgePolicyMigration.test.ts`.
- Create `apps/server/test/fixtures/knowledge-policy-removal/entities.json` with the synthetic fixture below.
- Modify knowledge entity types, loader risk re-exports, and the unused collector input field listed in the inventory.
- Retire audit/rule modules and remaining copyright validators after the final caller scan.
- Rework `entityCopyrightAudit.test.ts` and `copyrightValidator.test.ts` around surviving public behavior or replace them with the new tests. No no-op APIs.

## Migration contracts

Define in `types.ts` before implementation:

```typescript
export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };
export type PolicyKey = "copyright_risk" | "is_trademark_ip" | "forbidden_visual_keywords" | "safe_visual_proxy";
export type TransformResult = { value: JsonObject; removedKeys: PolicyKey[] };
export type FilePlan = {
  relativePath: string;
  beforeSha256: string;
  afterSha256: string;
  entities: number;
  changedEntities: number;
  removedFields: number;
};
export type MigrationPlan = {
  schemaVersion: 1;
  migrationId: "knowledge-policy-removal-v1";
  root: string;
  files: FilePlan[];
};
export type JournalEntry = FilePlan & {
  backupRelativePath: string;
  status: "backed_up" | "applied" | "restored";
};
export type MigrationJournal = {
  schemaVersion: 1;
  root: string;
  state: "prepared" | "applying" | "applied" | "partial" | "rolled_back";
  entries: JournalEntry[];
};
```

`JsonObject` is deliberately an extensible JSON boundary, not a domain type. Validate parsed input as an array of records with nonempty string IDs and required existing entity identity fields; reject duplicate IDs, malformed JSON, or invalid shapes before writing anything. Preserve unknown fields rather than using a schema parser that strips them.

Functions exported by the planned modules:

```typescript
// transform.ts
export function removeKnowledgePolicyFields(entity: JsonObject): TransformResult;

// files.ts
export async function planMigration(root: string): Promise<MigrationPlan>;
export async function applyMigration(plan: MigrationPlan, backupRoot: string): Promise<MigrationJournal>;
export async function rollbackMigration(journalPath: string): Promise<MigrationJournal>;
```

Use typed errors with codes `INVALID_ROOT`, `INVALID_DATA`, `SOURCE_CHANGED`, `BACKUP_FAILED`, `WRITE_FAILED`, `ROLLBACK_CONFLICT`, `LOCKED`. CLI maps validation/conflict errors to exit 2, I/O/partial failure to exit 1, complete success to exit 0. SIGINT stops before the next file and records a recoverable partial journal; it must not label a partial operation successful.

## Steps

- [ ] Add a red test for exact field removal, preservation, idempotence, and no mutation:

```typescript
import { expect, it } from "vitest";
import { removeKnowledgePolicyFields } from "../../../scripts/migrations/knowledge-policy-removal/transform.js";

it("removes only obsolete enforcement metadata", () => {
  const input = {
    id: "ENT-TEST-1",
    domain_id: "sports_games",
    subtopic_id: "arcade",
    name: "Pac-Man",
    aliases: ["Pac Man"],
    visual_anchor: "Pac-Man in a maze",
    copyright_risk: "high",
    is_trademark_ip: true,
    forbidden_visual_keywords: ["Pac-Man"],
    safe_visual_proxy: "A yellow circle",
    license_type: "official_press_asset",
    attribution: "Recorded source credit",
    source_url: "https://example.com/asset",
    future_field: { preserved: true },
  };
  const before = structuredClone(input);
  const result = removeKnowledgePolicyFields(input);
  expect(result.removedKeys).toHaveLength(4);
  expect(result.value).toEqual({
    id: input.id,
    domain_id: input.domain_id,
    subtopic_id: input.subtopic_id,
    name: input.name,
    aliases: input.aliases,
    visual_anchor: input.visual_anchor,
    license_type: input.license_type,
    attribution: input.attribution,
    source_url: input.source_url,
    future_field: input.future_field,
  });
  expect(input).toEqual(before);
  expect(removeKnowledgePolicyFields(result.value).removedKeys).toEqual([]);
});
```

- [ ] Implement the pure transform without file I/O:

```typescript
import type { JsonObject, PolicyKey, TransformResult } from "./types.js";

const POLICY_KEYS: readonly PolicyKey[] = ["copyright_risk", "is_trademark_ip", "forbidden_visual_keywords", "safe_visual_proxy"];

export function removeKnowledgePolicyFields(entity: JsonObject): TransformResult {
  const value = { ...entity };
  const removedKeys: PolicyKey[] = [];
  for (const key of POLICY_KEYS) {
    if (Object.hasOwn(value, key)) {
      delete value[key];
      removedKeys.push(key);
    }
  }
  return { value, removedKeys };
}
```

- [ ] Implement filesystem planning/apply/rollback to the exact safety contract in `DATA_RUNBOOK.md`. Cover changed-source detection, exclusive lock, symlink/junction escape, malformed JSON, partial commit, and conflicting rollback before using it on any real files. Keep CLI thin; no duplication of transformation rules in CLI and runtime.
- [ ] Create this complete fixture file for the CLI rehearsal. It contains no real assets or external storage paths:

```json
[
  {
    "id": "ENT-REHEARSAL-001",
    "domain_id": "sports_games",
    "subtopic_id": "arcade",
    "name": "Pac-Man",
    "language": "en",
    "aliases": ["Pac Man"],
    "visual_anchor": "Pac-Man moving through a maze",
    "core_traits": ["arcade character"],
    "facts_and_myths": [],
    "copyright_risk": "high",
    "is_trademark_ip": true,
    "forbidden_visual_keywords": ["Pac-Man"],
    "safe_visual_proxy": "A yellow circular arcade figure",
    "fixture_metadata": { "preserve": true }
  }
]
```

- [ ] Rehearse dry-run, apply, second dry-run, and rollback against a temporary copied fixture. Record per-file original and restored hashes; the second dry-run must report zero changed entities. Root-level counts alone do not prove losslessness.
- [ ] Remove the four obsolete fields from `KnowledgeEntity`, `CopyrightRiskLevel` and loader exports. Keep all CuratedEntityAsset provenance fields. Verify old JSON extra fields do not break reads and are not fed into prompts. Do not fabricate an “authorized” field for every entity.
- [ ] Remove `CollectorEntityInput.safeVisualProxy` only after confirming no new callers read it. Remove all references to the audit writer and classification APIs, then delete exact audited files. Keep taxonomy/disambiguation information from ordinary entity facts; do not transfer it as hidden deny rules.
- [ ] Run targeted tests and type checks:

```powershell
pnpm --filter @studio/server test test/knowledgePolicyMigration.test.ts test/authorizedContentGeneration.test.ts test/authorizedContentVisuals.test.ts test/curatedEntityAssetRegistry.test.ts
pnpm --filter @studio/server typecheck
rg -n "validateTextCopyright|validateQuizV2Copyright|STRICT_COPYRIGHT_PATTERNS|KNOWN_TRADEMARK_IP_DEFS|classifyEntityCopyright|sanitizeKnowledgeBaseEntitiesDir" apps/server/src packages/shared/src shared scripts
```

Expected source scan: no active references to retired APIs. Historical docs and migration field names are separately classified, not deleted wholesale.

## Gate

Migration rehearsal is lossless, reversible, and idempotent; no production data was changed without explicit target approval. Active domain types and modules no longer implement copyright policy. Legacy reads and curated provenance still work.
