# Phase 08 report: Mystery single-answer domain and data flow

## Status

Complete

## Source and scope

- Current commit: `7f08a3ea8342a9c15a32345cf83a0673293d5023`
- Relevant dirty files before work: None from layout upgrade; dirty files in unrelated mascot/animation areas were preserved intact.
- Requirement IDs: R09, R11
- Files changed:
  - `packages/shared/src/quizAnswerMode.ts` (created: defines `QuizAnswerModeSchema`, `DEFAULT_QUIZ_ANSWER_MODE`, and helper `isSingleRevealMode`)
  - `packages/shared/src/index.ts` (updated: exported `quizAnswerMode.ts`)
  - `packages/shared/src/schemas/quiz/quizQuestions.ts` (updated: added `answer_mode` to `QuizQuestionSchema`, mode-aware `quizChoiceCountForFormat`, and single-reveal superRefine validation requiring exactly 1 choice, matching `correct_choice_id`, and rejecting `true_false`/`odd_one_out`)
  - `packages/shared/src/schemas/questionBank.ts` (updated: `bankRequiredChoiceCountForArchetype` returns 1 for `mystery_reveal`; `choices` min 1; superRefine enforces no `choice_illustration` on Mystery and validates 1-to-1 translations with matching IDs)
  - `packages/shared/src/quizLayouts.catalog.ts` (updated: `mystery_reveal` `supportedChoiceCounts: [1]`, `supportedFormats: ["multiple_choice", "image_guess"]`, `media: { supported: ["question"], required: ["question"] }`)
  - `packages/shared/src/quizLayouts.policy.ts` (updated: `resolveQuizLayout` enforces single-reveal rules: rejects explicit `mystery_reveal` with `choiceCount > 1` or `choice_selection`; rejects `single_reveal` with non-mystery layout; `preferredAutoLayout` maps `choiceCount === 1` or `answerMode === "single_reveal"` to `mystery_reveal`)
  - `packages/shared/src/sandboxPreviewLayoutPolicy.ts` & `packages/shared/src/api/sandbox.ts` (updated: sandbox preview enforces exactly 1 choice and `correct_choice_index === 0` for `mystery_reveal`, defaults to `image_guess`)
  - `packages/shared/src/schemas/episode.ts` (updated: added `answer_mode` to `QuizSceneContentSchema` and exported `SceneQuizContent` alias)
  - `apps/server/src/quiz/bank/prompts/archetypePromptGuidelines.ts` (updated: updated guidelines to mandate exactly 1 choice, no distractors, and `format: "image_guess"` for Mystery)
  - `apps/server/src/quiz/bank/prompts/standardBatchPromptBuilder.ts` (updated: standard batch prompt instructs 1 choice for Mystery)
  - `apps/server/src/quiz/bank/prompts/reverseMatrixPromptBuilder.ts` (updated: reverse prompt builder instructs 1 choice for Mystery)
  - `apps/server/src/quiz/bank/prompts/batchPromptOutputParser.ts` (updated: parser drops questions with choice count !== 1 for `mystery_reveal` instead of trimming or padding with distractors)
  - `apps/server/src/quiz/bank/transcreation/transcreationPrompt.ts` (updated: added single-choice preservation instructions for `mystery_reveal`)
  - `apps/server/src/context/quizDirectPromptBuilder.ts` (updated: added single choice and `answer_mode` for Mystery)
  - `apps/server/src/quiz/pipeline/remix/remixPromptBuilder.ts` & `apps/server/src/quiz/pipeline/remix/questionParser.ts` (updated: updated remix prompts and mode-aware `quizChoiceCountForFormat`)
  - `apps/server/src/quiz/bank/bridge/bankQuestionConverter.ts` (updated: `convertBankQuestionToQuizQuestionLossless` sets `answer_mode: "single_reveal"` and format; historical `convertBankQuestionToQuizQuestion` supports `isMystery` with `requiredCount = 1`, no distractor padding, and preserves IDs without remapping)
  - `apps/server/src/quiz/domain/quizArtifactSynthesizer.ts` (updated: carries `answer_mode` to scene quiz and adapts script markdown for single_reveal)
  - `apps/server/src/repository/scenes.ts` (updated: exported `assertQuizSceneChoicePolicy`, mode-aware validation)
  - `apps/server/src/tasks/parsers.ts` (updated: parses `answer_mode` into `Scene["quiz"]`)
  - `apps/server/src/quiz/qa/stages/assessSemanticQa.ts` (updated: calls `quizChoiceCountForFormat(question.format, question.answer_mode)`)
  - `apps/server/src/quiz/layoutCompatibility.ts` (updated: passes `answerMode: question.answer_mode` to `resolveQuizLayout`)
  - `apps/server/src/quiz/domain/quiz.ts` (updated: sets `answer_mode` during question synthesis)
  - `apps/server/test/quizFrameAnchors.browser.test.ts` (updated: `loadSnapshot` passes 1 choice and `image_guess` format for `mystery_reveal`)
  - `apps/server/test/mysteryDataPhase08.test.ts` (created: 23 unit tests verifying schema validation, bank converters, prompt output parsing, layout resolution, and scene serialization)
  - `apps/web/src/components/QuizV2Panel.test.tsx` (updated: added `answer_mode` to test mock)
  - `apps/web/src/features/episode/utils/quizRailCalculations.test.ts` (updated: added `answer_mode` to test mock)
- New files and responsibilities:
  - `packages/shared/src/quizAnswerMode.ts`: Canonical enum, schema, and helpers for quiz answer modes (`choice_selection` vs `single_reveal`).
  - `apps/server/test/mysteryDataPhase08.test.ts`: Integration test suite for Phase 08 Mystery single-answer contracts and data flow.
- Out-of-scope changes preserved:
  - Unrelated mascot and topic history files preserved intact.

## Implementation

- Domain invariants strictly enforced:
  - **Single Reveal (`single_reveal`)**:
    - Exactly 1 choice (`choices.length === 1`).
    - `correct_choice_id === choices[0].id`.
    - No distractor choices emitted or accepted.
    - Non-conventional choice IDs (e.g. `opt_custom_id_77`, `star_cluster_alpha`) are preserved without remapping to `a` or `c1`.
    - Incompatible formats (`true_false`, `odd_one_out`) are rejected under `single_reveal`.
  - **Question Bank Integration**:
    - `bankRequiredChoiceCountForArchetype("mystery_reveal")` returns 1.
    - `BankQuestionSchema` enforces no `choice_illustration` for Mystery Reveal (`visual_spec.intent !== "choice_illustration"`).
    - Translated choices must match the single source choice ID 1-to-1.
    - `batchPromptOutputParser` drops items with invalid choice counts for `mystery_reveal` instead of trimming or padding.
  - **Converter & Scene Persistence**:
    - `convertBankQuestionToQuizQuestionLossless` explicitly sets `answer_mode: "single_reveal"` for `mystery_reveal`.
    - Historical `convertBankQuestionToQuizQuestion` respects single choice for `isMystery` without padding fallback choices or reassigning IDs.
    - `QuizSceneContentSchema` and `assertQuizSceneChoicePolicy` strictly enforce 1 choice for `single_reveal`.
  - **Layout Resolution**:
    - `resolveQuizLayout` rejects `mystery_reveal` with `choiceCount > 1`.
    - `resolveQuizLayout` rejects non-mystery layout when `answer_mode === "single_reveal"`.
    - `preferredAutoLayout` selects `mystery_reveal` whenever `choiceCount === 1` or `answer_mode === "single_reveal"`.

## Verification

| Command or workflow | Build/source | Result and exit code | Evidence |
| ------------------- | ------------ | -------------------- | -------- |
| `pnpm --filter @studio/server exec vitest run test/mysteryDataPhase08.test.ts` | Local | Exit 0 (23 passed) | All 23 tests pass: QuizQuestionSchema, BankQuestionSchema, batch parser, converters, layout resolution, scene serialization |
| `pnpm --filter @studio/server exec vitest run test/binaryLayoutsPhase07.test.ts` | Local | Exit 0 (9 passed) | Split Versus and Verdict True/False contracts preserved |
| `pnpm --filter @studio/server exec vitest run test/quizFrameAnchors.browser.test.ts` | Local | Exit 0 (55 passed) | All 55 browser anchor tests pass across all 7 layouts in headless Chromium |
| `pnpm --filter @studio/shared build` | Local | Exit 0 | Clean TypeScript compilation of shared schemas and types |
| `pnpm --filter @studio/server typecheck` | Local | Exit 0 | Clean TypeScript compilation of server package |
| `pnpm --filter @studio/web typecheck` | Local | Exit 0 | Clean TypeScript compilation of web package |

- Current-runtime restart/rebuild: Shared library built, server and web typechecked, test runners executed.
- Primary workflow rerun: Vitest tests run across bank conversion, layout resolution, and browser frame rendering.
- Visual/Data inspection: Confirmed single-choice mystery question passes from domain model through scene serialization and layout policy without padding or distractor injection.

## Gate assessment

- Gate passed: Yes
- Blocker or required approval: None
- Exact next action: Proceed to Phase 09 (`phases/09-mystery-runtime.md`).
- Safe resume instructions: Phase 08 domain and data flow complete. Ready for Phase 09 Mystery image, timing and narration runtime implementation.
