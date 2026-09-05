# Question Bank Dashboard Tab Access & Stability Fix Handoff Summary

## Status

- Result: completed
- Date: 2026-09-04
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: 110 dirty files recorded via `git status --porcelain`

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-04-phase-5-web-dashboard-question-bank-studio.md
- apps/web/src/hooks/router/hashCodec.ts
- apps/web/src/hooks/useRouter.ts
- apps/web/src/components/AppViewRouter.tsx
- apps/web/src/components/chrome/Sidebar.tsx
- apps/web/src/features/questionBank/hooks/useQuestionBank.ts
- apps/web/src/features/questionBank/components/QuestionBankLivePreview.tsx
- apps/web/src/features/questionBank/components/QuestionBankTable.tsx
- apps/server/src/routes/questionBank.ts
- apps/server/src/repository/quiz/questionBankRepository.ts

## Files Changed

- apps/web/src/hooks/router/hashCodec.ts (MODIFIED: Added `question_bank` and `question-bank` to recognized root routes in `parseHash`)
- apps/web/src/hooks/router/hashCodec.test.ts (NEW: Added comprehensive vitest suite for route parsing and hash building)
- apps/web/src/features/questionBank/hooks/useQuestionBank.ts (MODIFIED: Refined `initialChannelId` tracking with ref, removed `selectedQuestion` from `fetchQuestions` callback dependencies to eliminate re-fetching loops, added client-side language filtering fallback)
- apps/web/src/components/chrome/Sidebar.tsx (MODIFIED: Used `t("sidebar.questionBank")` for i18n support)
- apps/web/src/i18n/locales/vi/common.ts (MODIFIED: Added `questionBank: "Ngân hàng câu hỏi"`)
- apps/web/src/i18n/locales/en/common.ts (MODIFIED: Added `questionBank: "Question Bank"`)
- apps/web/src/features/questionBank/components/QuestionBankLivePreview.tsx (MODIFIED: Added defensive checks for `question.subtopic_id` and `question.thinking_seconds`)
- apps/web/src/features/questionBank/components/QuestionBankTable.tsx (MODIFIED: Guarded pagination range display when total is 0 or filtered)
- apps/web/src/components/AppViewRouter.test.tsx (MODIFIED: Added lazy-load and render test for `question_bank` page)
- apps/server/src/routes/questionBank.ts (MODIFIED: Forwarded `language` query parameter to repository queries)
- apps/server/src/repository/quiz/questionBankRepository.ts (MODIFIED: Supported `language` query option in `QueryQuestionBankParams` and `queryQuestionBankQuestions`)
- docs/agent-coordination/handoffs/2026-09-04-fix-question-bank-dashboard-tab-access.md (NEW)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed task: Fix Question Bank tab navigation and stability
- Allowed scope used: web-api-state, web-layout-style, api-contracts, artifact-contracts
- Scope deviations: none

## Decisions

- Decision: Support both `question_bank` and `question-bank` in `hashCodec.parseHash`.
- Reason: Robust navigation — whether clicking the sidebar item (`#/question_bank`), following a direct URL with hyphen (`#/question-bank`), or typing in the browser address bar, users are always routed directly to Question Bank without falling back to Dashboard.
- Decision: Use `useRef` for tracking `initialChannelId` in `useQuestionBank`.
- Reason: Avoids resetting user-chosen global filter ("Toàn cục") back to the channel ID on every re-render.
- Decision: Remove `selectedQuestion` from `fetchQuestions` dependencies using functional state updater `setSelectedQuestion((prev) => ...)`.
- Reason: Eliminates unnecessary state oscillation and double network fetches when the first item is selected.
- Decision: End-to-end `language` query parameter support on server and web fallback.
- Reason: Allows filtering by source language (`en`, `vi`) consistently across the REST API and UI.

## Verification

- Command: `pnpm --filter @studio/web test -- src/hooks/router/hashCodec.test.ts`
  - Result: Passed (5/5 tests passed in 3ms).
- Command: `pnpm --filter @studio/web test -- src/components/AppViewRouter.test.tsx`
  - Result: Passed (11/11 tests passed in 4018ms, including lazy-loading and rendering of QuestionBankView).
- Command: `pnpm --filter @studio/web test -- src/features/questionBank/questionBankUi.test.tsx`
  - Result: Passed (5/5 tests passed in 203ms).
- Command: `pnpm --filter @studio/web test`
  - Result: Passed (208/208 tests passed across 50 test suites in 18.67s).
- Command: `pnpm --filter @studio/server test -- test/questionBank`
  - Result: Passed (77/77 tests passed across 7 test suites in 17.51s).
- Command: `pnpm typecheck`
  - Result: Passed (0 errors across `@studio/shared`, `@studio/server`, `@studio/web`).
- Command: `pnpm --filter @studio/web build`
  - Result: Passed (Vite production build succeeded in 2.87s).
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: Passed (valid: true, 1027 files mapped, 0 unmapped, 0 overlapping).
- Command: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`
  - Result: Passed (57/57 tests passed in 13.14s).

## Open Risks

- None. All tests, builds, typechecks, and zone validations pass cleanly.
