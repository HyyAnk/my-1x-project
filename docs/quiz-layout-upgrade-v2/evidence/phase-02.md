# Phase 02 report: Shared geometry and sizing contracts

## Status

Complete

## Source and scope

- Current commit: `7f08a3ea8342a9c15a32345cf83a0673293d5023`
- Relevant dirty files before work: None from layout upgrade; dirty files in unrelated mascot/animation areas were preserved intact.
- Source hash drift from planning baseline: Verified.
- Requirement IDs: R01, R02, R03, R04, R05, R06, R08, R12
- Files changed:
  - `packages/shared/src/quizLayoutGeometry/types.ts` (new typed contracts for rectangles, dimensions, slots, and choice variants)
  - `packages/shared/src/quizLayoutGeometry/frame.ts` (new fixed frame anchors: question, timer, counter, brand, fact dock)
  - `packages/shared/src/quizLayoutGeometry/choiceGeometry.ts` (new pure functions: `createStackedRows`, `createColumns`)
  - `packages/shared/src/quizLayoutGeometry/layouts.ts` (new canonical layout geometry definitions for all 7 landscape layouts)
  - `packages/shared/src/quizLayoutGeometry/index.ts` (barrel export)
  - `packages/shared/src/quizImageSizing/geometry.ts` (derived `CANONICAL_IMAGE_SLOT_DEFINITIONS` from `QUIZ_LAYOUT_GEOMETRY`)
  - `packages/shared/src/quizLayouts.catalog.ts` (re-exported `QUIZ_LANDSCAPE_LAYOUT_IDS`, updated asset metrics to target specs)
  - `packages/shared/src/index.ts` (exported `quizLayoutGeometry`)
  - `packages/shared/test/quizLayoutGeometry.test.ts` (new pure unit tests for layout geometry)
  - `packages/shared/test/quizImageSizing.test.ts` (updated slot viewports and target ratio recommendations)
  - `packages/shared/test/quizLayouts.catalog.test.ts` (updated catalog assertions to target metrics)
  - `apps/server/src/quiz/render/layouts/layoutContentGeometry.ts` (derived from `QUIZ_LAYOUT_GEOMETRY`)
  - `apps/server/src/quiz/render/layouts/imageSlotStyles.ts` (added mystery reveal slot CSS variables)
  - `apps/server/test/quizLayoutContentGeometry.test.ts` (updated to assert target coordinates)
  - `docs/quiz-layout-upgrade-v2/PROGRESS.md` (updated status)
- New files and responsibilities:
  - `packages/shared/src/quizLayoutGeometry/`: Owns all immutable target rectangles, dimensions, viewports, and variant positions for all seven layouts without importing catalog or server code.
- Out-of-scope changes preserved:
  - Unrelated mascot and topic history files preserved.

## Implementation

- Contract changes:
  - Added `QuizRect`, `QuizDimensions`, `QuizImageFit`, `QuizImageSlotSpec`, `QuizChoiceVariantGeometry`, `QuizLayoutGeometry`, `QuizFixedFrameGeometry`.
  - Defined all 7 layouts in `QUIZ_LAYOUT_GEOMETRY`.
  - Re-exported `QUIZ_LANDSCAPE_LAYOUT_IDS` from `quizLayoutGeometry` to eliminate circular dependency risk.
- Geometry/timing values:
  - `media_left_choices_right`: hero 720x570, viewport 696x546 (4:3), 3-choice rows at y=304/472/640, 2-choice rows at y=366/558.
  - `visual_choices_three`: media 452x411, viewport 432x391 (1:1, recommended 648x648), answer top 685, height 104, 104px badge, 86px text.
  - `visual_choices_three_pure`: media 452x564, viewport 432x544 (3:4, recommended 648x864), badge at y=773, center y=817.
  - `split_versus_two`: media 646x421, viewport 622x397 (16:9, recommended 1152x648), answer at y=684, height 122, no letter badges.
  - `verdict_true_false`: hero 820x565, viewport 800x545 (4:3, recommended 1216x912), answers at y=349.5 and 557.5, height 164.
  - `full_stack_list`: 3-choice at y=275/458/641, 2-choice at y=329/548.
  - `mystery_reveal`: stage 920x540, slot 880x500, viewport 880x495 (16:9, recommended 1408x792), answer at y=890, height 120.
- UI/state transitions: N/A
- Failure/retry behavior: Validated in tests: invalid geometry and empty candidate sets safely return error objects.
- Plan deviations and decision IDs: None.

## Verification

| Command or workflow | Build/source | Result and exit code | Evidence |
| ------------------- | ------------ | -------------------- | -------- |
| `pnpm --filter @studio/shared build` | Local | Exit 0 | Clean TypeScript build of shared package |
| `pnpm --filter @studio/shared exec node --import tsx --test test/quizLayoutGeometry.test.ts test/quizImageSizing.test.ts test/quizLayouts.catalog.test.ts test/quizLayouts.policy.test.ts test/timing.test.ts` | Local | Exit 0 (32 passed) | All 32 shared unit tests passed |
| `pnpm --filter @studio/server exec vitest run test/quizLayoutContentGeometry.test.ts` | Local | Exit 0 (8 passed) | Server layout geometry adapter verified |
| `pnpm --filter @studio/server exec vitest run test/quizFrameGeometry.test.ts test/quizLayoutContentGeometry.test.ts test/quizChoiceGroupRenderer.test.ts test/choiceTextFit.test.ts test/answerCardSkinStyles.test.ts --testTimeout 60000` | Local | Exit 0 (81 passed) | 5 server test files, 81 tests passed |
| `pnpm --filter @studio/server typecheck` | Local | Exit 0 | Full typecheck on server package passed |

- Current-runtime restart/rebuild: `@studio/shared` rebuilt and consumed by server tests.
- Primary workflow rerun: Tested image sizing policy against all 6 target layouts and verified exact recommended dimensions and aspect ratios.
- Browser/font/asset readiness: N/A (pure contract phase).
- Visual inspection: N/A.
- Known baseline-only failures: `apps/server/test/sandboxComposition.test.ts:743:28` (unrelated uncommitted mascot change).
- Remaining verification: Phase 03 frame anchors and fact dock implementation.

## Gate assessment

- Gate passed: Yes
- Blocker or required approval: None
- Exact next action: Proceed to Phase 03 (`phases/03-frame.md`).
- Safe resume instructions: Single source of truth for geometry and sizing contracts is active in `packages/shared/src/quizLayoutGeometry/`.
