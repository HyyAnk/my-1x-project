# Phase 03 Review Record

## Review Identity

- Phase: 03, Mixed Topics And Bank Selection
- Reviewer: Codex, fresh-session independent review on 2026-09-07; not the implementer's self-review
- Repository: D:/1a Cursor Project/My 1x Project, current main checkout
- HEAD: 42d2ecd79c2a3e1955499764661d05446a3baf46
- Review documentation baseline fingerprint: 92023b728e078cf4d8dce4348c7cdeeb0ce5e16104722e44f8a685e27db6c6d4
- Implementation evidence: [Phase 03 implementation](phase-03-implementation.md)
- Implementation claim: claim-antigravityp03-mtqwhgiw, verified 2026-09-07T07:40:00.362Z and released 2026-09-07T07:40:03.847Z; fingerprint cb4843917023c7736ae5c67b823ec7beace456af912bd2055733c5c21101244d
- Documentation claim: claim-codexp03review-mtqxvumv

Phase 03 is the lowest implemented phase not accepted in progress. Phase 02 implementation claim claim-antigravityshortreelp02-mtqv3l7k was released at 06:44:49.754Z; its review claim claim-antigravityreviewer-mtqvu8h8 was released at 06:52:26.591Z. The prior report describes an independent reviewer, but session independence cannot be established from its actor name alone. This review is independently fresh and does not endorse that report's overbroad contract claims. Application-zone approval is recorded and its integrator claim claim-antigravityintegrator-mtqw42pu was released at 07:03:36.432Z.

The kit README and evidence README still describe an unexecuted kit. Actual code, progress and released registry records resolve that stale summary in favor of reviewing Phase 03. Unrelated monitor changes occurred during inspection; they are not Short-Reel regressions and were preserved.

## Findings First

### F03-01 [P1] UI confirmation fails before Short-Reel discrimination

- Location: apps/server/src/routes/channels.ts:137; packages/shared/src/api/channel.ts:74; apps/web/src/features/channel/components/TopicCard.tsx:170
- Reproduction: the card submits question_count 1 through channelApi. The route parses TopicConfirmInputSchema before loading the stored topic. That schema requires a minimum of 3. A fresh buildApp fixture with the actual app error handler returned HTTP 400 with a too_small issue; an isolated route probe confirmed zero topic lookups occurred.
- Expected: stored Short-Reel topic confirms to one draft; Episode counts retain their independent limits. Actual: the primary visible Short-Reel action always fails validation.
- Required correction/test: discriminate using the stored topic before applying kind-specific body rules. Add an actual HTTP test with the exact card payload, a valid stored reel topic and approved bank fixture, plus Episode minimum/maximum and spoofed-kind tests. Verify navigation, detail GET and reopen after successful confirmation.
- Disposition: blocking Phase 03 regression. Existing TP-03/TP-06 call the service directly and cannot detect this defect.

### F03-02 [P1] Missing language metadata becomes fabricated English provenance

- Location: apps/server/src/shortReel/questionSelection.ts:81 and :101; packages/shared/src/utils/languageNormalize.ts:84
- Reproduction: supply an approved supported bank record without language. The shared normalizer defaults undefined to en; selection accepts it and writes source_language en with translation_provenance source. The reviewer reproduced this with a parsed BankQuestion fixture.
- Expected: explicit English source or existing verified English translation, otherwise BANK_EMPTY/invalid source unless an approved provenance policy exists. Actual: missing provenance is silently invented. This bypasses the outstanding metadata-less-bank decision recorded in decisions.md P01-03.
- Required correction/test: validate provenance before normalization without changing Episode language behavior. Test missing, blank, unsupported language and verified translation separately; obtain explicit authority before changing live bank policy. Do not mutate the bank to make acceptance pass.
- Disposition: blocking Phase 03 regression.

### F03-03 [P1] Duplicate translation choice IDs can change the canonical answer

- Location: apps/server/src/shortReel/questionSelection.ts:119 and :144
- Reproduction: a verified English translation containing A/First, A/Changed canonical answer, B/Second is converted into a Map. The later A overwrites the earlier A; selection succeeds with Changed canonical answer. The reviewer executed this probe. Extra IDs are also ignored, and an empty English explanation falls back to the original language explanation.
- Expected: exactly one translated choice for each original ID, no duplicates or extras, and a complete English projection preserving canonical identity. Actual: malformed translation is normalized into a valid-looking source snapshot and can drift the answer.
- Required correction/test: validate the full translation boundary before projection; reject duplicate/extra/missing IDs, inconsistent translation language and absent English explanation. Add a valid verified-translation success case proving exact strings and correct ID preservation.
- Disposition: blocking Phase 03 regression.

### F03-04 [P1] Topic projection loses concurrent selections and hides write failures

- Location: apps/server/src/repository/topics.ts:220; apps/server/src/shortReel/topicConfirmation.ts:78
- Reproduction: in an isolated real repository, intercept writeJsonAtomic with a two-arrival promise barrier and concurrently call markTopicSelected for t3 and t4 in the same run. Both read the old run; after both writes, only t4 is selected. Replacing writeJsonAtomic with a throwing function makes markTopicSelected resolve rather than reject.
- Expected: serialized read-modify-write retains both selections, and failed projection remains recoverable and is reported honestly. Actual: independent confirmations overwrite sibling projection state; disk failure is swallowed by the malformed-history catch.
- Required correction/test: serialize at the topic-run boundary and distinguish parse errors from write errors. Exercise concurrent confirmations, failure between reel persistence and projection, then a new repository/process retry that returns the same reel and repairs the projection. Current TP-06 only repeats successful confirmation sequentially.
- Disposition: blocking integration dependency. The broad catch and unlocked projection predate Phase 03, but this phase explicitly requires safe reconciliation and cannot claim TP-06 passed in full.

### F03-05 [P1] Assigned slots are relabeled rather than validated

- Location: apps/server/src/tasks/parsers.ts:114; apps/server/src/tasks/handlers/textArtifactHandlers.ts:17
- Reproduction: parse five all-Episode mystery_reveal objects with unrelated theme_hint and keyword Quantum Computing. The parser silently turns the last two into reels, changes their archetypes, labels slots 1/4 keyword, and retains the unrelated theme. The reviewer executed this probe. The handler then saves the result without an assigned-slot validation/correction boundary.
- Expected: output conforms to the assigned mixed slot plan and keyword intent; bad output is rejected/corrected within a bound without replacing previous good suggestions. Actual: labels/counts can look correct while concepts contradict the assigned plan. The old parser also accepts 3-7 inputs, while saveTopicRun requires exactly five, with no phase-specific correction evidenced.
- Required correction/test: validate slot identities, required fields and provenance against the server plan, add bounded correction tests for bad split/count/archetype and mismatched keyword guidance, and inspect creative relevance. Do not treat counting origin labels as semantic evidence.
- Disposition: blocking Phase 03 integration gap, not a demand for exact-string keyword matching.

### F03-06 [P1] Prohibited legacy coercion was introduced without approval

- Location: packages/shared/src/schemas/channel.ts:109; docs/short-reel-implementation/decisions.md D-17
- Condition: TopicCandidateSchema silently inserts content_kind episode and default provenance when the discriminant is absent.
- Expected: Phase 03's explicit stop condition requires incompatible historical runs to be inventoried for an explicitly scoped reset; no silent legacy coercion. Actual: a compatibility preprocessor was deliberately introduced to keep old data/tests passing. A decision written by the implementer is not user approval to change that requirement.
- Required correction/test: remove the workaround under a repair claim, explicitly update legitimate producers/fixtures and test missing discriminants fail. Obtain scoped user approval before any reset; protect channel/bank/reference data.
- Disposition: blocking Phase 03 contract deviation; no deletion authorized by this review.

### F03-07 [P1] Required workflow and regression gates are not passing

- Location: apps/server/test/topicToEpisodePipelineE2E.test.ts:178 and :333; docs/short-reel-implementation/verification/evidence/phase-03-implementation.md:75
- Actual rerun: 23/25 tests passed across the five focused server files; two pipeline expectations still demand portrait layouts after this phase changed the Episode default to landscape. This is a phase-induced test/contract mismatch, not proof that landscape output should be reverted. The implementation evidence omitted the required pipeline file.
- Missing evidence: no draft-view tests or desktop/mobile screenshots are present in the evidence directory. AppViewRouter's 11 passing tests contain no Short-Reel case. TopicCard's four tests are existing Episode cases. The required keyword -> HTTP confirmation -> draft -> refresh/reopen workflow is not evidenced and is blocked by F03-01. No browser screenshot or touch/keyboard/reconnect workflow was performed by this reviewer; it remains not_run, not pass.
- Required correction/test: reconcile the intended Episode contract with the failing regression fixtures and preserve explicit retained behavior. Add and execute real Short-Reel route/draft tests and desktop/mobile primary-workflow verification after rebuilding/restarting. Include empty bank, slow response, retry, stale response and navigation cases.
- Disposition: blocking missing/failing required verification. Full server/web suites and full lint were not rerun here; no full-suite pass is claimed.

### F03-08 [P1] Inherited Phase 02 safety/fidelity assertions are not established

- Locations: apps/server/src/repository/shortReelStorage.ts:65; apps/server/src/utils/fs.ts:46; packages/shared/src/shortReel/shortReel.schema.ts:209; apps/server/src/repository/shortReels.ts:90
- Atomicity: Short-Reel storage calls atomicRenameWithRetry, whose exhausted transient-lock path copies over the destination. A crash/partial copy can destroy the previous file. RP-06 injects failure before rename and does not cover that branch. The repository queues are per instance; no cross-process lock or second-writer prevention was established. Passing same-instance Promise.all tests is narrower than the claimed guarantee.
- Fidelity: the source schema stores only a projection, not the original validated bank record required by contracts.md. Phase 03 selection constructs another projection/hash path instead of preserving that original record. After the bank changes, original metadata/translation evidence cannot be recovered from this snapshot alone.
- Canonical scripts: three-segment shape and standalone validateReelScript tests pass, but ShortReelRecordSchema does not invoke the source-aware validator. Passing standalone cue tests is not proof that repository mutations enforce canonical text. Dependency-result acceptance, cancellation and sibling-generation merge are not implemented/exercised here; SG-05 through SG-07 remain Phase 04 work, not passed capabilities.
- Required correction/test: return the inherited contract/storage gaps to a scoped Phase 02 repair and fresh review before downstream generation. Test exhausted rename failures preserving old bytes, multiple repository instances/processes or enforced single-writer admission, original snapshot round-trip and repository rejection of source-answer drift. Do not weaken the frozen contract merely to agree with current code.
- Disposition: inherited predecessor defects/verification gaps, not attributed as newly authored Phase 03 storage regressions. Prior accepted row is retained as historical fact, with this advancement blocker recorded explicitly.

### F03-09 [P2] Draft UI introduces layout and architecture debt

- Location: apps/web/src/features/shortReel/ShortReelStudio.tsx:20 and :109; packages/shared/src/api/channel.ts:86
- Condition: the 268-line new component owns fetching/error state and extensive inline styling. Its grid minimum is 340px inside 40px horizontal padding, exceeding a 320px viewport even before outer chrome. Header content is also unbounded. It has no retry action and labels all load errors Not Found. Newly introduced response fields use z.any rather than existing explicit contracts.
- Expected: feature hook/client boundaries, responsive source summary and accurate recoverable errors. Actual: mixed responsibilities, minimum-width overflow by inspection and untyped public fields. The visible Phase 04 implementation notice is not useful product status and promises activation in a phase whose deliverable is a service harness.
- Required correction/test: extract fetching into a focused hook, use established styling/contracts, test 1440/390/320 widths with screenshots and keyboard/touch, and test transient error -> retry without losing context. Focused ESLint currently fails on unused TopicCandidate and CircleNotch imports in topicConfirmation.ts:1 and ShortReelStudio.tsx:2.
- Disposition: required UI/static gate remains open. The documented footer credit versus English-only conflict is unresolved; this review does not invent a replacement credit or authorize non-English text.

### F03-10 [P2] Release records and concrete scope disagree

- Location: docs/agent-coordination/handoffs/short-reel-phase-03.md, Files Changed and Scope
- Registry comparison: released files include apps/server/src/repository/service.ts and apps/web/src/api/channelApi.ts, but neither is in the final plannedFiles list. They are also absent from the handoff file list. service.ts changed from its implementation baseline fingerprint; channelApi.ts was clean at that baseline and is now modified. The registry accepted their zones, but that does not satisfy this task's concrete-file ownership rule.
- Conversely, contracts.md is reported as changed by Phase 03 but matches its Phase 03 baseline hash 8fe5eb22bd1fd584b6bbb5c356727c63696958cc24c942e826de29ec18a7db16 and is absent from the release delta.
- Required correction/evidence: integrator audit of scope and a truthful corrected handoff/file ledger under a new claim. Do not retroactively claim nonexistent authorization or revert unrelated edits. The zone approval itself is present and released; this finding does not allege an unmapped application directory.
- Disposition: open coordination discrepancy; release alone is not sufficient acceptance evidence.

## Requirement Checks

| Requirement | Result                      | Current evidence                                                                                                                     |
| ----------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| SR-01       | fail                        | Dedicated draft storage and discriminator exist; actual UI confirmation fails F03-01                                                 |
| SR-02       | fail                        | TP-01/02 happy-path assertions pass; bad-slot correction and keyword integrity fail F03-05                                           |
| SR-03       | fail                        | Pagination/approved filtering pass; provenance and translated answer validation fail F03-02/03; original snapshot gap F03-08         |
| SR-13       | fail gate                   | Required Episode pipeline file has two failing assertions; contract must be reconciled without restoring title heuristics            |
| SR-15       | fail/not_run                | Focused lint fails; new UI responsive and accessibility evidence absent; footer conflict retained                                    |
| SR-16       | partial                     | Implementation/predecessor/integrator releases confirmed; concrete scope discrepancy F03-10                                          |
| SR-04/05/08 | partial, predecessor/future | 13 shared shape/helper tests pass; no generated script/Flow quality acceptance; persistence fidelity gap F03-08                      |
| SR-10       | partial/fail                | Same-instance repository CAS tests pass; topic projection concurrency fails; generation cancellation/stale/sibling tests not yet run |

TP-03 proves direct service discrimination without title heuristics; TP-04 proves bounded page traversal; TP-05 proves empty/archived/unverified examples. TP-06 only proves sequential repeat success, not its prescribed failed-projection recovery. Implementation evidence misassigns some TP descriptions; this review uses verification/test-cases.md as the test-ID authority.

## Verification Performed By Reviewer

Commands ran on 2026-09-07 approximately 07:44-07:49 UTC (14:44-14:49 Asia/Saigon), from the repository root unless stated otherwise. No paid/live Flow actions or provider calls were made.

| Command / probe                                                                                                                                                                                                                | Exit and result                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| pnpm --filter @studio/server exec vitest run test/topicSuggestionMatrix.test.ts test/topicConfirmRoute.test.ts test/topicToEpisodePipelineE2E.test.ts test/shortReelQuestionSelection.test.ts test/shortReelRepository.test.ts | 1; 23 passed, 2 failed, 5 files                                                            |
| pnpm --filter @studio/web exec vitest run src/features/channel/components/TopicCard.test.tsx src/components/AppViewRouter.test.tsx                                                                                             | 0; 15 passed, 2 files; no draft-specific case                                              |
| pnpm typecheck                                                                                                                                                                                                                 | 0; shared build and shared/server/web typechecks passed                                    |
| node --import tsx --test packages/shared/test/shortReel.test.ts                                                                                                                                                                | 0; 13 passed                                                                               |
| pnpm --filter @studio/web build                                                                                                                                                                                                | 0; rebuilt Vite production bundle                                                          |
| pnpm exec eslint apps/server/src/shortReel/questionSelection.ts apps/server/src/shortReel/topicConfirmation.ts apps/web/src/features/shortReel/ShortReelStudio.tsx packages/shared/src/api/channel.ts --no-warn-ignored        | 1; two unused-import errors                                                                |
| git diff --check                                                                                                                                                                                                               | 0; no whitespace error output                                                              |
| node scripts/agent-validate-zones.mjs --json                                                                                                                                                                                   | 0; valid, 24 zones, zero unmapped/overlapping paths                                        |
| rg -n short-reel-implementation apps packages package.json                                                                                                                                                                     | 1; zero matches, no runtime/test/manifest dependency found                                 |
| Registry history, plannedFiles, release files and current fingerprints                                                                                                                                                         | releases confirmed; F03-10 discrepancies found                                             |
| In-memory parser/schema probes via node --import tsx --input-type=module -e                                                                                                                                                    | 0; count 1 rejected; all-Episode malformed slots relabeled; missing language normalizes en |
| Fresh buildApp HTTP injection, cwd apps/server                                                                                                                                                                                 | 0 probe execution; actual request HTTP 400 on question_count 1                             |
| Selection probes, cwd apps/server                                                                                                                                                                                              | 0; missing-language accepted as English; duplicate translated A accepted with last value   |
| Real repository projection barrier and injected write failure, cwd apps/server                                                                                                                                                 | 0 probe execution; two writes leave selected [t4]; failed write resolves                   |

Diagnostic probes were executed in memory, not added as product tests. The first isolated Fastify probe lacked the application's error handler and returned 500; it was superseded by fresh buildApp's actual 400 response. An initial bank fixture lacked required domain/subtopic fields and was corrected before the successful provenance probes. Neither setup error is presented as a product regression.

The disposable app used C:/Users/AdminZ/AppData/Local/Temp/short-reel-review-ZW9iyB, copied only example templates, and isolated fixture data. Its app was closed. No persistent preview service was started. The fixture directory is retained for investigation; no live bank/channel was modified. No screenshots were available or created, and the primary browser workflow remains blocked/not_run. Product/source edits were not made by the reviewer. No deletion, retirement, archive, commit, branch, worktree or subagent was performed.

Source review covered the claimed producers/consumers and predecessor storage/schema seams. Existing portrait layout paths remain for the later controlled retirement phase; no Phase 07 deletion evidence is claimed. Existing localized strings in old shared/planner code were not reattributed as new Phase 03 text. New tests contain non-English source fixtures, so a literal all-new-text-English gate also needs explicit fixture-policy reconciliation; no language rule was silently relaxed here.

## Decision

Reject Phase 03 acceptance. Leave it blocked for repair; Phase 04 is not eligible. Passing builds and released claims do not override the broken primary HTTP action, source/translation drift, concurrent projection loss, prohibited coercion, inherited safety gaps or missing required workflow evidence.

Final project acceptance remains solely with the user. Do not delete or archive this kit.

## Progress And Handoff

- [Progress](../../progress.md)
- [Unique review handoff](../../../agent-coordination/handoffs/short-reel-phase-03-review-codex-20260907.md)
- Eligible next prompt: [Resume safely](../../prompts/resume.md), targeting Phase 03 repairs, with an explicitly scoped Phase 02 dependency repair/fresh contract review for F03-08. Do not silently expand a Phase 03 claim into frozen contracts.
- Documentation verification/release follows these completed edits; consult claim-codexp03review-mtqxvumv for the actual lifecycle result rather than treating this pre-release text as proof.
