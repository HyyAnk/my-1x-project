# Phase 1: Question Bank, AI Prompts & Knowledge Matrix

## Purpose
Eradicate all references to `clue_deduction` from prompt engineering builders, transcreation logic, matrix coverage calculator, and question curation engine so the AI pipeline never generates, validates, or suggests this archetype.

## Target Files to Modify

1. `apps/server/src/quiz/bank/prompts/archetypePromptGuidelines.ts`
   - Remove `clue_deduction` configuration block.
2. `apps/server/src/quiz/bank/prompts/standardBatchPromptBuilder.ts`
   - Remove `options.archetypeId === "clue_deduction"` block (Golden Clue Deduction Paradigms).
3. `apps/server/src/quiz/bank/prompts/reverseMatrixPromptBuilder.ts`
   - Remove `options.archetypeId === "clue_deduction"` block (Specialized Clue Deduction Directive).
4. `apps/server/src/quiz/bank/transcreation/transcreationPrompt.ts`
   - Remove `clue_deduction` from `ARCHETYPE_TRANSCREATION_NUANCE`.
5. `apps/server/src/quiz/bank/matrix/matrixCoverageCalculator.ts`
   - Remove `"clue_deduction"` from `ALL_MATRIX_ARCHETYPES`.
6. `apps/server/src/quiz/bank/questionCurationEngine.ts`
   - Remove `case "clue_deduction": return "clue_deduction";` from `resolveTargetArchetype`.
7. `docs/question-bank.md`
   - Remove `clue_deduction` from the matrix archetypes list in documentation.

## Verification
- Verify that prompt builders construct prompts for all other 7 archetypes without error.
- Check that `ALL_MATRIX_ARCHETYPES` has exactly 7 archetypes.
