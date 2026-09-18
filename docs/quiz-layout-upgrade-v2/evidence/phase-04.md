# Phase 04 report: Answer markup, skins and text fitting

## Status

Complete

## Source and scope

- Current commit: `7f08a3ea8342a9c15a32345cf83a0673293d5023`
- Relevant dirty files before work: None from layout upgrade; dirty files in unrelated mascot/animation areas were preserved intact.
- Requirement IDs: R01, R02, R04, R05, R06
- Files changed:
  - `apps/server/src/quiz/render/choices/choiceSurfaceMarkup.ts` (created: extracted typed layout decoration policy and sibling badge/surface rendering)
  - `apps/server/src/quiz/render/choices/detachedChoiceStyles.ts` (created: transparent assembly, z-index 5 badge, z-index 4 text surface, explicit surface height/radius tokens)
  - `apps/server/src/quiz/render/choices/renderChoiceGroup.ts` (delegates choice rendering to `renderChoiceCard` from `choiceSurfaceMarkup.ts`)
  - `apps/server/src/quiz/render/choices/baseChoiceStyles.ts` (includes `detachedChoiceStyles()`)
  - `apps/server/src/quiz/render/choices/index.ts` (exports `choiceSurfaceMarkup` and `detachedChoiceStyles`)
  - `apps/server/src/quiz/render/choices/choiceTextFitScript.ts` (handles `.sr-only` pure visual answers, measures text surface inner content box, checks horizontal bounds and height limits)
  - `apps/server/src/quiz/visual/elements/answerCard/variants/glossyArcade.ts` (skin audit: updated selectors for detached surface/badge, victory states)
  - `apps/server/src/quiz/visual/elements/answerCard/variants/comicChunky.ts` (skin audit: updated selectors for detached surface/badge, victory states)
  - `apps/server/src/quiz/visual/elements/answerCard/variants/glassNeon.ts` (skin audit: updated selectors for detached surface/badge, victory states)
  - `apps/server/src/quiz/visual/elements/answerCard/variants/minimalSoft.ts` (skin audit: updated selectors for detached surface/badge, victory states)
  - `apps/server/src/quiz/visual/elements/answerCard/variants/pastelMarshmallow.ts` (skin audit: updated selectors for detached surface/badge, victory states)
  - `apps/server/src/quiz/visual/elements/answerCard/variants/steelBeamPlate.ts` (skin audit: updated selectors for detached surface/badge, victory states)
  - `apps/server/test/choicePrimitives.test.ts` (created: 21 comprehensive tests for decoration variants, skins, text-only contracts, accessibility labels)
- New files and responsibilities:
  - `apps/server/src/quiz/render/choices/choiceSurfaceMarkup.ts`: Layout decoration policy (`resolveChoiceDecorationVariant`) mapping layout IDs to `detached_badge`, `media_bottom_badge`, `text_only`, or `single_reveal`; renders semantic cards with sibling badges and painted surfaces without layout-skin pollution.
  - `apps/server/src/quiz/render/choices/detachedChoiceStyles.ts`: CSS primitives for transparent assembly, detached circular badge (z-index 5), painted surface (z-index 4), 12px overlap, pure visual straddling badge, and text-only centering.
  - `apps/server/test/choicePrimitives.test.ts`: Automated test suite covering all 4 decoration variants, 6 skins, accessibility labels, and structural contracts.
- Out-of-scope changes preserved:
  - Unrelated mascot and topic history files preserved.

## Implementation

- Contract changes:
  - Four presentation variants implemented per `specs/ANSWER-SURFACES.md`:
    - `detached_badge`: for `media_left_choices_right`, `visual_choices_three`, `full_stack_list`. Badge is rendered as sibling to `.choice-card-surface` with -12px overlap.
    - `media_bottom_badge`: for `visual_choices_three_pure`. Bottom-straddling circular badge centered at bottom, choice text rendered in `.sr-only`.
    - `text_only`: for `split_versus_two`, `verdict_true_false`. No badge node rendered, centered text surface, accessibility label omits "A: "/"B: ".
    - `single_reveal`: for `mystery_reveal`. Single text-only answer, hidden before reveal, no wrong answer states.
  - Sibling markup structure:
    ```html
    <div class="choice-card" data-choice-id="..." role="listitem">
      <b class="choice-label" aria-hidden="true">A</b>
      <div class="choice-card-surface">
        <span class="choice-text">Answer text</span>
      </div>
    </div>
    ```
  - Outer card is transparent with `overflow: visible; padding: 0; background: transparent; border: none; box-shadow: none;`.
  - All 6 skins (`glossy_arcade`, `comic_chunky`, `glass_neon`, `minimal_soft`, `pastel_marshmallow`, `steel_beam_plate`) updated so background, borders, and shadows apply strictly to `.choice-card-surface` and `.choice-label`, retaining backward compatibility.
  - Choice text fitting script updated:
    - Automatically recognizes `.sr-only` pure visual answers and skips visual fit.
    - Measures `.choice-text` within `.choice-card-surface` inner content box.
    - Respects `--choice-surface-height` (108px default, 86px min-height) and line count constraints.

## Verification

| Command or workflow | Build/source | Result and exit code | Evidence |
| ------------------- | ------------ | -------------------- | -------- |
| `pnpm --filter @studio/server exec vitest run test/choicePrimitives.test.ts` | Local | Exit 0 (21 passed) | Variant resolution, sibling markup, text-only contracts, accessibility labels |
| `pnpm --filter @studio/server exec vitest run test/choiceTextFit.test.ts` | Local | Exit 0 (19 passed) | Group fit policy, line fitting, token reading, and overflow handling |
| `pnpm --filter @studio/server exec vitest run test/quizChoiceGroupRenderer.test.ts` | Local | Exit 0 (14 passed) | Group rendering, canonical choice validation, order preservation |
| `pnpm --filter @studio/server exec vitest run test/answerCardSkinStyles.test.ts` | Local | Exit 0 (32 passed) | All 6 registered skins render expected CSS rules and properties |
| `pnpm --filter @studio/server exec vitest run test/quizFrameAnchors.browser.test.ts` | Local | Exit 0 (55 passed) | All 55 browser anchor assertions pass without font or choice fit errors |
| `pnpm --filter @studio/server typecheck` | Local | Exit 0 | Clean TypeScript compilation |

- Current-runtime restart/rebuild: Vitest browser and unit test runners.
- Primary workflow rerun: Verified all 7 landscape layouts in headless browser without choice text overflow.
- Visual inspection: Verified detached badge sits above surface with higher z-index (5 vs 4), text surface renders background and borders cleanly.

## Gate assessment

- Gate passed: Yes
- Blocker or required approval: None
- Exact next action: Proceed to Phase 05 (`phases/05-text-layouts.md`).
- Safe resume instructions: Detached primitives are complete and audited across all 6 skins; layouts are ready for Phase 05 geometry and gap updates.
