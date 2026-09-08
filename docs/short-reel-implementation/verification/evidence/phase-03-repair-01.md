# Stage B Repair Attempt 01 Verification Evidence

## Document Metadata

- Phase: 03 Repair (Stage B)
- Date: 2026-09-07
- Agent: antigravity-p03-repair-01
- Claim ID: claim-antigravityp03repair01-mtr2ah7m
- Working Mode: main-direct on repository root (`D:\1a Cursor Project\My 1x Project`)
- Target Plan: `docs/superpowers/plans/2026-09-07-short-reel-phase-02-03-repair.md` (Stage B)
- Disposition: Complete Stage B implementation; ready for independent review. Not self-accepted.

---

## 1. Executive Summary

This repair stage addresses findings **F03-01 through F03-07, F03-09, and F03-10** identified in `docs/short-reel-implementation/verification/evidence/phase-03-review.md`. Building directly upon the independently reviewed and accepted Stage A foundation (`docs/short-reel-implementation/verification/evidence/phase-02-repair-03-self-review.md`), Stage B repairs:

1. The topic confirmation route and discriminated topic candidate union (F03-01, F03-06).
2. Question eligibility, translation validation, and channel cooldown (F03-02, F03-03).
3. Topic run selection projection concurrency and recovery (F03-04).
4. Mixed slot plan candidate validation and bounded correction retries (F03-05).
5. Responsive, decoupled, recoverable Short-Reel Draft UI (F03-07, F03-09, F03-10).

All 168 server test files (1,293 tests), 68 web test files (350 tests), shared package tests (55 tests), full monorepo typecheck, and zone validation pass with zero errors.

---

## 2. Detailed Finding Resolution

### F03-01 & F03-06: Strict Topic Contracts & Confirmation Route

- **Root Causes:**
  - `TopicConfirmInputSchema` enforced a legacy minimum question count of 3 before topic inspection, blocking Short-Reel confirmation (question count 1).
  - `TopicCandidateSchema` used prohibited `z.preprocess` coercion to inject `content_kind: "episode"` and default provenance.
- **Resolution:**
  - Removed all legacy preprocessing from `packages/shared/src/schemas/channel.ts`. `TopicCandidateSchema` is a strict `z.discriminatedUnion("content_kind", [EpisodeTopicCandidateSchema, ShortReelTopicCandidateSchema])`.
  - In `apps/server/src/routes/channels.ts`, the route loads the stored candidate _before_ schema validation to discriminate whether the request targets an Episode or a Short-Reel.
  - Short-Reel confirmation enforces `question_count: 1`, `content_kind: "short_reel"`, and ignores forged client discriminators.
  - Replaced `z.any` in `ConfirmEpisodeTopicResponseSchema` with typed `QuizV2Schema`, `DirectorPlanSchema`, and `CuratedSourceTypeSchema`.
  - Updated legacy test fixtures across `apps/server/test/` to explicitly define `content_kind: "episode" as const`, eliminating reliance on silent coercion.

### F03-02 & F03-03: Eligibility, Translation Fidelity & Cooldown

- **Root Causes:**
  - Missing language metadata was silently defaulted to English ("en") with fabricated provenance.
  - Duplicate translated choice IDs overwrote previous choices in a Map, causing canonical answer drift.
- **Resolution:**
  - Created `apps/server/src/shortReel/questionEligibility.ts` and `apps/server/src/shortReel/questionSuitability.ts`.
  - Bounded validation checks: undefined/empty/non-English source questions are rejected unless accompanied by a verified English translation with matching choice IDs, non-empty text, and consistent canonical correct choice.
  - Consumes Stage A's reviewed `createEnglishSourceSnapshot` constructor; never fabricates language or mutates bank state.
  - Pure scoring function breaks ties deterministically by question ID.

### F03-04: Durable Topic Selection Projection

- **Root Causes:**
  - Concurrent `markTopicSelected` calls performed uncoordinated read-modify-writes, causing the latter write to overwrite earlier selections. Swallowed write errors as malformed history.
- **Resolution:**
  - Created `apps/server/src/repository/topicSelectionProjection.ts` with `serializeTopicRunOperation`.
  - Topic run file reads and writes are serialized per directory queue.
  - `confirmShortReelTopic` checks for existing drafts and repairs incomplete projections idempotently before reporting success.

### F03-05: Assigned Mixed Slot Plan Validation

- **Root Causes:**
  - Model suggestions were relabeled rather than validated against the channel's assigned slot matrix (Slots 1-3 Episode, Slots 4-5 Short-Reel).
- **Resolution:**
  - Created `apps/server/src/context/topicCandidateValidator.ts`. Decomposed helper functions maintain complexity under 30.
  - `validateTopicCandidateSlots` validates that candidates strictly conform to the 3:2 layout, archetype constraints, and keyword steerage (Slots 1 and 4 when keyword hint is present).
  - Integrated bounded 1-attempt correction retry in `apps/server/src/tasks/runtime.ts`, `codexRunner.ts`, and `taskDelegates.ts`. On failure, previous accepted suggestions remain intact.

### F03-07, F03-09 & F03-10: Recoverable Responsive Draft UI & Scope Reconciliation

- **Root Causes:**
  - `ShortReelStudio.tsx` combined state fetching, layout, and styling with a fixed 900px minimum width, exceeding small viewports and lacking retry capability.
  - Coordination handoff recorded scope deviations (`service.ts`, `channelApi.ts`).
- **Resolution:**
  - Extracted state management into `apps/web/src/features/shortReel/hooks/useShortReelDraft.ts` with explicit discriminated states (`loading`, `ready`, `not_found`, `error`) and `retry()`.
  - Extracted source presentation into `apps/web/src/features/shortReel/components/ShortReelSourceCard.tsx`.
  - Replaced inline styling with responsive `ShortReelStudio.css` supporting viewports from desktop (1440px) to mobile (320px).
  - Cleaned all unused imports and satisfied ESLint and formatting standards across all touched files.

---

## 3. Test & Verification Evidence

| Suite / Check                     | Command                                                                                                                                         | Result                                          |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------- |
| **Shared Build**                  | `pnpm --filter @studio/shared build`                                                                                                            | PASSED (0 errors)                               |
| **Shared Layout Policy**          | `pnpm --filter @studio/shared test`                                                                                                             | PASSED (30 tests)                               |
| **Shared Short-Reel Contracts**   | `node --import tsx --test packages/shared/test/shortReel.test.ts packages/shared/test/shortReelSource.test.ts`                                  | PASSED (25 tests)                               |
| **Short-Reel Server Test Suites** | `pnpm --filter @studio/server exec vitest run test/shortReel*.test.ts test/topicCandidateValidation.test.ts test/topicSuggestionMatrix.test.ts` | PASSED (12 test suites, 80 tests)               |
| **Repository Invalidation**       | `pnpm --filter @studio/server test -- test/quizInvalidation.test.ts test/repository.test.ts`                                                    | PASSED (9 tests)                                |
| **Task Lifecycle & Progress**     | `pnpm --filter @studio/server test -- test/tasks.test.ts test/hyperframesProgress.test.ts`                                                      | PASSED (22 tests)                               |
| **Full Server Test Suite**        | `pnpm --filter @studio/server test`                                                                                                             | PASSED (168 test files, 1,293 tests)            |
| **Web Short-Reel & Topic Cards**  | `pnpm --filter @studio/web test -- src/features/shortReel/ShortReelStudio.test.tsx src/features/channel/components/TopicCard.test.tsx`          | PASSED (8 tests)                                |
| **Web Task Progress Panel**       | `pnpm --filter @studio/web test -- src/components/TaskProgressPanel.test.tsx`                                                                   | PASSED (2 tests)                                |
| **Full Web Test Suite**           | `pnpm --filter @studio/web test`                                                                                                                | PASSED (68 test files, 350 tests)               |
| **Web Production Build**          | `pnpm --filter @studio/web build`                                                                                                               | PASSED (Vite production build)                  |
| **Monorepo Typecheck**            | `pnpm typecheck`                                                                                                                                | PASSED (0 errors across all 3 packages)         |
| **Lint Check**                    | `pnpm exec eslint --pass-on-unpruned-suppressions ...`                                                                                          | PASSED (0 warnings, 0 errors)                   |
| **Diff & Syntax Hygiene**         | `git diff --check`                                                                                                                              | PASSED (clean, 0 whitespace errors)             |
| **Zone Ownership Validation**     | `node scripts/agent-validate-zones.mjs --json`                                                                                                  | PASSED (valid: true, 0 unmapped, 0 overlapping) |

---

## 4. Modified & Created Files Inventory

### Packages Shared

- `packages/shared/src/schemas/channel.ts`
- `packages/shared/src/api/channel.ts`
- `packages/shared/src/shortReel/shortReel.types.ts`
- `packages/shared/test/shortReel.test.ts`
- `packages/shared/test/shortReelSource.test.ts`

### Server Implementation & Tests

- `apps/server/src/routes/channels.ts`
- `apps/server/src/routes/shortReels.ts`
- `apps/server/src/context/topicMatrixPlanner.ts`
- `apps/server/src/context/topicCandidateValidator.ts` (NEW)
- `apps/server/src/tasks/parsers.ts`
- `apps/server/src/tasks/runtime.ts`
- `apps/server/src/tasks/codexRunner.ts`
- `apps/server/src/tasks/taskDelegates.ts`
- `apps/server/src/tasks/manager.ts`
- `apps/server/src/repository/topics.ts`
- `apps/server/src/repository/topicSelectionProjection.ts` (NEW)
- `apps/server/src/shortReel/topicConfirmation.ts`
- `apps/server/src/shortReel/questionSelection.ts`
- `apps/server/src/shortReel/questionEligibility.ts` (NEW)
- `apps/server/src/shortReel/questionSuitability.ts` (NEW)
- `apps/server/test/shortReelRoutes.test.ts` (NEW)
- `apps/server/test/shortReelQuestionEligibility.test.ts` (NEW)
- `apps/server/test/shortReelQuestionSelection.test.ts`
- `apps/server/test/shortReelConfirmationRecovery.test.ts` (NEW)
- `apps/server/test/topicCandidateValidation.test.ts` (NEW)
- `apps/server/test/topicSuggestionMatrix.test.ts`
- `apps/server/test/topicToEpisodePipelineE2E.test.ts`
- `apps/server/test/context.test.ts`
- `apps/server/test/questionBankRoute.test.ts`
- `apps/server/test/repository.test.ts` and legacy fixture updates across 25 server test files.

### Web Feature & UI

- `apps/web/src/features/shortReel/hooks/useShortReelDraft.ts` (NEW)
- `apps/web/src/features/shortReel/components/ShortReelSourceCard.tsx` (NEW)
- `apps/web/src/features/shortReel/ShortReelStudio.tsx`
- `apps/web/src/features/shortReel/ShortReelStudio.css` (NEW)
- `apps/web/src/features/shortReel/ShortReelStudio.test.tsx` (NEW)
- `apps/web/src/features/channel/components/TopicCard.test.tsx`
- `apps/web/test/helpers/shortReelFixture.ts` (NEW)

---

## 5. Next Steps & Review Handoff

In accordance with `AGENTS.md` and the repair plan constraints:

1. The active claim `claim-antigravityp03repair01-mtr2ah7m` will be verified with the evidence herein and released.
2. The implementer must NOT self-accept Stage B or proceed automatically to Phase 04.
3. An independent review must evaluate Stage B Repair Attempt 01 against findings F03-01 through F03-10.
