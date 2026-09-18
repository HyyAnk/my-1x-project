# Phase 05 report: Media Left and Full Stack implementation

## Status

Complete

## Source and scope

- Current commit: `7f08a3ea8342a9c15a32345cf83a0673293d5023`
- Relevant dirty files before work: None from layout upgrade; dirty files in unrelated mascot/animation areas were preserved intact.
- Requirement IDs: R01, R06
- Files changed:
  - `apps/server/src/quiz/render/layouts/mediaLeftChoicesRight.ts` (refactored to concise definition delegating styles to modular sub-packages)
  - `apps/server/src/quiz/render/layouts/fullStackList.ts` (refactored to concise definition delegating styles to modular sub-packages)
  - `apps/server/src/quiz/render/layouts/styles/mediaLeftChoicesRight/mediaLeftChoicesRightBaseStyles.ts` (created: 720x570 hero, 696x546 viewport, centered answer stack at y=304/472/640 and y=366/558)
  - `apps/server/src/quiz/render/layouts/styles/mediaLeftChoicesRight/mediaLeftChoicesRightAnimationStyles.ts` (created: motion, staggered entrances, whole-answer reveal halo & settle)
  - `apps/server/src/quiz/render/layouts/styles/mediaLeftChoicesRight/index.ts` (created: modular barrel export)
  - `apps/server/src/quiz/render/layouts/styles/fullStackList/fullStackListBaseStyles.ts` (created: locked A at y=275, B=458, C=641, 43px gap, 2-choice at y=329/548, 55px gap)
  - `apps/server/src/quiz/render/layouts/styles/fullStackList/fullStackListAnimationStyles.ts` (created: waterfall pop-in entrances, emerald reveal, settle)
  - `apps/server/src/quiz/render/layouts/styles/fullStackList/index.ts` (created: modular barrel export)
  - `apps/server/src/quiz/render/choices/detachedChoiceStyles.ts` (updated default badge sizes, font sizes, and text surface padding)
  - `apps/server/test/textLayoutsPhase05.test.ts` (created: 9 automated unit assertions for geometry, tokens, keyframes)
- New files and responsibilities:
  - `apps/server/src/quiz/render/layouts/styles/mediaLeftChoicesRight/`: Modular style subsystem for Media Left Choices Right layout.
  - `apps/server/src/quiz/render/layouts/styles/fullStackList/`: Modular style subsystem for Full Stack List layout.
  - `apps/server/test/textLayoutsPhase05.test.ts`: Automated test suite for Media Left and Full Stack canonical geometry.
- Out-of-scope changes preserved:
  - Unrelated mascot and topic history files preserved.

## Implementation

- Contract changes:
  - **Media Left Choices Right**:
    - Hero grew from 720x510 to 720x570 (border=12, inner viewport 696x546). Bottom at y=823, leaving 63px clearance to fact dock (y=886).
    - 3-answer stack centered in right column (x=1140, y=253, 660x570 arena slot).
    - Answer rows positioned at canvas y=304, 472, 640 (+30px downward shift from baseline 274/442/610).
    - Rows: 132px envelope, 36px gap, 132x132 circular badges, 540x108 text surfaces, 12px overlap.
    - 2-answer stack: row tops y=366, 558, 152px envelope, 40px gap, 152x152 badges, 524x124 text surfaces, 16px overlap.
  - **Full Stack List**:
    - Removed old vertical-centering `justify-content: center` that would shift A.
    - Locked Row A top at canvas y=275 (`top: 22px` within arena at y=253).
    - Row B at y=458 (+15px shift from baseline 443), Row C at y=641 (+30px shift from baseline 611).
    - Row gap expanded from 28px to 43px. Assembly 1280x140, badge 140x140, text surface 1156x116, overlap 16px.
    - 2-answer stack: Row A locked at y=329, Row B at y=548 (gap expanded to 55px). Assembly 1280x164, badge 164x164, text surface 1132x136, overlap 16px.
    - Choice group height set to `auto` with `max-height: 528px`, ensuring strict containment within the 528px arena without overflow.
  - Whole-answer movement: Animations target `.choice-card` containing sibling badge and surface, ensuring they never decouple during float, entrance, or victory lift.

## Verification

| Command or workflow | Build/source | Result and exit code | Evidence |
| ------------------- | ------------ | -------------------- | -------- |
| `pnpm --filter @studio/server exec vitest run test/textLayoutsPhase05.test.ts` | Local | Exit 0 (9 passed) | Canonical geometry, expanded hero, locked A anchor, row gap verification |
| `pnpm --filter @studio/server exec vitest run test/choicePrimitives.test.ts` | Local | Exit 0 (21 passed) | Detached badges and surface primitives |
| `pnpm --filter @studio/server exec vitest run test/choiceTextFit.test.ts` | Local | Exit 0 (19 passed) | Fit policy, multiline gains, font boundaries |
| `pnpm --filter @studio/server exec vitest run test/quizChoiceGroupRenderer.test.ts` | Local | Exit 0 (14 passed) | Choice group HTML rendering, canonical correct choice validation |
| `pnpm --filter @studio/server exec vitest run test/answerCardSkinStyles.test.ts` | Local | Exit 0 (32 passed) | All 6 registered skins render expected CSS rules and properties |
| `pnpm --filter @studio/server exec vitest run test/quizFrameAnchors.browser.test.ts` | Local | Exit 0 (55 passed) | All 55 browser anchor assertions pass across all 7 layouts without overflow |
| `pnpm --filter @studio/server typecheck` | Local | Exit 0 | Clean TypeScript compilation |

- Current-runtime restart/rebuild: Vitest browser and unit test runners.
- Primary workflow rerun: Measured fixed anchors and choice text fits across all layouts in headless browser.
- Visual inspection: Verified hero bottom is 823px with 63px clearance to fact dock; verified Full Stack A anchor remains at y=275 while B and C have 43px gaps.

## Gate assessment

- Gate passed: Yes
- Blocker or required approval: None
- Exact next action: Proceed to Phase 06 (`phases/06-visual-layouts.md`).
- Safe resume instructions: Text layouts (Media Left and Full Stack) are fully implemented, tested, and passing all browser checks. Ready for 3-choice visual layout implementation.
