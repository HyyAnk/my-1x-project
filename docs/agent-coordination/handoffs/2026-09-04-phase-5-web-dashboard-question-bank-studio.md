# Phase 5: Web Dashboard Question Bank Studio Multilingual UI & Preview Handoff Summary

## Status

- Result: completed
- Date: 2026-09-04
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: 109 dirty files recorded via `git status --porcelain`

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-04-phase-4-multilingual-transcreation-pipeline.md
- apps/server/src/routes/questionBank.ts
- apps/web/src/api/questionBankApi.ts
- apps/web/src/features/questionBank/types/questionBankUi.types.ts
- apps/web/src/features/questionBank/hooks/useQuestionBank.ts
- apps/web/src/features/questionBank/components/QuestionBankToolbar.tsx
- apps/web/src/features/questionBank/components/QuestionBankTable.tsx
- apps/web/src/features/questionBank/components/QuestionBankLivePreview.tsx
- apps/web/src/features/questionBank/QuestionBankView.tsx
- apps/web/src/styles/features/questionBank.css
- apps/web/src/features/questionBank/questionBankUi.test.tsx

## Files Changed

- apps/server/src/routes/questionBank.ts (MODIFIED: Forwarded `hasTranslationFor` query parameter in channels and global question bank queries)
- apps/web/src/api/questionBankApi.ts (MODIFIED: Added `transcreateQuestion` method for on-demand AI transcreation and imported `BankTranslationContent`)
- apps/web/src/features/questionBank/types/questionBankUi.types.ts (MODIFIED: Added `languageFilter`, `translationFilter` in `QuestionBankFilters` and exported `BankTranslationContent`)
- apps/web/src/features/questionBank/hooks/useQuestionBank.ts (MODIFIED: Added `transcreateQuestion` with in-memory local state cache updates, updated `fetchQuestions` to filter by source language and Vietnamese translation status)
- apps/web/src/features/questionBank/components/QuestionBankToolbar.tsx (MODIFIED: Added dropdowns for source language filter and translation availability filter)
- apps/web/src/features/questionBank/components/QuestionBankTable.tsx (MODIFIED: Added source language badge [🇬🇧 EN / 🇻🇳 VI] and Vietnamese translation status badge [🇻🇳 Đã dịch / Chưa dịch VI] in each question row)
- apps/web/src/features/questionBank/components/QuestionBankLivePreview.tsx (MODIFIED: Added multilingual tab switcher between Original and Vietnamese, live translated layout preview, transcreation action banner, and on-demand AI translation button with loading spinner)
- apps/web/src/features/questionBank/QuestionBankView.tsx (MODIFIED: Wired `transcreating` and `transcreateQuestion` down to QuestionBankLivePreview)
- apps/web/src/styles/features/questionBank.css (MODIFIED: Added styles for language pills, translation badges, switcher tabs, action banner, transcreate button, and spin animation)
- apps/web/src/features/questionBank/questionBankUi.test.tsx (MODIFIED: Added comprehensive test coverage for multilingual toolbar filters, table language badges, live preview language switching, and on-demand transcreation trigger)
- docs/agent-coordination/handoffs/2026-09-04-phase-5-web-dashboard-question-bank-studio.md (NEW)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed phase: Phase 5 (Web Dashboard Question Bank Studio Multilingual UI & Preview)
- Allowed scope used: api-contracts, web-api-state, web-layout-style, agent-coordination
- Scope deviations: none

## Decisions

- Decision: Language switcher segmented control in `QuestionBankLivePreview` allowing instant toggling between `Original (🇬🇧 EN)` and `Translation (🇻🇳 VI)`.
- Reason: Editorial preview — creators can verify how the question looks in Vietnamese before generating videos, without losing access to the original English content.
- Decision: Action banner with on-demand AI transcreation button inside `QuestionBankLivePreview` when viewing Vietnamese on an untranslated question.
- Reason: Non-intrusive, zero-friction workflow — users can translate individual questions in ~1.5s right from the preview deck without leaving the screen.
- Decision: Immediate optimistic update of in-memory `questions` and `selectedQuestion` state upon successful transcreation.
- Reason: Seamless UX — the question table badge instantly turns green ("🇻🇳 Đã dịch") and the preview immediately swaps to Vietnamese text without requiring a full page refresh.
- Decision: Source language and translation status filter dropdowns in `QuestionBankToolbar`.
- Reason: Enables creators to quickly isolate questions that still need translation or view only questions that already have ready-to-use Vietnamese copies.

## Verification

- Command: `pnpm --filter @studio/web test -- src/features/questionBank/questionBankUi.test.tsx`
  - Result: Passed (5/5 tests passed in 92ms).
- Command: `pnpm --filter @studio/web test`
  - Result: Passed (202/202 tests passed across 49 test suites in 16.95s).
- Command: `pnpm --filter @studio/web build`
  - Result: Passed (Vite production build succeeded in 4.11s).
- Command: `pnpm typecheck`
  - Result: Passed (0 errors across `@studio/shared`, `@studio/server`, `@studio/web`).
- Command: `pnpm --filter @studio/server test -- test/questionBank`
  - Result: Passed (72/72 tests passed across 7 test suites in 12.49s).
- Command: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`
  - Result: Passed (57/57 tests passed in 12.38s).
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: Passed (valid: true, 1026 files, 0 unmapped, 0 overlapping).

## Open Risks

- None. The 5-Phase Multilingual Transcreation Bridge is now completely realized end-to-end (Contracts, AI Engine, Repository Cache, 1-Click Pipeline, and Web Studio UI).
