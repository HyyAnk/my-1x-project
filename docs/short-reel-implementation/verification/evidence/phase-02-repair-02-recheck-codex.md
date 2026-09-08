# Stage A Repair 02 Recheck and Bounded Fix

## Review Identity

- Date: 2026-09-07
- Target: Stage A Repair 02, including its prior accepted review
- Reviewer: Codex, independent of the Stage A implementer but in the same ongoing task that authored the plan and earlier review. Not a fresh-session review. The small route fix below is self-reviewed, not independently accepted.
- HEAD: 42d2ecd79c2a3e1955499764661d05446a3baf46, main-direct
- Baseline: a5b11822281ae7822fc290ca04945266012a2607ae8fff94a2dc7086535f9410, matching the preceding accepted review fingerprint
- Implementation claim claim-antigravityp02repair02-mtqzn0vp released 2026-09-07T08:58:14.317Z; prior review claim claim-antigravityp02reviewer02-mtr0hvk2 released 2026-09-07T09:02:38.324Z
- Current claim: claim-codexstagearecheck-mtr0nk9r
- User scope: recheck Stage A and proactively repair minor remaining issues; no authorization inferred for a larger source-contract or lock-lifecycle redesign
- [Repair evidence](phase-02-repair-02.md), [prior accepted review](phase-02-repair-02-review.md), [plan](../../../superpowers/plans/2026-09-07-short-reel-phase-02-03-repair.md)

## Findings First

### A-C01 [P1] Incomplete-source read compatibility is also admitted for new writes

- Locations: packages/shared/src/shortReel/shortReelSource.schema.ts:324 and :383; packages/shared/src/shortReel/shortReel.schema.ts:280; apps/server/src/repository/shortReels.ts:79 and :241
- Reproduction: in an isolated RepositoryService fixture, call createShortReel with no original_question, invented question_id/question text, content_hash fake, choices A/First correct and B/Second incorrect, but selected_answer_text Unrelated answer. Creation succeeds and persists fidelity incomplete with the contradictory answer. The probe returned fidelity incomplete, answer Unrelated answer, canonical First.
- Expected: existing unverifiable records may be exposed honestly for recovery, but new creation/source replacement must require complete validated provenance and matching canonical answer. Incomplete read support is not authority to create new unverifiable products.
- Actual: the union schema is used for read, create and replacement; its incomplete branch permits arbitrary hash/provenance and does not compare selected_answer_text with the correct choice. There is no repository guard prohibiting new incomplete sources. Current script mutation checks compare cues with this unverified selected_answer_text without requiring complete fidelity.
- Required repair/test: separate read/recovery representation from complete write contracts. Preserve legacy bytes and return a typed incomplete-source state; reject incomplete creation and replacement, and reject creative-ready writes until an explicit complete-source repair. Test real create/replace/script boundaries plus legacy read/no-duplicate behavior. Do not delete legacy records, invent original bank provenance or silently weaken validation.
- Disposition: blocking source-fidelity regression/gap. This is not a cosmetic issue and was not changed under minor-fix authorization.

### A-C02 [P1] Release drops the SQLite lock while a write is still running

- Locations: apps/server/src/repository/shortReelAtomicWriter.ts:138 and :178
- Reproduction: acquire admission for owner, start runInCanonicalShortReelQueue with a deferred task, wait until it is running, and call releaseWriterAdmission without resolving that task. After the hardcoded five-second timeout, release resolves while the task is still running; isWriterAdmissionHeld is false. Observed result: running true, lockHeld false.
- Expected: draining waits for completion or fails closed while retaining exclusion; a slow write must never run without its root lock. Actual: timeout is treated as successful drain and the DB is closed unconditionally, allowing a second process to acquire while the first task can still write.
- Additional source reasoning: admission can gain new owners during a drain, but release does not recheck owners before closing. Queued-but-not-started operations are not counted in activeOperations and runTask executes even when no lease exists. These related interleavings require a coherent closing/admission policy, not just deleting the timeout.
- Required repair/test: explicit accepting/draining/closed lifecycle, reject new work during closure, account for all admitted pending operations, and retain the OS lock on drain timeout. Add deferred tests for a write exceeding five seconds, queued operations, new owner during drain and child-process contention until the actual last write completes. Do not use a time-based unlock as recovery.
- Disposition: blocking concurrency hazard; preserved for a separately scoped lifecycle repair, not represented as fixed by the route await below.

### A-C03 [P2, fixed] Storage route did not await the new async root switch

- Location: apps/server/src/routes/system.ts:90
- Cause: Repair 02 made RepositoryService.setStorageRoot asynchronous, but POST /api/storage called it without await before ensureBootstrap, task reload and configuration save. A delayed switch could bootstrap the old root and acknowledge success prematurely; a rejection escaped the request error path.
- Fix: add await to the existing call; no new abstraction or broader storage behavior change.
- Regression tests: apps/server/test/storageSwitchRoute.test.ts. A deferred switch exercises the real buildApp route/repository/bootstrap path; bootstrap must not run before root switch finishes, and subsequent bootstrap roots/HTTP response must use the new target. A rejected switch must return the existing error status and preserve previous path/configured state with no persisted new storage setting.
- Red evidence: new ordering test failed before the fix because bootstrapping occurred on the old root. Green evidence: both tests pass after the one-line fix, including a later fresh-app rerun after server rebuild.
- Limits: this fixes route sequencing, not A-C02's writer lifecycle. Existing test-only setStorageRoot callers still omit await in several older bank/pipeline files; they were not edited or run against unknown live project roots. They need scoped fixture migration before claiming the full suite passes.

## Improvements Confirmed

- Same-process multi-repository CAS test now passes using the process-wide queue during normal operation.
- Complete-source projection/answer/hash tests pass; canonical strings retain whitespace and contradictory translation metadata is rejected by the constructor.
- Producer selection now uses the source constructor: all six existing selection tests pass.
- Receipt history no longer evicts at 50 and the more-than-50 replay test passes.
- A genuine child-process persistence/replay test now passes, in addition to process contention/crash-release tests.
- No-copy rename and error cleanup tests pass; focused source lint and formatting pass.

These improvements are retained. They do not test the new incomplete-write or drain-timeout cases above. The prior accepted review is preserved as historical evidence, but its unconditional Stage B eligibility is superseded by this current recheck.

## Verification Performed

Commands ran on 2026-09-07 approximately 09:04-09:10 UTC, repository root unless specified. No Flow, paid provider, video or live bank operation was used.

| Command/check                                                                                                                                                                                                                                                       | Result                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| pnpm --filter @studio/shared build                                                                                                                                                                                                                                  | exit 0                                                                  |
| node --import tsx --test packages/shared/test/shortReel.test.ts packages/shared/test/shortReelSource.test.ts                                                                                                                                                        | exit 0; 25 passed                                                       |
| pnpm --filter @studio/server exec vitest run test/shortReelRepository.test.ts test/shortReelAtomicWriter.test.ts test/shortReelWriterSafety.test.ts test/shortReelSourcePersistence.test.ts test/shortReelQuestionSelection.test.ts                                 | exit 0; 33 passed before the bounded fix                                |
| pnpm --filter @studio/server exec vitest run test/storageSwitchRoute.test.ts                                                                                                                                                                                        | initial red: 1 failed; final green: 2 passed                            |
| pnpm typecheck                                                                                                                                                                                                                                                      | exit 0, shared/server/web                                               |
| pnpm --filter @studio/server build                                                                                                                                                                                                                                  | exit 0, after route fix                                                 |
| pnpm --filter @studio/server exec vitest run test/storageSwitchRoute.test.ts test/shortReelRepository.test.ts test/shortReelAtomicWriter.test.ts test/shortReelWriterSafety.test.ts test/shortReelSourcePersistence.test.ts test/shortReelQuestionSelection.test.ts | exit 0; 35 passed in 6 files after rebuild                              |
| Focused ESLint on five repaired source modules and separately on system.ts/storageSwitchRoute.test.ts                                                                                                                                                               | exit 0, no errors/warnings                                              |
| Focused Prettier checks on those source modules and owned route/test                                                                                                                                                                                                | exit 0                                                                  |
| git diff --check                                                                                                                                                                                                                                                    | exit 0                                                                  |
| node scripts/agent-validate-zones.mjs --json                                                                                                                                                                                                                        | exit 0; 24 zones, no unmapped/overlapping files                         |
| In-memory create probe, node --import tsx --input-type=module -e, cwd apps/server                                                                                                                                                                                   | exit 0; persisted invented incomplete source with wrong selected answer |
| In-memory deferred queue/release probe, same execution mechanism                                                                                                                                                                                                    | exit 0; release completed with running true and lockHeld false          |

The five source lint/format paths were shortReelAtomicWriter.ts, shortReelStorage.ts, shortReels.ts, shortReelSource.schema.ts and shortReelSource.ts in their established repository/shared directories. The production diff is exactly one awaited call. Test spies only delay or reject the root-switch boundary; successful tests still call the real switch/bootstrap and exercise actual HTTP configuration behavior.

Diagnostic roots retained: C:/Users/AdminZ/AppData/Local/Temp/stage-a-recheck-PVNfJv and C:/Users/AdminZ/AppData/Local/Temp/stage-a-lock-probe-WJAa14. Probes closed admissions and completed deferred work; no persistent services remain. Automated route tests clean their own temporary directories. Existing project/bank data and unrelated dirty files were not edited.

No full-suite pass, independent review of this small fix, UI screenshot, fresh-session acceptance or final user acceptance is claimed. No subagent was spawned. Current-session self-review of the owned one-line diff confirmed correct sequencing and no unnecessary behavior expansion.

## Decision

Stage A cannot currently be treated as accepted: A-C01 and A-C02 are reproducible blocking issues, not minor polish. Mark Stage A blocked for a focused repair and re-review; Stage B/Phase 04 remain ineligible. A-C03 is fixed and verified within the user's minor-fix permission.

Do not overwrite the previous review or erase its history. Do not fix the source policy or lock lifecycle under an unrelated Stage B claim. A repair executor should read this report, claim the relevant boundaries, implement failing regression tests first and request fresh independent/user-integrator acceptance afterward.

## Progress and Handoff

- [Progress](../../progress.md)
- [Handoff](../../../agent-coordination/handoffs/short-reel-stage-a-recheck-codex.md)
- Next: [repair prompt](../../prompts/repair-phase-02-03.md), targeting Stage A A-C01/A-C02, not Stage B
- Claim claim-codexstagearecheck-mtr0nk9r must be verified/released after all edits. Registry state, not this pre-release document, proves the release.
