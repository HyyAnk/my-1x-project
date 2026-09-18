# Phase 06 report: Three-choice visual layouts

## Status

Complete

## Source and scope

- Current commit: `7f08a3ea8342a9c15a32345cf83a0673293d5023`
- Relevant dirty files before work: None from layout upgrade; dirty files in unrelated mascot/animation areas were preserved intact.
- Requirement IDs: R02, R03
- Files changed:
  - `apps/server/src/quiz/render/layouts/visualChoicesThree.ts` (refactored to concise definition delegating styles to modular sub-packages)
  - `apps/server/src/quiz/render/layouts/styles/visualChoicesThree/visualChoicesThreeBaseStyles.ts` (created: media height 411, viewport 432x391, answer assembly top 685, 21px gap, badge 104x104, text 360x86, card 452x536)
  - `apps/server/src/quiz/render/layouts/styles/visualChoicesThree/visualChoicesThreeAnimationStyles.ts` (created: staggered entrances, reveal bloom, settle contrast)
  - `apps/server/src/quiz/render/layouts/styles/visualChoicesThree/index.ts` (created: modular barrel export)
  - `apps/server/src/quiz/render/layouts/styles/visualChoicesThreePure/visualChoicesThreePureCardStyles.ts` (updated: media 452x564, straddling circular badge 88x88 centered at y=817, top=773, bottom=861, card envelope 452x608, removed legacy corner badge selectors)
  - `apps/server/test/visualLayoutsPhase06.test.ts` (created: 6 automated unit assertions for geometry, media heights, straddling badges, and clearance)
- New files and responsibilities:
  - `apps/server/src/quiz/render/layouts/styles/visualChoicesThree/`: Modular style subsystem for 3 Choice Visual Card layout.
  - `apps/server/test/visualLayoutsPhase06.test.ts`: Automated test suite for Visual Choices Three and Visual Choices Three Pure canonical geometry.
- Out-of-scope changes preserved:
  - Unrelated mascot and topic history files preserved.

## Implementation

- Contract changes:
  - **3 Choice Visual Card (`visual_choices_three`)**:
    - Media height grew from 356px to 411px (+55px), viewport 432x391, media bottom at y=664.
    - Media-to-assembly gap is exactly 21px (16 + 60 - 55 = 21px).
    - Answer assembly top moved from 625px to 685px (+60px), height = 104px, bottom = 789px.
    - Fact clearance: 886 - 789 = 97px.
    - Circular badge: 104x104, font-size: 48px.
    - Text surface: 360x86 at columnX+92, y=694, 12px overlap with badge.
    - Composite card and arena height: 452x536.
  - **3 Choice Pure Visual Cards (`visual_choices_three_pure`)**:
    - Media grew from 504px to 564px (+60px), viewport 432x544, image bottom at y=817.
    - Circular letter badge (88x88) centered exactly on image bottom edge at y=817:
      - Top-left: (562 / 1046 / 1530, 773), bottom at y=861.
      - Rest-state clearance to fact dock at y=886: 886 - 861 = 25px.
    - Composite card envelope: 452x608, distinct from media height 564px.
    - Card has `overflow: visible` so badge is visible outside media; media has `overflow: hidden` with 36px border radius to clip images.
    - Removed legacy top-left corner badge styles. Choice text is hidden visually via `.sr-only` for screen-reader accessibility without triggering text fit overhead.

## Verification

| Command or workflow | Build/source | Result and exit code | Evidence |
| ------------------- | ------------ | -------------------- | -------- |
| `pnpm --filter @studio/server exec vitest run test/visualLayoutsPhase06.test.ts` | Local | Exit 0 (6 passed) | Canonical geometry, media height +55/+60, straddling badge centering, 25px/97px fact clearance |
| `pnpm --filter @studio/server exec vitest run test/textLayoutsPhase05.test.ts` | Local | Exit 0 (9 passed) | Regression check on text layouts |
| `pnpm --filter @studio/server exec vitest run test/choicePrimitives.test.ts` | Local | Exit 0 (21 passed) | Variant resolution, sibling markup, detached and pure visual badges |
| `pnpm --filter @studio/server exec vitest run test/choiceTextFit.test.ts` | Local | Exit 0 (19 passed) | Choice fit policy |
| `pnpm --filter @studio/server exec vitest run test/answerCardSkinStyles.test.ts` | Local | Exit 0 (32 passed) | All 6 registered skins render expected CSS rules and properties |
| `pnpm --filter @studio/server exec vitest run test/quizFrameAnchors.browser.test.ts` | Local | Exit 0 (55 passed) | All 55 browser anchor assertions pass across all 7 layouts without collision |
| `pnpm --filter @studio/server typecheck` | Local | Exit 0 | Clean TypeScript compilation |

- Current-runtime restart/rebuild: Vitest browser and unit test runners.
- Primary workflow rerun: Measured fixed anchors and choice text fits across all layouts in headless browser.
- Visual inspection: Verified Pure Visual straddling badge centers on media bottom with 25px clearance to fact dock; verified Visual Card answer top is at 685px with 21px gap below media.

## Gate assessment

- Gate passed: Yes
- Blocker or required approval: None
- Exact next action: Proceed to Phase 07 (`phases/07-binary-layouts.md`).
- Safe resume instructions: Three-choice visual layouts are fully upgraded, verified in browser, and passing all tests. Ready for Split Versus and Verdict layout implementation.
