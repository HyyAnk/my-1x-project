# Stage A Repair Review 01

## Review Identity

- Target: Stage A, Phase 02/03 boundary repair, F03-08 and source foundation for F03-02/03
- Date: 2026-09-07
- Reviewer: Codex, independent of implementer antigravity-p02-repair, but the same ongoing task that authored the repair plan. This is not a fresh-session review and not the implementer's self-review. No fresh-review acceptance gate is claimed satisfied.
- HEAD: 42d2ecd79c2a3e1955499764661d05446a3baf46, main-direct
- Current baseline fingerprint: 2c93867d129a611f91815ea97db76ff16400f0423e9b746a847c409bb14bd661, exactly matching implementation verification fingerprint
- Implementation claim: claim-antigravityp02repair-mtqymdzg, released 2026-09-07T08:24:27.139Z
- Review documentation claim: claim-codexstageareview-mtqzeyb1
- [Implementation evidence](phase-02-repair-01.md), [implementation handoff](../../../agent-coordination/handoffs/short-reel-phase-02-repair-01.md), [repair plan](../../../superpowers/plans/2026-09-07-short-reel-phase-02-03-repair.md)

Progress and actual source agree that Stage A awaits review; Phase 03/Stage B remains blocked. The released delta is contained in the final plannedFiles list. The implementation evidence lists some owned files that were not changed in the release delta, including shared index.ts and shortReel.test.ts; ownership is not proof of modification. No new out-of-scope release path was found for this stage. Existing unrelated dirty work was preserved.

## Findings First

### A-R01 [P1] Same-process repositories bypass CAS serialization

- Location: apps/server/src/repository/shortReelAtomicWriter.ts:55; apps/server/src/repository/service.ts:43; apps/server/src/repository/shortReels.ts:151
- Reproduction: instantiate two RepositoryService objects for one root, create a reel at revision 1, and use the existing write hook as a two-arrival barrier. Concurrently submit different model-note edits through the two repositories with expected_revision 1. Both promises fulfilled; both writes reached the barrier; final persisted revision was only 2. One acknowledged mutation was lost.
- Expected: one success and one revision conflict, or rejection of the second writer instance before mutation. Actual: process-global admission permits both instances, but their mutation queues are instance-local.
- Required repair/test: share canonical-root/reel serialization across admitted handles or reject multiple writer instances. Add barrier-driven same-process, two-repository tests for CAS and same-topic creation, alongside existing process-lock tests. A process lock alone does not close this gate.
- Disposition: blocking incomplete F03-08 repair.

### A-R02 [P1] Forged source projection and hash pass persistence validation

- Location: packages/shared/src/shortReel/shortReelSource.schema.ts:35; apps/server/src/repository/shortReels.ts:246
- Reproduction: construct a valid snapshot, retain original_question with correct_choice_id A, then change projected correct_choice_id to B, flip projected flags, set selected_answer_text to B's text, replace question_text, and use 64 zeroes as content_hash. ShortReelSourceSnapshotSchema.safeParse succeeded. replace_source_question persisted this record; reread showed original answer A, projected answer B and the zero hash.
- Expected: selected text, answer identity, provenance, timestamps and hash are derived from and checked against the validated original source/translation. Actual: schema checks projection self-consistency and original ID/archetype/status only; constructor validation is bypassable at persistence boundaries.
- Required repair/test: centralize derivation and enforce source/projection/hash consistency on create, replacement and read. Add forged question, answer, source-language, translation-verification and hash tests through real repository calls, proving old bytes/revision remain unchanged after rejection. Do not accept a caller-provided internally consistent projection as source fidelity.
- Disposition: blocking invalid contract/source-answer drift. This gap defeats the newly added cue validator because scripts can faithfully repeat a forged source.

### A-R03 [P1] Required source field breaks current producer and hides existing drafts

- Location: packages/shared/src/shortReel/shortReelSource.schema.ts:21; packages/shared/src/shortReel/shortReel.schema.ts:306; apps/server/src/shortReel/questionSelection.ts:259; apps/server/src/repository/shortReels.ts:41
- Reproduction: the current selector still emits the old projection without original_question. Rerunning its six existing tests produced three failures (TP-03, TP-04, TP-06), all missing original_question. The 20 isolated Stage A tests pass only because their fixtures use the new constructor.
- Existing data probe: write a previously valid schema_version 1 record without original_question into the isolated fixture. listShortReels returned zero records; getShortReel threw an untyped ZodError. The broad list catch silently hides the file. No actual user record was altered.
- Expected: update existing producer/consumer seams with the contract change; preserve unsupported old records with a typed incomplete-source state and explicit data decision. Actual: version 1 now has incompatible requirements, current producer is broken, and old drafts disappear from list results. Reconfirmation may mistake a hidden prior record for absence.
- Required repair/test: integrate the reviewed source constructor into the current selector under an expanded concrete claim without implementing unrelated Stage B features. Add old-v1 inventory/read tests and explicit incomplete-source handling that preserves bytes, prevents duplicate recreation and asks for migration/reset authority if needed. Do not fabricate historical provenance from the current bank or add silent legacy coercion.
- Disposition: blocking Stage A contract-integration regression, not merely the earlier Stage B HTTP-count bug. The latter remains separate and was not re-reviewed here.

### A-R04 [P1] Admission ownership and normal application release are not integrated

- Location: apps/server/src/repository/service.ts:56 and :72; apps/server/src/repository/shortReelAtomicWriter.ts:86; apps/server/src/app.ts:178
- Reasoning: close() unconditionally releases the global root lock, including when called on a different repository instance. setStorageRoot switches roots without releasing the previously admitted root. buildApp.close closes Codex/server but never calls repository.close. Admission is lazy at create/update rather than tied to an application owner; no owner identity/reference count protects an in-flight mutation from another handle's release.
- Expected: explicit owner lifetime, safe normal shutdown/root switching and no release while another owner still mutates. Actual: lock leaks until process exit on normal app shutdown/root switch, while another same-process handle can release it prematurely. Existing tests call the helper directly and do not exercise app shutdown.
- Required repair/test: bind admission/release to an explicit ownership handle and application lifecycle; drain or reject pending writes before release. Test real app close -> new child-process admission, root switch, closing a non-owner and release racing with a paused mutation. Keep raw OS/SQLite error details out of public errors (line 80 currently includes the provider message).
- Disposition: blocking writer-lifecycle verification gap; code reasoning, not a claimed observed app-shutdown probe.

### A-R05 [P1] Replay protection silently expires after 50 entries

- Location: apps/server/src/repository/shortReels.ts:269 and :94
- Reproduction: after 51 unique model-note mutations, resend advance-0 with a changed payload and the current revision. The request succeeded and incremented revision; history length was 50. Reusing that request ID with different data should have conflicted under the documented contract. Old identical requests with their original revision instead become revision conflicts after eviction.
- Creation reasoning: repeated creation returns an existing topic record before comparing payload identity, and its command hash includes generated reel ID rather than the create payload. Changed create payload with the same request ID is not rejected.
- Expected: documented replay semantics, or an explicitly reviewed bounded retention contract with safe expired-request behavior. Actual: a hardcoded cap weakens the contract while evidence broadly claims durable replay protection. Listing the cap in documentation does not establish approval or define safe behavior after expiry.
- Required repair/test: define/approve exact retention and expired-request semantics, preserve durable identity sufficient to reject conflicting reuse, and test more than 50 mutations plus create-payload conflict. Test actual child-process restart rather than only reconstructing a repository object.
- Disposition: blocking contract gap in Task A2.

### A-R06 [P1] Translation selection trusts a key despite contradictory language metadata

- Location: packages/shared/src/shortReel/shortReelSource.ts:89 and :103
- Reproduction: an original question labeled French has translations.en with language fr, verified true, valid English sentinel text and choices. createEnglishSourceSnapshot(..., verified_translation) accepts it. The key wins without validating the selected translation's declared language.
- Expected: complete verified English translation with consistent provenance metadata. Actual: contradictory metadata is accepted and reported verified_translation.
- Required repair/test: validate the chosen translation metadata and define deterministic selection among multiple English translations; reject contradictory/unverified/incomplete entries. Preserve exact selected strings: constructor currently trims source/translation question, explanation and choices at lines 80-84 and 125-129 despite exact-string fidelity requirements. Test leading/trailing whitespace without silently changing the canonical string.
- Disposition: blocking source-boundary repair gap, within A's constructor scope rather than only Stage B eligibility.

### A-R07 [P2] Actual temporary write/sync failure skips cleanup

- Location: apps/server/src/repository/shortReelAtomicWriter.ts:121
- Reasoning: writeFile/sync failure leaves the try/finally after closing the handle and skips all unlink paths below it. The advertised write-failure test injects at testWriteHook after successful write/sync/close, so it does not cover real disk-full/sync failure.
- Expected: every failed attempt cleans its own temporary file without overwriting the destination, and propagates a safe operational failure. Actual: the actual failure branch can leak partial .tmp files; cleanup proof covers a different branch.
- Required repair/test: put the whole temp-file lifetime inside cleanup-on-failure and inject real write/sync/close failures through a narrow adapter. Assert destination byte preservation, rejection and absence of that attempt's temp file. Preserve the strict no-copy behavior, which does pass the rename-exhaustion test.
- Disposition: open required fault-path gate; no data corruption from this branch was claimed observed.

### A-R08 [P2] Required static and true restart verification is missing/failing

- Locations: apps/server/test/shortReelSourcePersistence.test.ts, final test; apps/server/test/shortReelWriterSafety.test.ts, durable replay test; apps/server/src/repository/shortReels.ts:213; packages/shared/test/shortReelSource.test.ts:59
- Actual focused lint: 13 errors and one warning in five inspected production files. Includes empty catches in the new writer, unsafe JSON.parse assignments in the new segment path, unused BankQuestion import, and a never template expression. The existing line-183 unsafe clone predates this repair; new errors still fail the required gate. Five inspected source files also fail Prettier checks.
- Architecture: lock lifecycle and atomic JSON writing share one module with global test hooks/leases. shortReels.ts grew to approximately 292 lines and contains duplicate return updated at lines 276-277. shortReelSource.ts imports hashing from shortReel.schema.ts, which re-exports the constructor, creating a circular boundary instead of an independent pure helper.
- Evidence accuracy: tests titled new process/restart instantiate new RepositoryService in the same process. Only the three admission/contention/crash cases spawn workers; they do not run the persisted create/update/replay workflow in those children. No actual fresh-process primary storage workflow is evidenced. Alias test uses normalized .., not a real junction/symlink.
- English-only: new source tests include French question/explanation prose despite the plan's explicit English-sentinel fixture instruction. Replace prose with English sentinel text plus language metadata; do not relax the rule silently.
- Required repair/test: resolve new static errors and relevant inherited required gates without suppression; extract cohesive helpers, run format/lint, and add IPC-based child-process persistence/replay tests with bounded timeouts and guaranteed cleanup. Record exact runtime compatibility for unconditional node:sqlite import; this review only verified the installed Node 24.20.0 runtime, not all supported deployments.
- Disposition: required verification remains open; the handoff's no-risks assertion is unsupported.

## Requirement Checks

| Gate                                         | Result                                  | Evidence                                                                                          |
| -------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A1 original-question retention/deep clone    | partial                                 | Constructor happy-path tests pass; schema/persistence can accept forged projection A-R02          |
| A1 English/verified translation              | fail                                    | Contradictory translation language accepted A-R06                                                 |
| A1 canonical script persistence              | partial pass                            | Question/answer/segment drift tests pass against the provided source; source itself can be forged |
| A1 stale historical payload preservation     | pass in focused tests                   | Replacement retains prior stale script payload                                                    |
| A2 strict no-copy rename                     | pass in focused tests/source inspection | Exhausted rename retry preserves old bytes; actual write-failure cleanup remains open             |
| A2 process lock contention and crash release | pass, limited                           | Three helper-level child-process tests pass                                                       |
| A2 admitted writer/CAS lifecycle             | fail                                    | Two repository writers both succeed; ownership/app lifecycle incomplete                           |
| A2 replay and true process restart           | fail/not_run                            | Reuse after 50 accepted; persistence/replay child workflow not executed                           |
| Current consumers and prior records          | fail                                    | Three selection tests fail; old-v1 fixture hidden                                                 |
| Static/format                                | fail                                    | 13 lint errors, one warning; five source files unformatted                                        |
| Claim scope/release                          | pass                                    | Released delta in plannedFiles, matching reviewed fingerprint                                     |
| Fresh independent acceptance                 | not satisfied                           | Reviewer did not implement Stage A but is not a fresh session                                     |

SR-03 source fidelity and SR-10 concurrency/recovery block acceptance. Existing SC-01 through SC-06 shape/helper tests passing do not override these persistence defects. SG-05/06/07 job cancellation/stale-result/sibling-generation acceptance remain future Phase 04, not failed Stage A implementation promises and not passed capabilities. Stage A has no UI/retirement deliverable: screenshots, Flow, portrait deletion and final video acceptance are not applicable to this review.

## Verification Performed By Reviewer

Executed 2026-09-07 approximately 08:28-08:34 UTC, on the repository root unless stated. All diagnostic writes targeted C:/Users/AdminZ/AppData/Local/Temp/stage-a-review-vO3bTW, not live channel/bank data. The directory is retained for diagnosis; repository admissions were closed. An initial probe fixture omitted format and failed schema setup; it was corrected before the successful probes below and is not counted as a product bug.

| Command/probe                                                                                                                                                                                                                                                                           | Result                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| pnpm --filter @studio/shared build                                                                                                                                                                                                                                                      | exit 0                                                                                                           |
| node --import tsx --test packages/shared/test/shortReel.test.ts packages/shared/test/shortReelSource.test.ts                                                                                                                                                                            | exit 0; 21 passed                                                                                                |
| pnpm --filter @studio/server exec vitest run test/shortReelRepository.test.ts test/shortReelAtomicWriter.test.ts test/shortReelWriterSafety.test.ts test/shortReelSourcePersistence.test.ts                                                                                             | exit 0; 20 passed in 4 files                                                                                     |
| Same server command with test/shortReelQuestionSelection.test.ts added                                                                                                                                                                                                                  | exit 1; 23 passed, 3 failed in 5 files                                                                           |
| pnpm typecheck                                                                                                                                                                                                                                                                          | exit 0, shared/server/web                                                                                        |
| pnpm exec eslint apps/server/src/repository/shortReelAtomicWriter.ts apps/server/src/repository/shortReelStorage.ts apps/server/src/repository/shortReels.ts packages/shared/src/shortReel/shortReelSource.schema.ts packages/shared/src/shortReel/shortReelSource.ts --no-warn-ignored | exit 1; 13 errors, 1 warning                                                                                     |
| pnpm exec prettier --check on the same five files                                                                                                                                                                                                                                       | exit 1; five files need formatting                                                                               |
| git diff --check                                                                                                                                                                                                                                                                        | exit 0                                                                                                           |
| node scripts/agent-validate-zones.mjs --json                                                                                                                                                                                                                                            | exit 0; 24 zones, zero unmapped/overlap                                                                          |
| In-memory TS probes via node --import tsx --input-type=module -e, cwd apps/server                                                                                                                                                                                                       | exit 0: two CAS writers fulfilled at revision 2; forged answer/hash persisted; inconsistent translation accepted |
| Replay/old-record probes via same TS command mechanism, cwd apps/server                                                                                                                                                                                                                 | exit 0: changed reused request accepted after 51 mutations; old-v1 list empty and detail ZodError                |

No source/test file was written by this reviewer. Probes ran current repository/source code with controlled adapters, not copied business logic. No full suite, server production build, actual browser workflow or paid/live provider action was performed or claimed. Read-only registry/source checks established the stage scope; failed required checks remain visible.

## Decision

Reject Stage A repair 01 acceptance. Keep Stage A blocked for another bounded repair; Stage B and Phase 04 remain ineligible. Retain working improvements (no-copy rename, original record constructor, cue rejection, stale payload preservation and helper-level process lock tests) without treating them as end-to-end proof.

This rejection does not require implementation changes in the review claim. After repairs, obtain a genuinely fresh reviewer or explicit user/integrator contract acceptance. Final project acceptance is reserved for the user; no data migration/reset or kit deletion is authorized.

## Progress And Handoff

- [Progress](../../progress.md)
- [Review handoff](../../../agent-coordination/handoffs/short-reel-phase-02-repair-01-review-codex.md)
- Eligible next prompt: [Stage A repair executor](../../prompts/repair-phase-02-03.md), now reading this rejection and repairing Stage A only. Expand claims before necessary producer/lifecycle integration changes. Preserve original evidence; write a numbered repair attempt and request fresh review.
- Documentation claim verification/release follows final edits; consult claim-codexstageareview-mtqzeyb1 for actual release state.
