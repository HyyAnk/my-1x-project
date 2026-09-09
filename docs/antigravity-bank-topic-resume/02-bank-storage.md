# Work 1: Finish Bank Enforcement And Storage Safety

## Files

Existing partial files:

- `apps/server/src/repository/quiz/bank/bankWritePolicy.ts`
- `bankMutationEngine.ts`, `bankBatchStorage.ts`, `bankTranslationStore.ts`, `bankSerializationBoundary.ts`, `bankMetadataMigration.ts` in that directory
- `apps/server/src/routes/questionBank/buildRoutes.ts`, `crudRoutes.ts`
- `apps/server/test/questionBankEnglishOnly.test.ts`, `questionBankRepository.test.ts`, `questionBankIntegration.test.ts`, `questionBankRoute.test.ts`, `questionBankTranscreation.test.ts`
- `apps/server/test/bankSerializationBoundary.test.ts`, `bankMetadataMigration.test.ts`
- Bank UI files listed by git diff, especially form builder, toolbar, table and live preview.

## Steps

- [ ] Recover ownership as described in Work 0; read partial diffs first.
- [ ] Repository single/batch writes must enforce explicit English metadata and store en. Reject foreign/malformed/unknown input and translations. Do not infer imported content is English.
- [ ] UI-created English records emit en explicitly. Update old fixtures to explicit en; do not weaken production policy to pass them.
- [ ] Both public/unlocked translation save entrypoints reject with a typed retirement error; direct transcreate route returns 410 before provider or persistence. Test bytes/index unchanged.
- [ ] Remove or retire translation-reading/generation controls that conflict with English-only Bank. Preserve existing products, not forbidden new write behavior.
- [ ] Batch traversal must fail closed on malformed JSON/schema, permission/read errors and inconsistent membership. Only a truly absent empty Bank may produce complete_empty. Do not swallow corruption and report complete inventory.
- [ ] Fix single-question lookup's 10,000-record ceiling or resolve from complete snapshot; include a beyond-limit fixture.
- [ ] Verify lexical and realpath containment for all migration reads/writes, junctions/symlinks, backup roots and manifests. No live migration.
- [ ] SQLite reader must read actual database pages inside its transaction (not SELECT 1). Readers and writers in separate processes must serialize both directions; unavailable SQLite fails closed.
- [ ] Diagnose the child-process test timeout: attach listeners before messages, bounded IPC error/exit handling, explicit release barriers and child cleanup. Do not merely increase timeouts.
- [ ] Run focused suites, typecheck, scoped lint/format, zones. Then full suite when concurrent edits have stopped.

Deliver `docs/agent-coordination/handoffs/bank-english-only-transcreation-retirement.md` and update storage handoff with actual test results and release evidence.
