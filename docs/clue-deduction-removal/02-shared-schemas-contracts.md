# Phase 2: Core Shared Schemas, Enums & Domain Contracts

## Purpose
Remove `clue_deduction` from all shared types, schemas, and catalogs in `packages/shared`.

## Target Files to Modify

1. `packages/shared/src/quizArchetypes.ts`
   - Remove `"clue_deduction"` from `QuizGameplayArchetypeId`.
   - Remove `clue_deduction` blueprint from `QUIZ_GAMEPLAY_ARCHETYPES`.
2. `packages/shared/src/enums/quiz/pipelineEnums.ts`
   - Remove `"clue_deduction"` from `DirectorArchetypeSchema`.
   - Remove `"clue_deduction"` from `QuizLayoutIdSchema`.
3. `packages/shared/src/schemas/questionBank.ts`
   - Remove `"clue_deduction"` from `BankGameplayArchetypeIdSchema`.
4. `packages/shared/src/schemas/channel.ts`
   - Remove `"clue_deduction"` from `TopicGameplayArchetypeSchema`.
5. `packages/shared/src/quizLayouts.catalog.ts`
   - Remove `"clue_deduction"` from `QUIZ_LANDSCAPE_LAYOUT_IDS`.
   - Remove `clue_deduction` definition from `QUIZ_LAYOUT_CATALOG`.
6. `packages/shared/src/quizLayouts.policy.ts`
   - Remove `if (archetypeStr === "clue_deduction") return "clue_deduction";` in `resolveAutoLayoutForArchetype`.
7. `packages/shared/src/quizImageSizing/geometry.ts`
   - Remove `clue_deduction` from `CANONICAL_IMAGE_SLOT_DEFINITIONS`.
   - Remove `case "clue_deduction":` in `getQuizImageSlotGeometry`.

## Verification
- Run `pnpm --filter @studio/shared build` to verify shared package compiles cleanly.
