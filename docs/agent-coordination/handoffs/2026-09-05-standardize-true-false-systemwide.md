# Standardize Fact/Myth to True/False Systemwide Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: clean repository dirty baseline captured, 0 dirty files pre-existing

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-04-optimize-question-bank-length-and-shorts-guidelines.md

## Files Changed

- packages/shared/src/quizArchetypes.ts
- packages/shared/src/schemas/channel.ts
- packages/shared/src/schemas/questionBank.ts
- packages/shared/src/thumbnail/thumbnailContracts.ts
- apps/web/src/features/questionBank/components/QuestionBankTable.tsx
- apps/web/src/features/questionBank/components/QuestionBankHeaderStats.tsx
- apps/web/src/features/questionBank/components/QuestionBankFormModal.tsx
- apps/web/src/features/questionBank/components/QuestionBankAiGenerateModal.tsx
- apps/web/src/features/channel/components/TopicLayoutPreviewButton.tsx
- apps/web/src/features/channel/components/TopicLayoutPreviewButton.test.tsx
- apps/web/src/features/episode/components/ThumbnailControlsDeck.tsx
- apps/web/src/i18n/locales/en/questionBank.ts
- apps/web/src/i18n/locales/vi/questionBank.ts
- apps/server/src/context/channelContextBuilder.ts
- apps/server/src/tasks/parsers.ts
- apps/server/src/quiz/thumbnail/thumbnailLocale.ts
- apps/server/src/quiz/thumbnail/thumbnailArchetypes.ts
- apps/server/src/quiz/bank/batchGeneratorPrompt.ts
- apps/server/src/quiz/bank/transcreation/transcreationPrompt.ts
- apps/server/src/quiz/bank/questionBankToQuizBridge.ts
- apps/server/src/quiz/bank/matrixCoverageService.ts
- apps/server/src/repository/quiz/questionBankRepository.ts
- apps/server/test/context.test.ts
- apps/server/test/matrixCoverageService.test.ts
- apps/server/test/questionBankIntegration.test.ts
- apps/server/test/questionBankReverseMatrixE2E.test.ts
- apps/server/test/questionBankTranscreation.test.ts
- docs/agent-coordination/handoffs/2026-09-05-standardize-true-false-systemwide.md

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside claimed scope

## Scope

- Claimed phase: Standardize Fact/Myth to True/False systemwide
- Allowed scope used: shared-contracts, api-contracts, task-status-progress, image-thumbnail-prompt, server-core, artifact-contracts, web-layout-style, server-tests, agent-coordination
- Scope deviations: none

## Decisions

- Decision: Canonical gameplay archetype ID is standardized to erdict_true_false (True or False).
  Reason: True/False questions in Question Bank previously carried confusing Fact/Myth and Fact vs Myth labels and badges, while prompt generation engines also suggested Fact/Myth angles that biased LLM generation.
  Impact on later phases: All new topic generation, AI batch generation, Question Bank studio UI, badges, filters, and transcreation prompts consistently propose and render True or False.

- Decision: Seamless backward-compatibility maintained for erdict_fact_myth.
  Reason: Existing batches on disk or historical datasets may contain erdict_fact_myth.
  Impact on later phases: quizArchetypes.ts, questionBank.ts, questionBankRepository.ts, matrixCoverageService.ts, and questionBankToQuizBridge.ts transparently accept and normalize erdict_fact_myth to erdict_true_false.

- Decision: Purged all residual Vietnamese strings in TopicLayoutPreviewButton.tsx and English UI metadata per strict English-only codebase specification.
  Reason: Preserves strict English-only standard across all client components and test files.
  Impact on later phases: Clean English baseline throughout UI previews.

## Verification

- Command: pnpm --filter @studio/shared build
  Result: Succeeded without error.
- Command: pnpm typecheck
  Result: 100% clean typecheck across all 3 workspace packages/apps (@studio/shared, @studio/server, @studio/web).
- Command: pnpm --filter @studio/server test -- test/questionBank
  Result: 11/11 test files passed, 120/120 tests passed.
- Command: pnpm --filter @studio/web test
  Result: 54/54 test files passed, 231/231 tests passed.
- Command: 
ode scripts/agent-validate-zones.mjs --json
  Result: valid: true, 0 unmapped files, 0 overlapping files.

## Open Risks

- Risk: none identified.
- Suggested next action: Ready for production use and integration.

## Next Phase Input

- Files the next agent must read:
  - AGENTS.md
  - packages/shared/src/quizArchetypes.ts
  - apps/server/src/repository/quiz/questionBankRepository.ts
- Commands the next agent should run first:
  - node scripts/agent-status.mjs --json
- Important constraints:
  - Always use erdict_true_false as the canonical True/False archetype ID.
  - Maintain the fallback alias for erdict_fact_myth to ensure backwards compatibility with legacy local question databases.
