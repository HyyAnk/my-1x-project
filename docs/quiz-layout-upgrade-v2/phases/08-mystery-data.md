# Phase 08: Mystery single-answer domain and data flow

Status: not started

## Objective

Remove Mystery multi-choice capability from generation through persistence, not only display.

Requirements: R09, R11.

## Dependencies and required reading

Phase 07 gate passed; read its evidence before editing.

- [specs/MYSTERY-CONTRACT.md](../specs/MYSTERY-CONTRACT.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [FILE-MAP.md](../FILE-MAP.md)

## Concrete implementation steps

1. Add the answer_mode discriminator and a focused canonical policy. Require exactly one choice and matching correct ID for single_reveal while preserving ordinary 2/3 rules.

2. Change bankRequiredChoiceCountForArchetype for Mystery to 1; extend bank/translation containers with source-aware exact-count and ID validation.

3. Update catalog and layout resolution: Mystery counts [1], question media only, explicit mismatch errors, auto single_reveal resolves to Mystery.

4. Update standard/reverse/direct generation prompts and sample output. Remove Mystery distractor instructions; parser rejects 0/2/3 choices rather than trimming or padding.

5. Carry mode through lossless and historical bank converters for newly generated Mystery data, direct generation, remix and transcreation. Do not invent default choices or reassign correct IDs.

6. Persist mode through SceneQuizContent, sceneCodec, quizArtifactSynthesizer, repository validation and semantic QA. Check every quizChoiceCountForFormat consumer for a mode-aware call.

7. Update manual/API boundaries and generated fixture schemas. Do not run a migration over historical bank/episode files.

8. Add integration tests from raw bank output to quiz conversion, serialized scene round trip, layout resolution and asset/voice preparation. Include correct ID not equal to a conventional letter.

## File ownership

- `packages/shared/src/schemas/quiz/quizQuestions.ts` (existing)
- `packages/shared/src/schemas/questionBank.ts` (existing)
- `packages/shared/src/schemas/common.ts` (existing)
- `packages/shared/src/schemas/episode.ts` (existing)
- `packages/shared/src/schemas/config.ts` (existing)
- `packages/shared/src/api/sandbox.ts` (existing)
- `packages/shared/src/sandboxPreviewLayoutPolicy.ts` (existing)
- `packages/shared/src/quizLayouts.policy.ts` (existing)
- `apps/server/src/quiz/layoutCompatibility.ts` (existing)
- `apps/server/src/quiz/domain/quiz.ts` (existing)
- `apps/server/src/quiz/domain/quizArtifactSynthesizer.ts` (existing)
- `apps/server/src/repository/scenes.ts` (existing)
- `apps/server/src/repository/sceneCodec.ts` (existing)
- `apps/server/src/quiz/qa/stages/assessSemanticQa.ts` (existing)
- `apps/server/src/quiz/bank/bridge/bankQuestionConverter.ts` (existing)
- `apps/server/src/quiz/bank/bridge/bankDirectorPlanFactory.ts` (existing)
- `apps/server/src/quiz/bank/bridge/singleQuestionBridge.ts` (existing)
- `apps/server/src/quiz/bank/bridge/topicEpisodeConfig.ts` (existing)
- `apps/server/src/quiz/bank/prompts/archetypePromptGuidelines.ts` (existing)
- `apps/server/src/quiz/bank/prompts/standardBatchPromptBuilder.ts` (existing)
- `apps/server/src/quiz/bank/prompts/reverseMatrixPromptBuilder.ts` (existing)
- `apps/server/src/quiz/bank/prompts/batchPromptOutputParser.ts` (existing)
- `apps/server/src/quiz/bank/transcreation/transcreationPrompt.ts` (existing)
- `apps/server/src/context/quizDirectPromptBuilder.ts` (existing)
- `apps/server/src/quiz/pipeline/remix/remixPromptBuilder.ts` (existing)
- `apps/server/src/quiz/pipeline/remix/questionParser.ts` (existing)
- `packages/shared/src/quizAnswerMode.ts` (proposed)

This is the phase's primary ownership set. Shared integration points in FILE-MAP.md may require small changes; register any newly discovered files before editing. Do not touch unrelated files merely because they appear in the overall inventory.

## Verification and acceptance

- [ ] One-answer Mystery succeeds through every boundary; invalid counts and wrong IDs fail with actionable errors.
- [ ] Ordinary three-choice and true/false validation remains strict.
- [ ] No production Mystery source path silently truncates/pads or emits distractors.
- [ ] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [ ] Updated primary workflow rerun; screenshots/logs point to the current build.
- [ ] Diff reviewed for scope, responsibility boundaries and preserved user changes.

## Exit gate

A fresh Mystery record can reach the renderer with exactly one preserved correct answer; legacy experiments are not rewritten.

## Deliverables

Answer-mode policy and boundary changes, strict fixture tests, evidence/phase-08.md.

## Recovery and handoff

If a check fails, preserve inputs and evidence, isolate the defect at its owning boundary and rerun. Do not globally revert the worktree, weaken expected geometry, or mark a skipped check as passed. Document blockers and the exact resume step in PROGRESS.md. Use the phase report template and keep all implementation artifacts in English.
