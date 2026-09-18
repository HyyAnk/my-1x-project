# Phase 5: Web UI - Stage Studio, Sandbox & Layout Catalogs

## Purpose
Remove `clue_deduction` from Stage Studio layout selector, Visual Sandbox synchronization hooks, preview request formats, locale strings, and sample assets.

## Target Files to Modify

1. `apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts`
   - Remove `clue_deduction` definition from `QUIZ_LAYOUT_UI_BY_ID`.
2. `apps/web/src/features/sandbox/hooks/useSandboxLayoutSync.ts`
   - Remove `newLayoutId === "clue_deduction"` check.
3. `apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.ts`
   - Remove `design.layoutId === "clue_deduction"` condition.
4. `apps/web/src/i18n/locales/en/sandbox.ts`
   - Remove `layoutClueDeduction` and `layoutClueDeductionDesc` keys.
5. `apps/web/public/sample-images/sample-4-3.svg`
   - Update text label to remove "Clue Deduction".

## Verification
- Verify that Sandbox preview renderer and Stage Studio compile cleanly without references to `clue_deduction`.
