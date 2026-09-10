# Phase 1: Bank Safety Implementation Plan

> Execute directly and sequentially. Use test-driven repair; no subagents or commits.

Goal: failed Bank operations cannot escape the configured root or leave misleading committed state.
Architecture: retain the Bank serialization boundary; centralize safe path resolution and recoverable multi-file mutation.
Tech stack: TypeScript, Node filesystem, Vitest.
Spec: [Contract](02-contract.md).

## Files

Modify apps/server/src/repository/quiz/bank/bankIndexManager.ts, bankPathSafety.ts, bankPathResolver.ts, bankMutationEngine.ts and bankMetadataMigration.ts.
Extend apps/server/test/bankStorageSafety.test.ts and bankMetadataMigration.test.ts.
If compensation becomes shared, create apps/server/src/repository/quiz/bank/bankFileTransaction.ts for filesystem transaction state only.

## Tasks

- [ ] Add index read/recalculate tests using an external index symlink and a junction ancestor. Expect UNSAFE_PATH before outside reads/writes; compare external bytes.
- [ ] Run the new cases and confirm failure comes from current behavior, not unavailable Windows link privileges. Record capability skips explicitly.
- [ ] Apply containment checks before index reads, mkdir and writes, including previous-index reads; preserve taxonomy-only fallback policy.
- [ ] Seed redirected runtime and a stale project-local duplicate. Delete a runtime question; require success without touching the project copy. Inject index-write failure and require unchanged batch/index bytes and revision.
- [ ] Preflight the complete write set before mutation; compensate every touched file if commit fails. Do not iterate unauthorized project candidates after a runtime write.
- [ ] Inject an apply manifest write that performs the write then throws; verify batch and manifest state remain mutually consistent. Inject failure on the second rollback batch and on rollback manifest save.
- [ ] Implement a recoverable migration journal or complete preimage compensation including manifest. If compensation itself fails, preserve journal state and raise a typed recovery-required error; never report atomic success.
- [ ] Resolve configured relative paths against repository.rootDirectory. Convert malformed config/manifest/batch and drift failures to typed RepositoryError values without swallowing causes.
- [ ] Test absolute/relative roots, traversal, junction, corrupt batch, missing metadata, non-string language, interrupted apply/replay/rollback and concurrent read/write.
- [ ] Run both suites and write reports/phase-1.md with pre/post hash evidence and exact failure injection points.

Expected interface: existing RepositoryService Bank APIs remain compatible; safety errors are typed. Migration output must distinguish applied, rolled_back and recovery-required reality, not merely a saved label.
