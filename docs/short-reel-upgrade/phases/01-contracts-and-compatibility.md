# Phase 01 - Contracts and Compatibility

## Files and boundaries

Create shared modules listed in the plan, `apps/server/src/repository/shortReelUpgrade.ts`, `packages/shared/test/shortReelCompatibility.test.ts`, and `apps/server/test/shortReelUpgradePersistence.test.ts`. Modify shared schema/API/exports/events, new-record defaults in `shortReels.ts`, the read entry point in `shortReelStorage.ts`, and the transactional write boundary. Keep v1 normalization out of React.

Consumes: existing v1 record, attempt, publishing and task shapes. Produces: canonical v2 schema, `parseCompatibleShortReelRecord`, new publishing/visual/progress schemas, optional generation mode, typed safe errors.

## Steps

- [x] Preserve the actual old strict record/publishing schema in a legacy module before changing canonical fields. Reuse stable source/segment/asset schemas without importing the new canonical record back into the legacy module.
- [x] Add a frozen v1 test fixture in TypeScript from a temporary repository fixture, not a copy of private live data. Include old four-field publishing, null visual context, accepted images, pending attempt metadata and mutation receipts.
- [x] Write the pure migration test below; run it and observe failure because the v2 compatibility adapter is not implemented.

```ts
it("preserves legacy publishing and normalizes only once", () => {
  const next = parseCompatibleShortReelRecord(legacyRecord);
  expect(next.schema_version).toBe(2);
  expect(next.units.publishing.last_accepted_payload).toEqual({
    title: "Which tool wins?",
    description: "Watch the comparison.\n\nShare your guess.\n\n#Quiz #Tools",
  });
  expect(parseCompatibleShortReelRecord(next)).toEqual(next);
});
```

`legacyRecord` is the complete v1 fixture whose publishing is `{hook: "Which tool wins?", description: "Watch the comparison.", cta: "Share your guess.", hashtags: ["#Quiz", "#Tools"]}`. Do not cast a partial object to the record type.

- [x] Add cases for an existing hashtag in description, repeated CTA, empty nullable CTA, a 500-character hook, mixed-case hashtag duplicates, invalid v2 input, unknown schema version and pending old task requests. Assert no text loss and no duplicate appends.
- [x] Implement strict new generation schema separately from persistence limits, as specified in `03-contracts-and-state.md`.
- [x] Add each unit's `accepted_dependency_fingerprint` with a null legacy default. Add tests proving beginning/failing a regeneration preserves this field and that unknown legacy provenance is not treated as current merely because a unit says ready.
- [x] Implement compatible storage reads with no write side effect. Mark legacy references/cover as stale if they lack the new script/visual provenance; preserve their payloads. Keep legacy publishing readable and user-editable, but mark it stale when its inputs cannot be verified. Do not erase the accepted script merely because style is missing.
- [x] Add new-record v2 defaults and read adapters before any new production path emits v2. Search all direct `ShortReelRecordSchema.parse` callers; only disk/request compatibility boundaries should accept old input.
- [x] Add byte-preserving backup-on-first-write under the existing writer queue. Test read-only GET makes no backup and no mtime change. Test exactly one backup, mismatch conflict, interrupted write, retry, and unchanged revision on no-op read.
- [x] Cover both direct ordinary edits in `shortReels.ts` and generated mutations in `shortReelTransaction.ts`; centralize the upgrade pre-write hook rather than guarding only one writer. New v2 creation needs no v1 backup. Keep backups within the same validated reel directory.
- [x] Normalize legacy `update_publishing` request input at the route boundary before strict new command parsing. Internal commands use only title/description. Test the normalized request remains idempotent and receipts do not change on replay.
- [x] Add optional request `mode` to API and persisted Task request shapes. Default interpretation is implemented by one pure helper, `normalizeReelGenerationMode(target, mode)` in new shared `shortReelRequest.ts`, exported from the Short-Reel index.

```ts
expect(normalizeReelGenerationMode("package", undefined)).toBe("repair");
expect(normalizeReelGenerationMode("cover", undefined)).toBe("regenerate");
expect(normalizeReelGenerationMode("package", "regenerate")).toBe("regenerate");
```

- [x] Add shared stage progress schema with six stage keys and typed state values. Persist it as an optional Task field; old tasks must still parse. No required new field on old events.
- [x] Extend strict GET/list response contracts for input-status projection, and test duplicate stage keys/invalid revision are rejected. Do not leak server-only provider/byte types into web contracts.
- [x] Update existing schema fixtures intentionally; retain v1 coverage rather than converting every fixture to v2 and deleting compatibility assertions.
- [x] Run checks and review the migration diff for read-side mutations or unchecked casts.

```powershell
pnpm --filter @studio/shared build
pnpm --filter @studio/shared test -- shortReel
pnpm --filter @studio/server test -- shortReelUpgradePersistence
pnpm --filter @studio/server test -- shortReelAtomicWriter shortReelWriterSafety shortReelRepository
pnpm typecheck
```

## Exit gate

Old records/tasks remain readable, reads are non-mutating, new writes are v2 with verified backups, and no persisted content is silently truncated. Existing web/server consumers compile with the new payload; adapt their shape minimally here and perform full UX work in Phase 06.
