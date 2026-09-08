# Stage A Repair 03 Evidence

## Identity and Scope

- Date: 2026-09-07
- Agent: codex-stage-a-final-repair
- Scope: user-authorized fixes for A-C01 and A-C02 from [Repair 02 recheck](phase-02-repair-02-recheck-codex.md)
- HEAD: 42d2ecd79c2a3e1955499764661d05446a3baf46; main-direct
- Baseline fingerprint: 560bc9e337d48f6b72bcbf0a196cf7519da574042ee5f0b9482e57f598231258
- Claim: claim-codexstageafinalrepair-mtr1d2x4
- Review identity: implementer self-review only, not independent/fresh review

## Changes and Boundaries

### A-C01: Complete-source new writes

- Shared initial constructor and replacement edit schema now require `CompleteShortReelSourceSnapshotSchema`; legacy read union is unchanged.
- `shortReelSourcePolicy.ts` provides typed `INCOMPLETE_SOURCE`/`INVALID_SOURCE` validation at repository boundaries. New creation validates provenance before writing; repeated confirmation of an existing topic returns the existing record without fabrication or duplicate creation.
- Script/segment/references/cover/publishing writes require complete current source. Model notes remain editable; explicit complete replacement enables recovery. Rejected writes preserve bytes and revision.
- No live source was changed, no incomplete record was migrated, and no old bank provenance was inferred.

### A-C02: Lease-safe draining

- Extracted admission/lifecycle into `shortReelWriterAdmission.ts`, queueing into `shortReelMutationQueue.ts`, leaving the atomic writer focused on temporary files/rename.
- Pending operations are counted synchronously at submission before a task's callback begins. Each reservation is tied to an owner and completed exactly once in finally, including failed operations.
- A closing owner cannot admit more work. Other existing owners can proceed; the root lock remains held. Final-owner/root shutdown drains all accepted queued/running work and rejects additional admission. The five-second force-release timeout is removed.
- No lease means no execution. SQLite closes only after the final pending operation settles; a failed close remains fail-closed. Root-wide release retains backwards-compatible helper shape but drains all owners rather than force-unlocking.
- Repository close/switch state blocks new Short-Reel submissions. Root switch waits for this owner's pending operations before changing roots. `serviceId` and async release are explicit in RepositoryRuntime, removing the unchecked owner cast.
- A genuinely stuck operation can keep shutdown pending. This is intentional safety behavior; do not restore timeout unlock. Work cancellation or terminating its process is a separate recovery action.

## Owned Files

- packages/shared/src/shortReel/shortReel.schema.ts
- apps/server/src/repository/shortReels.ts
- apps/server/src/repository/shortReelSourcePolicy.ts
- apps/server/src/repository/shortReelAtomicWriter.ts
- apps/server/src/repository/shortReelWriterAdmission.ts
- apps/server/src/repository/shortReelMutationQueue.ts
- apps/server/src/repository/service.ts
- apps/server/src/repository/runtime.ts
- apps/server/test/shortReelCompleteSourceWrites.test.ts
- apps/server/test/shortReelDrainLifecycle.test.ts
- apps/server/test/helpers/shortReelRepairFixture.ts
- docs/short-reel-implementation/contracts.md
- docs/short-reel-implementation/decisions.md
- docs/short-reel-implementation/progress.md
- docs/short-reel-implementation/verification/evidence/phase-02-repair-03.md
- docs/agent-coordination/handoffs/short-reel-phase-02-repair-03.md

Pre-existing dirty files were edited only inside the concrete claim. The previous storage route await fix and unrelated monitor/UI changes were preserved. No branch/worktree, commit, subagent, new dependency, Flow call, paid provider action or kit removal occurred. Work was sequential because source/storage contracts and exclusive ownership overlap; no independent reviewer activity is fabricated.

## Red/Green and Verification

Commands ran from the repository root on 2026-09-07 approximately 09:28-09:38 UTC, Node 24.20.0. Fixtures used test-owned temporary roots and real repositories. New child probes use bounded process execution and close their admission before exit. Tests clean their own temporary fixture paths; no live channel/bank data was used.

| Check                                                                                                        | Result                                                                                                         |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Initial new regression tests: shortReelCompleteSourceWrites and shortReelDrainLifecycle                      | exit 1; six intended failures before implementation (four incomplete-write cases, two premature-release cases) |
| Final new regression tests                                                                                   | exit 0; 11 passed (4 complete-source, 7 lifecycle)                                                             |
| pnpm --filter @studio/shared build                                                                           | exit 0                                                                                                         |
| node --import tsx --test packages/shared/test/shortReel.test.ts packages/shared/test/shortReelSource.test.ts | exit 0; 25 passed                                                                                              |
| pnpm typecheck                                                                                               | exit 0; shared/server/web                                                                                      |
| pnpm --filter @studio/server build                                                                           | exit 0                                                                                                         |
| pnpm --filter @studio/web build                                                                              | exit 0                                                                                                         |
| Final focused server suite after rebuild, command below                                                      | exit 0; 56 passed in 10 files                                                                                  |
| ESLint across the 11 owned source/test files                                                                 | exit 0; no warnings/errors                                                                                     |
| Source/test Prettier check                                                                                   | final formatting checked after shared import cleanup                                                           |
| git diff --check                                                                                             | exit 0                                                                                                         |
| node scripts/agent-validate-zones.mjs --json                                                                 | exit 0; 24 zones, no unmapped/overlapping paths                                                                |
| rg -n short-reel-implementation apps packages package.json                                                   | no matches; no runtime/test kit dependency found                                                               |

```powershell
pnpm --filter @studio/server exec vitest run test/shortReelCompleteSourceWrites.test.ts test/shortReelDrainLifecycle.test.ts test/shortReelRepository.test.ts test/shortReelWriterSafety.test.ts test/shortReelSourcePersistence.test.ts test/shortReelAtomicWriter.test.ts test/shortReelQuestionSelection.test.ts test/storageSwitchRoute.test.ts test/repository.test.ts test/topicConfirmRoute.test.ts
```

New lifecycle cases cover: simulated time beyond five seconds; synchronous reservation before callback entry; two queued operations; rejection of new owner/work while draining; another process blocked during drain then admitted afterward; non-owner release; one closing owner while another remains active; failed task followed by successful queued task; root switch with queued real repository mutations and rejection of new writes; closed repository refusing admission.

New source cases cover constructor/replacement schema rejection, repository creation and replacement rejection, byte preservation, retained legacy read/list/idempotent lookup, rejected script/segment/publishing writes, and explicit valid replacement followed by a ready script. Existing tests additionally exercise complete projection/hash rejection, source roundtrip, no-copy failure, CAS, replay beyond 50 mutations, process crash release and actual fresh-process persistence/replay.

Intermediate setup issues were resolved without weakening tests: Vite's old transform required the established createRequire node:sqlite loading pattern; the complete source schema needed an explicit barrel export; root-wide helper cleanup now drains all owners for existing callers. None of these setup failures is counted as a behavioral red test. Final checks use rebuilt shared exports.

## Self-review and Limits

- Inspected source/queue/admission responsibilities, owner IDs, close ordering, exception cleanup, exports and contract consistency. New focused modules avoid growing the old atomic writer into a combined lease/queue/file implementation.
- The read schema still accepts incomplete historical records deliberately. New write gates must also be used by future generation/export services; this repair does not create Phase 04 jobs or claim their safety tests passed.
- The low-level atomic writer remains a storage adapter; business provenance enforcement is in the constructor/edit/repository boundaries, not hidden in raw filesystem writing.
- Full server/web suites were not run; older bank/pipeline fixtures reuse configured project roots and omit await on async setStorageRoot. This task does not claim those unrelated/deferred gates passed or modify their live storage behavior. Focused repository, Episode confirmation, source selection and storage-route regressions passed.
- No UI changes/screenshots or manual Flow acceptance were performed. No automatic source-data repair is authorized by these tests.

## Status and Next Action

A-C01 and A-C02 implemented and verified by the implementing agent. Stage A is ready for independent review, not accepted. Stage B and Phase 04 remain blocked until the required fresh review or explicit user/integrator acceptance.

Read this evidence, the current diff, [contract update](../../contracts.md), [progress](../../progress.md) and [handoff](../../../agent-coordination/handoffs/short-reel-phase-02-repair-03.md). Verify/release this claim after all edits; registry state is authoritative for the release. Preserve previous failed evidence and the kit.
