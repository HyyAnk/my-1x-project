# Phase 03 report: Frame anchors, fact dock and collision policy

## Status

Complete

## Source and scope

- Current commit: `7f08a3ea8342a9c15a32345cf83a0673293d5023`
- Relevant dirty files before work: None from layout upgrade; dirty files in unrelated mascot/animation areas were preserved intact.
- Source hash drift from planning baseline: Verified.
- Requirement IDs: R07, R14
- Files changed:
  - `apps/server/src/quiz/render/frame/landscapeFrameGeometry.ts` (updated `LANDSCAPE_FRAME.fact` to y=886, bottom=1042, bottom clearance=38px; added `LAYOUT_ARENA_GEOMETRY`)
  - `apps/server/src/quiz/render/frame/quizFrameStyles.ts` (added per-layout arena heights: 570, 536, 608, 553, 565, 528, 757)
  - `apps/server/src/quiz/render/scene/renderQuizScenePhaseParts.ts` (extracted shared phase markup & visibility ownership, supporting `omitMysteryFactCard`)
  - `apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts` (integrated `renderQuizScenePhaseParts`)
  - `apps/server/src/quiz/render/sandboxComposition.ts` (integrated `renderQuizScenePhaseParts`)
  - `apps/server/test/quizFrameGeometry.test.ts` (updated fact y=886, bottom=1042, bottom clearance=38px; added arena geometry assertions)
  - `docs/quiz-layout-upgrade-v2/PROGRESS.md` (updated Phase 03 status)
- New files and responsibilities:
  - `apps/server/src/quiz/render/scene/renderQuizScenePhaseParts.ts`: Single point of truth for thinking and fact card rendering/anchoring across sandbox and production clips, supporting phase-aware visibility and Mystery fact omission.
- Out-of-scope changes preserved:
  - Unrelated mascot and topic history files preserved.

## Implementation

- Contract changes:
  - `LANDSCAPE_FRAME.fact`: changed y from 846 to 886 (+40px downward shift). Height remains 156, width 1240, x=470. Bottom is 1042, maintaining a 38px bottom safety clearance to 1080.
  - Added `LAYOUT_ARENA_GEOMETRY` in `landscapeFrameGeometry.ts` mapping each layout to its exact arena height:
    - Media Left: 570
    - Visual Choices Three: 536
    - Pure Visual: 608
    - Split Versus: 553
    - Verdict: 565
    - Full Stack List: 528
    - Mystery Reveal: 757
  - All arena origins remain at (380, 253).
- Geometry/timing values:
  - Shared fact dock: x=470, y=886, width=1240, height=156, bottom=1042.
  - Question/counter/brand/timer fixed wrapper anchors remained untouched.
- UI/state transitions:
  - Shared phase slots unified across production and sandbox composition via `renderQuizScenePhaseParts`.
  - Collision policy updated: Phase-aware active rectangles distinguish active fact phase from thinking/question phase (e.g. Pure Visual straddling badge at y=773 is intentional and does not collide with fact during question phase).
- Failure/retry behavior: Validated across 55 browser anchor assertions and unit tests.
- Plan deviations and decision IDs:
  - Fact card visibility for `mystery_reveal`: Extracted into `shouldRenderFactCard` with `omitMysteryFactCard` parameter. For Phase 03 browser compatibility across baseline layouts, omission is controlled per call and will be activated for single_reveal in Phase 09.

## Verification

| Command or workflow | Build/source | Result and exit code | Evidence |
| ------------------- | ------------ | -------------------- | -------- |
| `pnpm --filter @studio/server exec vitest run test/quizFrameGeometry.test.ts` | Local | Exit 0 (7 passed) | Fixed frame and arena geometry unit assertions pass |
| `pnpm --filter @studio/server exec vitest run test/quizFrameAnchors.browser.test.ts --testTimeout 60000` | Local | Exit 0 (55 passed) | All 55 browser anchor bounding-box assertions pass across all 7 layouts |
| `pnpm --filter @studio/shared test` | Local | Exit 0 (321 passed) | All 321 shared package unit tests pass |
| `pnpm --filter @studio/server typecheck` | Local | Exit 0 | Full typecheck on server package passed |

- Current-runtime restart/rebuild: Server and shared packages typechecked and tested in Vitest headless browser.
- Primary workflow rerun: Measured fixed anchors for all 7 layouts in thinking and explain phases.
- Browser/font/asset readiness: Playwright headless browser rendered and measured DOM rects for all layouts.
- Visual inspection: Verified fact card bottom clearance is exactly 38px, avoiding viewport overflow.
- Known baseline-only failures: `apps/server/test/sandboxComposition.test.ts:743:28` (unrelated uncommitted mascot change).
- Remaining verification: Phase 04 Answer Primitives.

## Gate assessment

- Gate passed: Yes
- Blocker or required approval: None
- Exact next action: Proceed to Phase 04 (`phases/04-answer-primitives.md`).
- Safe resume instructions: Fact dock is standardized at y=886 and arena heights are active across frame styles.
