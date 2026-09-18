# Phase 04: Answer markup, skins and text fitting

Status: not started

## Objective

Create reusable detached-badge and text-only presentation without mixing geometry into skin logic.

Requirements: R01, R02, R04, R05, R06.

## Dependencies and required reading

Phase 03 gate passed; read its evidence before editing.

- [specs/ANSWER-SURFACES.md](../specs/ANSWER-SURFACES.md)
- [specs/GEOMETRY.md](../specs/GEOMETRY.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)

## Concrete implementation steps

1. Define a typed layout decoration policy that selects detached_badge, media_bottom_badge, text_only or single_reveal from resolved layout, not answer text.

2. Extract answer surface markup from renderChoiceGroup. Keep stable data-choice-id/order/state on the outer assembly and place badge/text surface as siblings.

3. Remove redundant padding, backgrounds, borders and shadows from the transparent outer assembly. Preserve each skin's colors and decorations on the actual painted surface.

4. Omit letter-badge markup and badge hooks for text-only layouts; do not reserve hidden badge width. Preserve clear accessibility labels without phantom A/B prefixes.

5. Audit every registered skin selector and state style against the new structure. Ensure correct/incorrect effects affect both parts coherently and do not change layout dimensions.

6. Update fitting to measure the text surface's inner content box after fonts load, including hidden Mystery answers. Preserve group-wide font-size consistency.

7. Enforce minimum fonts and two-line limits from the spec. Return an overflow error with the original input retained; never allow truncation to count as successful fit.

8. Add unit/render/browser tests for all decoration variants, every skin, one/two-line content, overflow, hidden content and escaped text.

## File ownership

- `apps/server/src/quiz/render/choices/renderChoiceGroup.ts` (existing)
- `apps/server/src/quiz/render/choices/choiceGroup.types.ts` (existing)
- `apps/server/src/quiz/render/choices/baseChoiceStyles.ts` (existing)
- `apps/server/src/quiz/render/choices/choiceTextFitScript.ts` (existing)
- `apps/server/src/quiz/render/choices/choiceTextFitPolicy.ts` (existing)
- `apps/server/src/quiz/render/choices/choiceStateStyles.ts` (existing)
- `apps/server/src/quiz/render/choices/choiceTypographyStyles.ts` (existing)
- `apps/server/src/quiz/visual/elements/answerCard/types.ts` (existing)
- `apps/server/src/quiz/visual/elements/answerCard/registry.ts` (existing)
- `apps/server/src/quiz/render/choices/choiceSurfaceMarkup.ts` (proposed)
- `apps/server/src/quiz/render/choices/detachedChoiceStyles.ts` (proposed)

This is the phase's primary ownership set. Shared integration points in FILE-MAP.md may require small changes; register any newly discovered files before editing. Do not touch unrelated files merely because they appear in the overall inventory.

## Verification and acceptance

- [ ] Detached surface is lower than badge by the exact specified ratio.
- [ ] Text-only DOM contains no .choice-label and no badge decoration residue.
- [ ] All registered skins keep geometry identical; fitting reports actual overflow.
- [ ] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [ ] Updated primary workflow rerun; screenshots/logs point to the current build.
- [ ] Diff reviewed for scope, responsibility boundaries and preserved user changes.

## Exit gate

Answer primitives can serve every target layout without layout-specific duplicated markup or weakened fit tests.

## Deliverables

Focused surface helpers, skin adjustments, fit tests, evidence/phase-04.md.

## Recovery and handoff

If a check fails, preserve inputs and evidence, isolate the defect at its owning boundary and rerun. Do not globally revert the worktree, weaken expected geometry, or mark a skipped check as passed. Document blockers and the exact resume step in PROGRESS.md. Use the phase report template and keep all implementation artifacts in English.
