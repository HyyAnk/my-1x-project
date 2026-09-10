# Phase 3 Report: Confirmation Recovery

## Result

PASS. Phase 3 (Confirmation Recovery) complete on working copy checkout.

## Reproduction

- **C1 (Premature completed receipt and empty artifact fallback during replay):**
  - *Fixture & Setup:* `apps/server/test/confirmationRecoveryFindings.test.ts` test cases `"C1: Episode confirmation failure during appendQuestionHistory leaves preparing receipt and reconciles on retry"` and `"C1 artifact validation: completed Episode replay rejects if quiz or director plan is missing or empty"`.
  - *Before Repair:* In `questionBankToQuizBridge.ts`, `recordConfirmationCompletion` saved the receipt with `status: "completed"` prior to invoking `appendQuestionHistory`. If history write failed, the receipt remained marked completed. On subsequent replay, `handleExistingConfirmationReceipt` substituted empty fallback objects (`quiz: { questions: [] }`, `director_plan: { scenes: [] }`) when files were missing or corrupt, returning false success.
  - *Observed Failure:* An injected `appendQuestionHistory` failure left a receipt marked `"completed"`. When replayed, missing or corrupt artifacts were silently replaced with empty structures instead of failing explicitly.
  - *After Repair:* `appendQuestionHistory`, `markTopicSelected`, and `updateChannel` are executed before marking receipt `"completed"`. Completed replay validates required quiz and director plan artifacts, throwing `CONFIRMATION_PRODUCT_CORRUPT` if missing or empty, and idempotently reconciles question history.

- **C2 (Short-Reel creation before preparing receipt & legacy replay without localization):**
  - *Fixture & Setup:* `apps/server/test/confirmationRecoveryFindings.test.ts` test case `"C2: Short-Reel legacy replay without valid localization rejects rather than marking completed"`.
  - *Before Repair:* In `shortReel/topicConfirmation.ts`, `createShortReel` was called before saving the `preparing` receipt. If writing the preparing receipt failed, an unreceipted reel remained discoverable on disk. In legacy replay, `getShortReelByTopic` adopted the reel and marked it completed without checking whether `localization.json` existed or was valid.
  - *Observed Failure:* An unreceipted reel with no localization artifact was returned as completed success without error.
  - *After Repair:* Identity is reserved upfront (`reservedReelId`), and a durable `preparing` receipt is persisted before creating the Short-Reel record on disk. Discovered unreceipted legacy reels require a valid localization artifact (`loadShortReelLocalizationArtifact`), throwing `CONFIRMATION_PRODUCT_INCOMPLETE` if missing or invalid.

- **C3 (Preparing retry blocked by own cooldown):**
  - *Fixture & Setup:* `apps/server/test/confirmationRecoveryFindings.test.ts` test case `"C3: Short-Reel preparing retry recovers admitted source without being blocked by its own cooldown"`.
  - *Before Repair:* If completed receipt write failed after question history was recorded, the source question was placed in 30-day channel cooldown. On retry, `executeConfirmShortReelTopic` called `resolveBoundTopicSources` with `force: undefined`, which evaluated cooldown and threw `SOURCE_QUESTION_IN_COOLDOWN`, blocking recovery.
  - *Observed Failure:* Retrying a preparing Short-Reel confirmation failed with `SOURCE_QUESTION_IN_COOLDOWN`.
  - *After Repair:* When recovering an existing `preparing` receipt, `force: true` is passed to `resolveBoundTopicSources`, permitting admitted work to recover the reserved identity and source without being blocked by its own cooldown.

- **C4 (Episode confirmation candidate defaults and options fingerprinting):**
  - *Fixture & Setup:* `apps/server/test/confirmationRecoveryFindings.test.ts` test case `"C4: Episode confirmation establishes effective defaults from candidate before fingerprinting"`.
  - *Before Repair:* `executeEpisodeConfirmation` computed `incomingOptions` using hardcoded defaults (`question_count: 3`, `visual_style: "mixed"`) before loading the topic candidate, ignoring candidate default attributes (e.g. `question_count: 5`, `visual_style: "flat_vector"`).
  - *Observed Failure:* Confirmation with omitted count and style used 3 instead of candidate's 5, and fingerprinted the wrong options.
  - *After Repair:* Topic candidate is loaded and validated upfront (`findAndValidateTopicCandidate`). Effective options are established from candidate defaults (`topic.question_count`, `topic.visual_style`) before fingerprinting, ensuring options consistency across replays and conflicts.

## Implementation

- **`apps/server/src/repository/runtime.ts` & `apps/server/src/repository/shortReels.ts`:**
  - Extended `createShortReel` signature and implementation to accept an optional `reelId?: string` parameter, enabling durable identity reservation before disk writes.
- **`apps/server/src/shortReel/topicConfirmation.ts`:**
  - In `executeConfirmShortReelTopic`:
    - Validated `loadShortReelLocalizationArtifact` during completed receipt replay (`CONFIRMATION_PRODUCT_CORRUPT` if missing).
    - Idempotently reconciled question history and topic selected projection on replay.
    - Required complete localization for legacy unreceipted reels (`CONFIRMATION_PRODUCT_INCOMPLETE` if missing).
    - Detected `isPreparingRetry = existingReceipt?.status === "preparing"` and passed `force: isPreparingRetry` to `resolveBoundTopicSources`.
    - Persisted durable `preparing` receipt with `reservedReelId` before calling `createShortReel`.
    - Persisted `completed` receipt only after localization, question history, and topic selection succeeded.
- **`apps/server/src/quiz/bank/questionBankToQuizBridge.ts`:**
  - In `executeEpisodeConfirmation`:
    - Loaded `findAndValidateTopicCandidate` upfront to establish true effective options from candidate defaults.
    - Passed `force: Boolean(input.force || isPreparingRetry)` to `resolveBoundTopicSources`.
  - In `recordConfirmationCompletion`:
    - Reordered operations so `appendQuestionHistory`, `markTopicSelected`, and channel/database updates succeed before persisting `status: "completed"` receipt.
  - In `handleExistingConfirmationReceipt`:
    - Validated that `existingQuiz` (with questions) and `existingDirectorPlan` (with beats) exist and are non-empty, throwing `CONFIRMATION_PRODUCT_CORRUPT` instead of substituting empty fallback objects.
    - Idempotently reconciled missing question history and topic selection projection.
- **`apps/server/test/confirmationRecoveryFindings.test.ts`:**
  - Created exhaustive regression tests for C1, C2, C3, and C4, including failure injections, artifact corruption, own-cooldown bypass on retry, candidate default establishment, three-way simultaneous requests, simultaneous conflicting options, and separate repository instance replay on the same root.

## Verification

- **Execution Date:** 2026-09-09
- **Commands Executed:**
  - `pnpm --filter @studio/server exec vitest run test/confirmationRecoveryFindings.test.ts`
    - Exit Code: 0 (8 tests passed)
  - `pnpm --filter @studio/server exec vitest run test/bankStorageSafety.test.ts test/bankMetadataMigration.test.ts test/topicSourceIntegrity.test.ts test/boundTopicConfirmation.test.ts test/shortReelConfirmationRecovery.test.ts test/shortReelLocalization.test.ts test/topicAvailabilityRoute.test.ts test/bankTopicGeneration.test.ts test/confirmationRecoveryFindings.test.ts`
    - Exit Code: 0 (103 tests passed across 9 test files)

## Remaining Work

- L1, L2: Phase 4 (Localization Integrity). Transition to `phase-4-localization.md`.
- U1, U2, U3: Phase 5 (Availability & UI Alignment).
- Acceptance Matrix: Phase 6 (`phase-6-acceptance.md`).

## Safety

- All tests used isolated temporary directories via `mkdtemp`.
- Zero modification or migration applied to live Bank data.
- Working copy dirty edits preserved.
- Zero subagents spawned; execution conducted directly in session.
