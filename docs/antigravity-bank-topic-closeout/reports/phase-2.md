# Phase 2 Report: Source Policy

## Result

PASS. Phase 2 (Source Policy) complete on working copy checkout.

## Reproduction

- **T1 (Fabricated synthetic bindings in topic runs):**
  - *Fixture & Setup:* `apps/server/test/topicSourceIntegrity.test.ts` test case `"T1 reproduction: saveTopicRun does not fabricate qb_synth bindings for ordinary unbound candidates"`.
  - *Before Repair:* `saveTopicRun` in `apps/server/src/repository/topics.ts` synthesized 50 fake `qb_synth_${topic_id}_${idx+1}` bindings with constant hashes for any topic whose name/id lacked "unbound" or "legacy" and whose origin was not "discovery".
  - *Observed Failure:* An ordinary candidate saved without bindings was populated with 50 fake synthetic bindings and constant hashes.
  - *After Repair:* `saveTopicRun` strictly preserves genuine existing bindings only; unbound candidates persist with `source_bindings: undefined`.

- **T2 (Incoherent snapshot reads & missing shared eligibility enforcement):**
  - *Fixture & Setup:* `apps/server/test/topicSourceIntegrity.test.ts` test cases `"T2: resolveBoundTopicSources rejects incompatible format and non-English questions"`, `"T2: duplicate question IDs and capacity mismatches fail explicitly"`, `"T2 deferred mutation: question modified in Bank between suggestion and confirmation fails resolution"`, and `"T2 force policy: force overrides channel cooldown only"`.
  - *Before Repair:* `boundSourceResolver.ts` resolved questions individually without an atomic inventory snapshot, did not evaluate shared format/language eligibility (`evaluateEpisodeQuestionEligibility` / `evaluateShortReelQuestionEligibility`), allowed duplicate question IDs in active bindings, and allowed deferred mutations during read to pass.
  - *Observed Failure:* Non-English or format-mismatched bank questions bypassed resolution without error; duplicate IDs were counted towards capacity; mutations between suggestion and resolution were not detected coherently.
  - *After Repair:* Full ordered binding set is resolved against a single coherent snapshot (`readQuestionBankQuestionsSnapshot`). Duplicate IDs trigger `DUPLICATE_SOURCE_QUESTION_ID`, format mismatches trigger `SOURCE_QUESTION_FORMAT_MISMATCH`, non-English questions trigger `SOURCE_QUESTION_NOT_ENGLISH`, content modifications trigger `SOURCE_QUESTION_MODIFIED`, and `force` is strictly constrained to channel cooldown override only. Returned payload includes `snapshotRevision` and `snapshotToken`.

- **T3 (Bypass in direct repository.confirmTopic):**
  - *Fixture & Setup:* `apps/server/test/topicSourceIntegrity.test.ts` test case `"T3 reproduction: direct repo.confirmTopic rejects when bound questions are missing, unapproved, non-English, or modified"`.
  - *Before Repair:* `repo.confirmTopic` only checked whether `candidate.source_bindings` existed and `selectedQuestionCount <= bindings.length`. It never queried the Question Bank or verified that questions were present, approved, English, or unmodified before creating the episode and marking the topic selected.
  - *Observed Failure:* Directly calling `repo.confirmTopic` created an Episode directory and persisted `episode.json` and `sources.md` even when sources were completely missing from the Bank, unapproved, or tampered.
  - *After Repair:* `confirmTopic` in `apps/server/src/repository/topics.ts` authoritatively calls `resolveBoundTopicSources` before performing selection marks or disk writes. Any missing, unapproved, non-English, or modified source aborts immediately without side-effects.

## Implementation

- **`apps/server/src/quiz/bank/bridge/boundSourceResolver.ts`:**
  - Resolved candidate bindings against a single coherent snapshot via `repository.readQuestionBankQuestionsSnapshot({ channelId, limit: 100000, offset: 0 })`.
  - Enforced duplicate source question ID rejection across active bindings (`DUPLICATE_SOURCE_QUESTION_ID`).
  - Integrated `evaluateShortReelQuestionEligibility` and `evaluateEpisodeQuestionEligibility` for full shared eligibility checks (language=en, format, structure, cooldown).
  - Enforced that `force=true` overrides cooldown only; unapproved, modified, or structural errors remain strictly rejecting.
  - Recorded snapshot revision (`snapshotRevision`) and admission token (`snapshotToken`) in the resolution result.
- **`apps/server/src/repository/topics.ts`:**
  - Removed `qb_synth_*` fabrication, constant hashes, and heuristic naming exemptions (`isExplicitlyUnbound`) from `saveTopicRun`.
  - Integrated `resolveBoundTopicSources` into `confirmTopic`, eliminating the unvalidated bypass.
  - Persisted verified canonical question bindings, choice IDs, and correct-choice identities into `sources.md`.
- **`apps/server/test/topicSourceIntegrity.test.ts`:**
  - Added deterministic tests for T1, T2, and T3 covering unbound candidates, format mismatch, non-English sources, duplicate question IDs, capacity mismatches, deferred mutations, force policy boundaries, and bypass prevention.
- **`apps/server/test/bankTopicGeneration.test.ts`:**
  - Updated fixture setup in `enforces supported source capacity` to seed genuine approved Bank questions with authentic hashes rather than fake strings.

## Verification

- **Execution Date:** 2026-09-09
- **Commands Executed:**
  - `pnpm --filter @studio/server exec vitest run test/topicSourceIntegrity.test.ts`
    - Exit Code: 0 (6 tests passed)
  - `pnpm --filter @studio/server exec vitest run test/boundTopicConfirmation.test.ts test/topicAvailabilityRoute.test.ts`
    - Exit Code: 0 (25 tests passed)
  - `pnpm --filter @studio/server exec vitest run test/bankStorageSafety.test.ts test/bankMetadataMigration.test.ts test/boundTopicConfirmation.test.ts test/productLocalization.test.ts test/shortReelLocalization.test.ts test/shortReelConfirmationRecovery.test.ts test/topicAvailabilityRoute.test.ts test/topicSourceIntegrity.test.ts`
    - Exit Code: 0 (88 tests passed)
  - `pnpm --filter @studio/server exec vitest run test/bankTopicGeneration.test.ts`
    - Exit Code: 0 (18 tests passed)

## Remaining Work

- C1, C2, C3, C4: Phase 3 (Confirmation & Receipts). Transition to `phase-3-confirmation.md`.
- L1, L2: Phase 4 (Localization Integrity).
- U1, U2, U3: Phase 5 (Availability & UI Alignment).
- Full suite verification: Phase 6 (Acceptance Matrix).

## Safety

- All tests ran with temporary isolated storage via `mkdtemp`.
- No live Question Bank data was modified or migrated.
- Canonical Bank content remains strictly English-only with zero translation write-backs.
- Existing working copy dirty edits were preserved.
- No subagents were used; all work was executed sequentially in-session.
