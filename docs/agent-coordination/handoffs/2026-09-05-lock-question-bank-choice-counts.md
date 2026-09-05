# Question Bank Archetype Choice Counts Standardization & Legacy Question Wipe Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: 28 dirty files recorded via `git status --porcelain`

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- packages/shared/src/quizArchetypes.ts
- packages/shared/src/quizLayouts.catalog.ts
- packages/shared/src/quizLayouts.policy.ts
- packages/shared/src/schemas/questionBank.ts
- apps/server/src/quiz/bank/batchGeneratorPrompt.ts

## Files Changed

- packages/shared/src/schemas/questionBank.ts (MODIFIED: locked choices array to max 3; added bankRequiredChoiceCountForArchetype helper and Zod superRefine checking exact required choice count per archetype; updated BankTranslationContentSchema choices to max 3)
- apps/server/src/quiz/bank/batchGeneratorPrompt.ts (MODIFIED: updated ARCHETYPE_GUIDELINES for deep_trivia and visual_spotting to choiceCount: 3 with 3-choice instructions; added defensive candidate choice trimming to parseBatchGenerationOutput and parseReverseBatchGenerationOutput)
- apps/server/test/questionBankSchema.test.ts (MODIFIED: added unit tests validating strict choice count per archetype, rejecting 4 choices, rejecting mismatched counts, and sanitized all test fixtures to pure English)
- apps/server/test/questionBankResilience.test.ts (MODIFIED: adjusted versus_faceoff archetype test loop to use 2 choices matching its 1v1 split_versus_two contract)
- .quiz-studio/question_bank/index.json (MODIFIED: reset total questions and breakdown to 0)
- .quiz-studio/question_bank/*/ (REMOVED: wiped all legacy question batches so user can regenerate fresh)
- docs/agent-coordination/handoffs/2026-09-05-lock-question-bank-choice-counts.md (NEW: handoff summary)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside claimed scope

## Scope

- Claimed task: Lock question bank choice counts per archetype and wipe legacy questions
- Allowed scope used: shared-contracts, server-core, server-tests, generated-artifacts, agent-coordination
- Scope deviations: none

## Decisions

- Decision 1: Standardized all 8 Archetypes into exactly two choice count tiers:
  - 2 choices: `verdict_true_false`, `verdict_fact_myth`, `versus_faceoff`
  - 3 choices: `deep_trivia`, `visual_spotting`, `visual_identification`, `speed_blitz`, `mystery_reveal`, `clue_deduction`
- Reason: The entire video rendering engine and all 8 production layouts support at most 2 or 3 choices. Layouts like `media_left_choices_right` and `visual_choices_three_pure` cannot render 4 choices without UI truncation or grid breakage.
- Decision 2: Wiped all old batch files in `.quiz-studio/question_bank/` and reset `index.json` to 0 questions per user instruction.
- Reason: Eliminates all legacy questions that had non-compliant choice counts or legacy schemas.

## Verification

- Command: `pnpm --filter @studio/shared build`
  - Result: Passed (exit code 0).
- Command: `pnpm --filter @studio/server test -- test/questionBankSchema.test.ts`
  - Result: Passed 14/14 tests.
- Command: `pnpm --filter @studio/server test -- test/questionBankSchema.test.ts test/questionBankIntegration.test.ts test/questionBankReverseMatrixE2E.test.ts test/questionBankTranscreation.test.ts test/questionBankResilience.test.ts test/matrixCoverageService.test.ts`
  - Result: Passed 94/94 tests.
- Command: `pnpm --filter @studio/web test -- src/features/questionBank`
  - Result: Passed 17/17 tests.
- Command: `pnpm typecheck`
  - Result: Passed across all packages.
- Command: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`
  - Result: Passed 57/57 tests.
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: Passed (valid: true, 0 unmapped, 0 overlapping).

## Open Risks

- Risk: None. Question Bank now strictly enforces choice counts matching production layouts.
- Suggested next action: User can generate new batches from Question Bank UI or CLI with guaranteed layout-compatible choice counts.

## Next Phase Input

- Files the next agent must read: `packages/shared/src/schemas/questionBank.ts`, `apps/server/src/quiz/bank/batchGeneratorPrompt.ts`.
- Commands the next agent should run first: `node scripts/agent-status.mjs --json`, `pnpm --filter @studio/server test -- test/questionBankSchema.test.ts`.
- Important constraints: Maintain 2-choice invariant for `verdict_true_false`/`versus_faceoff` and 3-choice invariant for all other archetypes.
