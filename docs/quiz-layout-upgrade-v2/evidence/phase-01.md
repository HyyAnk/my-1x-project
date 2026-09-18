# Phase 01 report: Baseline and characterization

## Status

Complete

## Source and scope

- Current commit: `7f08a3ea8342a9c15a32345cf83a0673293d5023`
- Relevant dirty files before work: 263 files modified or untracked across `apps/server`, `apps/web`, `packages/shared` related to prior mascot/animation/topic history work. None of these changes were touched, stashed, or overwritten.
- Source hash drift from planning baseline: Verified against `data/source-baseline.json`. Plan validator `node docs/quiz-layout-upgrade-v2/scripts/validate-plan.mjs` passed 10/10 checks.
- Requirement IDs: R13, R14
- Files changed:
  - `docs/quiz-layout-upgrade-v2/data/baseline-fixtures.json` (new isolated synthetic English fixtures for all 7 layouts)
  - `docs/quiz-layout-upgrade-v2/scripts/capture-baseline.mjs` (measurement & snapshot capture script)
  - `docs/quiz-layout-upgrade-v2/evidence/baseline-measurements.json` (recorded bounding boxes)
  - `docs/quiz-layout-upgrade-v2/evidence/baseline-frames/*.png` (11 baseline layout screenshots)
  - `docs/quiz-layout-upgrade-v2/PROGRESS.md` (updated status)
- New files and responsibilities:
  - `data/baseline-fixtures.json`: Pure test fixtures containing synthetic English trivia for all 7 layouts + 2-choice variants.
  - `scripts/capture-baseline.mjs`: Headless Playwright script measuring live DOM boxes and capturing 1920x1080 baseline PNGs.
- Out-of-scope changes preserved:
  - Preserved all dirty worktree files in `apps/server/src/quiz/mascot/`, `apps/web/src/features/mascot/`, and `packages/shared/src/schemas/mascot.ts`.

## Implementation

- Contract changes: None (Phase 01 is read-only baseline characterization).
- Geometry/timing values: Measured baseline bounding boxes confirm old targets:
  - `media_left_choices_right` (3-choice): answers at y = 274, 442, 610 (height 132).
  - `media_left_choices_right` (2-choice): answers at y = 336, 528 (height 152).
  - `visual_choices_three`: cards at y = 253 (height 504), media height 356, viewport 432x336.
  - `visual_choices_three_pure`: cards at y = 253 (height 504), media height 504, viewport 432x484.
  - `split_versus_two`: cards at y = 253 (height 504), media height 366, viewport 622x342.
  - `verdict_true_false`: answers at y = 322, 530 (height 164).
  - `full_stack_list` (3-choice): answers at y = 275, 443, 611 (height 140).
  - `mystery_reveal`: stage at y = 253 (height 360), answer at y = 637 (height 120).
  - Thinking bar timer at y = 946 (height 84).
- UI/state transitions: Verified fonts loaded in sandbox composition (`SVN-Hello Headline`, `Fredoka`, `Baloo 2`, `Nunito`).
- Failure/retry behavior: N/A
- Plan deviations and decision IDs: None.

## Verification

| Command or workflow | Build/source | Result and exit code | Evidence |
| ------------------- | ------------ | -------------------- | -------- |
| `node docs/quiz-layout-upgrade-v2/scripts/validate-plan.mjs` | Local | Exit 0 (10/10 passed) | Planning validation console log |
| `pnpm --filter @studio/shared build` | Local | Exit 0 | Build artifacts generated cleanly |
| `pnpm --filter @studio/shared exec node --import tsx --test test/quizImageSizing.test.ts test/quizLayouts.catalog.test.ts test/quizLayouts.policy.test.ts test/timing.test.ts` | Local | Exit 0 (22 passed) | All shared geometry and timing unit tests passed |
| `pnpm --filter @studio/server exec vitest run test/quizFrameGeometry.test.ts test/quizLayoutContentGeometry.test.ts test/quizChoiceGroupRenderer.test.ts test/choiceTextFit.test.ts test/answerCardSkinStyles.test.ts --testTimeout 60000` | Local | Exit 0 (81 passed) | 5 test files, 81 tests passed |
| `pnpm --filter @studio/server exec vitest run test/quizFrameAnchors.browser.test.ts test/quizLayoutContent.browser.test.ts test/quizImageSlotSizing.browser.test.ts --testTimeout 60000` | Local | Exit 0 (70 passed) | 3 browser test files, 70 tests passed |
| `pnpm --filter @studio/web exec vitest run src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx src/features/sandbox/components/design/SandboxImageRequirements.test.tsx src/features/quizLayouts/components/QuizLayoutWireframe.test.tsx` | Local | Exit 0 (17 passed) | 3 test files, 17 tests passed |
| `node --import tsx docs/quiz-layout-upgrade-v2/scripts/capture-baseline.mjs` | Local | Exit 0 | 11 screenshots saved to `evidence/baseline-frames/`, measurements in `evidence/baseline-measurements.json` |

- Current-runtime restart/rebuild: Not needed for read-only baseline; `@studio/shared` rebuilt and verified.
- Primary workflow rerun: Captured all 11 layout fixtures in headless Playwright matching production DOM rendering.
- Browser/font/asset readiness: 4 Candy Arcade fonts successfully inlined and loaded into DOM.
- Visual inspection: Baseline screenshots inspected across all 7 layouts; verified that all current active layouts render with old coordinates.
- Known baseline-only failures: `apps/server/test/sandboxComposition.test.ts:743:28` fails due to uncommitted user changes in `apps/server/src/quiz/mascot/` (omits mascot test). Not related to layout upgrade; left untouched.
- Remaining verification: Phase 02 contract implementation.

## Gate assessment

- Gate passed: Yes
- Blocker or required approval: None
- Exact next action: Proceed to Phase 02 (`phases/02-contracts.md`).
- Safe resume instructions: Dirty worktree is clean of layout changes. All baseline measurements and images are stored in `docs/quiz-layout-upgrade-v2/evidence/`.
