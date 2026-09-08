# Stage 2B Repair And Migration Implementation Plan

**Goal:** Repair rejected storage/migration work before it touches live data.
**Spec:** [Architecture](02-architecture-and-contracts.md)
**Stack:** Existing TypeScript, repository adapters, Vitest and Node filesystem APIs.

## Files and responsibilities

Inspect/modify existing:

- `apps/server/src/repository/quiz/bank/bankSerializationBoundary.ts`: acquisition, root identity, revision and snapshot digest.
- `bankMetadataMigration.ts` in the same directory: validated manifest, backup/apply/recovery.
- `bankIndexManager.ts`, `bankBatchStorage.ts`, `bankMutationEngine.ts`, `bankQueryEngine.ts`, `bankTranslationStore.ts`: cooperating readers/writers.
- `apps/server/src/repository/runtime.ts`, `bindings/questionBankBindings.ts`, `quiz/questionBankRepository.ts`: public adapter wiring.
- `apps/server/src/quiz/bank/bankInventory.ts`: coherent inventory, duplicate rejection.
- `apps/server/test/bankMetadataMigration.test.ts`, `bankSerializationBoundary.test.ts`, `bankInventory.test.ts`: regression proofs.

Inspect taxonomy reader/writer seams before adding them to a claim. Split migration into focused modules if needed; publish and claim exact paths first.

## Mandatory open review findings

For each item: write a failing test, demonstrate failure, implement, rerun, then record evidence.

- [ ] Validate migration IDs and all manifest fields at the boundary. Reject absolute paths, traversal, drive/UNC paths, separator tricks and symlink/junction escapes. Canonical targets must stay inside the exact Bank or backup root for backup, apply, rollback and manifest persistence.
- [ ] Manifest index.json existence and exact byte hash. Reject index drift before writes and verify unchanged bytes afterward.
- [ ] Inject failure after the first batch write. Recover safely using verified backups and conditional postimage checks. Retry must handle mixed interrupted states deterministically, without overwriting external edits. Do not promise multi-file OS atomicity; use durable recovery states.
- [ ] Replaying the original backed_up manifest after success must not regress durable applied status.
- [ ] Index reads must be read-only. Missing/corrupt index must produce a typed read failure or derived in-memory result; persisted repair belongs to a write operation with revision advancement.
- [ ] Separate ordered boundary revision from content digest. Include the complete snapshot, including index, in canonical digest; define restart/epoch behavior.
- [ ] Only absent/null/blank-string language may become en. Reject number/object/boolean language. Validate all other batch fields without schema-normalizing or rewriting source semantics.
- [ ] Publish exact writer list and lock order. Detect recursive public acquisition and return a typed error rather than hanging. Use unlocked helpers only inside the owning boundary.
- [ ] Snapshot path rejects duplicate/inconsistent question IDs as incomplete/error, just like pagination.
- [ ] Evaluate taxonomy read/write participation and cover it consistently.
- [ ] Prove cross-process safety for cooperating server/CLI writers or explicitly require/enforce exclusive writer admission. A process-local FIFO alone cannot serialize two processes.
- [ ] Audit every test's storage configuration. No test may resolve to the user's redirected live Bank.

Expected writer inventory: saveQuestionBankQuestion (CRUD, batch import/generation, JIT), writeSubtopicBatch, delete, clear, index recalculation, translation persistence until retired, migration. Include any additional actual writers discovered.

## Live migration gate

- [ ] All review defects resolved and independently reviewed; no conflicting claims.
- [ ] Fresh canonical root correlation, manifest and writer/quiescence check. Historical PID 45900 is not current evidence.
- [ ] Inspect all translation fields and explicit language values; report counts without dumping question text.
- [ ] Compare fresh exact membership with the user-attested legacy scope. New or malformed records require explicit handling, not blanket relabeling.
- [ ] Back up every affected batch before writes; verify backup bytes/hash, preserve index and all non-language fields.
- [ ] If writes are active, pause and ask the user to stop generation; do not kill unrelated processes.
- [ ] Apply only the reviewed fresh manifest after explicit operational approval; drift invalidates it.
- [ ] Record backup path, exact changed count, before/after semantic proof, index hash, replay result and recoverability.
- [ ] Record the post-migration source baseline before Stage 3 creates production bindings.

Checks: focused three test files, repository/quizInvalidation regressions, server suite, typecheck, scoped lint/format, zones and diff check. Use temporary storage for all tests.

Output: `docs/agent-coordination/handoffs/bank-topic-upgrade-stage-02b.md` updated with findings and evidence. Release a freshly verified claim. Never mark live migration done merely because migration tests pass.
