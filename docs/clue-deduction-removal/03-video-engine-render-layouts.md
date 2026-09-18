# Phase 3: Video Engine, Director Plan & Server Render Layouts

## Purpose
Eradicate server-side layout renderers, CSS generators, geometry mappings, and Director Plan routing for `clue_deduction`.

## Files to Delete
- `apps/server/src/quiz/render/layouts/clueDeduction.ts`
- `apps/server/src/quiz/render/layouts/styles/clueDeductionStyles.ts`
- Directory `apps/server/src/quiz/render/layouts/styles/clueDeduction/` and all its 7 files:
  - `clueDeductionAnimationStyles.ts`
  - `clueDeductionBaseStyles.ts`
  - `clueDeductionChoiceStyles.ts`
  - `clueDeductionEvidenceStyles.ts`
  - `clueDeductionPhaseStyles.ts`
  - `clueDeductionPortraitStyles.ts`
  - `clueDeductionStageStyles.ts`

## Target Files to Modify
1. `apps/server/src/quiz/bank/bridge/bankDirectorPlanFactory.ts`
   - Remove `case "clue_deduction":` in `mapToDirectorArchetype` and `resolveTargetLayoutForTopic`.
   - Simplify `isRevealArchetype = archetypeId === "mystery_reveal";`
   - Simplify `isReveal = topic.archetype === "mystery_reveal";`
2. `apps/server/src/quiz/render/layouts/registry.ts`
   - Remove import and entry for `clue_deduction`.
3. `apps/server/src/quiz/render/layouts/layoutContentGeometry.ts`
   - Remove `clue_deduction` geometry definition.
4. `apps/server/src/quiz/render/layouts/imageSlotStyles.ts`
   - Remove `clue_deduction` CSS block and variables.

## Verification
- Ensure server layouts registry contains exactly 8 renderers (baseline + 7 resolved layouts).
