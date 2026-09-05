# Question Bank 10 Channel Languages Alignment & Strict English-Only Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: 42 dirty files recorded via `git status --porcelain`

## Source Files Read

- AGENTS.md
- GEMINI.md
- .agents/rules/english-only.md
- .agents/rules/agent-coordination.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- packages/shared/src/countries/data.ts
- packages/shared/src/utils/languageNormalize.ts

## Files Changed

- `packages/shared/src/utils/languageNormalize.ts` (MODIFIED: Aligned `SUPPORTED_TRANSLATION_LANGUAGES` and `normalizeLanguageCode` with the 10 canonical YouTube channel languages: EN, DE, NO, NL, DA, SV, FI, FR, KO, JA).
- `apps/web/src/features/questionBank/components/QuestionBankToolbar.tsx` (MODIFIED: Imported `TARGET_LANGUAGE_OPTIONS` from `@studio/shared` to dynamically render the 10 channel languages in the compact language pill with zero hardcoding and zero Vietnamese).
- `apps/web/src/features/questionBank/hooks/useQuestionBank.ts` (MODIFIED: Updated filter to pass `has_translation_for` for translated languages and filter `Boolean(q.translations?.[targetLang])`).
- `apps/web/src/features/questionBank/components/QuestionBankTable.tsx` (MODIFIED: Added `activeLanguage` prop, rendering translated question text and `{LANG} TRANSLATED` badges when a target language is selected).
- `apps/web/src/features/questionBank/QuestionBankView.tsx` (MODIFIED: Passed `activeLanguage={filters.languageFilter}` to `QuestionBankTable`).
- `apps/web/src/i18n/locales/en/questionBank.ts` (MODIFIED: Removed legacy Vietnamese keys and renamed labels to `Filter by Language`).
- `apps/web/src/features/questionBank/questionBankUi.test.tsx` (MODIFIED: Added test assertions asserting exactly 11 options: ALL + 10 channel languages, explicitly asserting `vi` is absent).
- `docs/agent-coordination/handoffs/2026-09-05-question-bank-10-channel-languages-alignment.md` (NEW)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed phase: Question Bank 10 Channel Languages Alignment
- Allowed scope used: shared-contracts, web-api-state, web-layout-style, agent-coordination
- Scope deviations: none

## Decisions

- Decision: Language filtering in Question Bank Studio is dynamically driven by `TARGET_LANGUAGE_OPTIONS` from `@studio/shared`, matching the exact 10 target channel languages: EN, DE, NO, NL, DA, SV, FI, FR, KO, JA.
- Reason: Canonical English (`en`) is the single source of truth for 100% of authored questions in the bank. Filtering by target language reflects cached transcreated questions produced for multi-channel publishing.
- Decision: Strict English-only enforcement across all code, tests, and configuration without any Vietnamese references or suggestions.

## Verification

- Command: `pnpm --filter @studio/shared build`
  - Result: Passed (exit code 0).
- Command: `pnpm --filter @studio/shared test`
  - Result: Passed (exit code 0).
- Command: `pnpm typecheck`
  - Result: Passed (0 errors across `packages/shared`, `apps/server`, `apps/web`).
- Command: `pnpm --filter @studio/web test -- src/features/questionBank/questionBankUi.test.tsx --run`
  - Result: Passed (7/7 tests passed).
- Command: `pnpm --filter @studio/server test -- test/questionBank --run`
  - Result: Passed (80/80 tests passed across 7 test suites).
- Command: `pnpm --filter @studio/web build`
  - Result: Passed (built in 3.47s).
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: Passed (`valid: true`, 1033 files across 19 zones, 0 unmapped, 0 overlapping).

## Residual Risks & Blockers

- None. All 10 channel languages are integrated, verified, and strictly decoupled from Vietnamese.
