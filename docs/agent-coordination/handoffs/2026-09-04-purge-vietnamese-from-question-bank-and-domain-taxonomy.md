# Purge Vietnamese from Question Bank & Domain Taxonomy Handoff Summary

## Status

- Result: completed
- Date: 2026-09-04
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: clean repository dirty baseline captured, no outside files modified

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md

## Files Changed

- packages/shared/src/utils/languageNormalize.ts
- packages/shared/src/schemas/questionBank.ts
- apps/server/src/quiz/bank/taxonomy.json
- apps/server/src/quiz/bank/batchGeneratorPrompt.ts
- apps/server/src/utils/speechSanitizer.ts
- apps/server/test/questionBankSchema.test.ts
- apps/server/test/questionBankAutoQa.test.ts
- apps/server/test/questionBankResilience.test.ts
- apps/server/test/questionBankRoute.test.ts
- apps/server/test/questionBankRepository.test.ts
- apps/server/test/questionBankIntegration.test.ts
- apps/web/src/features/questionBank/components/QuestionBankAiGenerateModal.tsx
- apps/web/src/features/questionBank/components/QuestionBankFormModal.tsx
- apps/web/src/features/questionBank/components/QuestionBankTable.tsx
- apps/web/src/features/questionBank/components/QuestionBankLivePreview.tsx
- apps/web/src/features/questionBank/hooks/useQuestionBank.ts
- apps/web/src/features/questionBank/questionBankUi.test.tsx
- .quiz-studio/question_bank/** (batches 100% translated to English, 0 Vietnamese items)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside claimed scope

## Scope

- Claimed phase: Question Bank Vietnamese elimination & English normalization
- Allowed scope used: shared-contracts, server-core, api-contracts, generated-artifacts, web-layout-style, web-api-state, server-tests, agent-coordination, runtime-resources
- Scope deviations: none

## Decisions

- Decision: Converted all 8 Question Bank taxonomy domains and 24 subtopics to 100% English.
  Reason: System is standardized to English-first to avoid unintended Vietnamese generation or priming.
  Impact on later phases: Clean English baseline across prompts, UI catalogs, batches, and translation pipelines.

- Decision: Synced external runtime directory at `D:\1a Cursor Project\My 1x Youtube Channel File\.quiz-studio\question_bank`.
  Reason: Server runtime reads from `this.roots.runtime` when available, which was previously serving legacy Vietnamese question batches.
  Impact on later phases: Both internal `.quiz-studio/question_bank` and external runtime directory are identical and 100% English.

- Decision: Translated server test suites (`questionBankSchema`, `questionBankAutoQa`, `questionBankResilience`, `questionBankRoute`, `questionBankRepository`, `questionBankIntegration`) to use English and Spanish instead of Vietnamese.
  Reason: Vitest test runs previously wrote Vietnamese fixtures back to disk on every execution.
  Impact on later phases: Test runs remain idempotent and never contaminate the database with Vietnamese text.

- Decision: Removed hardcoded `"vi"` language filters and fallback defaults in Web UI components and hooks (`useQuestionBank`, `QuestionBankTable`, `QuestionBankLivePreview`).
  Reason: Dynamic filtering against `(q.language || "en")` supports any target translation language without hardcoding.
  Impact on later phases: Clean multilingual UI rendering without Vietnamese artifacts.

## Verification

- Command: `pnpm --filter @studio/shared build`
  Result: 0 errors, build successful.
- Command: `pnpm --filter @studio/server test -- test/questionBank`
  Result: 7/7 files passed, 77/77 tests passed.
- Command: `pnpm --filter @studio/web test`
  Result: 50/50 files passed, 210/210 tests passed.
- Command: `pnpm --filter @studio/web build`
  Result: 0 errors, production build built in 5.11s.
- Command: `pnpm typecheck`
  Result: 0 errors across packages/shared, apps/server, apps/web.
- Command: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`
  Result: 57/57 coordination tests passed.
- Command: `node scripts/agent-validate-zones.mjs --json`
  Result: valid: true, 0 unmapped files, 0 overlapping files.

## Open Risks

- Risk: none identified
- Suggested next action: proceed with next roadmap phase.

## Next Phase Input

- Files the next agent must read:
  - `AGENTS.md`
  - `docs/agent-coordination/master-spec.md`
  - `apps/server/src/quiz/bank/taxonomy.json`
- Commands the next agent should run first:
  - `node scripts/agent-status.mjs --json`
- Important constraints:
  - Maintain English-first normalization across all future batch generators and UI options.
