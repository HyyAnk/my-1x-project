# Phase 6: Test Suites & Snapshots Clean-up & Migration

## Purpose
Eradicate obsolete tests, visual snapshots, and update existing unit/integration tests to assert the 7-archetype / 7-layout architecture.

## Files to Delete
- `apps/server/test/quizClueDeduction.test.ts`
- `apps/server/test/__snapshots__/visual/clue_deduction-16x9-reveal.png`

## Target Test Files to Update
1. `packages/shared/test/quizLayouts.catalog.test.ts`
   - Remove assertions for `clue_deduction`.
2. `apps/server/test/candyArcadeStyles.test.ts`
   - Remove `clueDeductionLayout` import and CSS assertions.
3. `apps/server/test/choiceSynchronizationStage4.test.ts`
   - Remove `clue_deduction` test case.
4. `apps/server/test/franchiseAnchorMandate.test.ts`
   - Remove `clue_deduction` guideline instruction assertions.
5. `apps/server/test/helpers/imageSlotMeasurement.ts`
   - Remove `else if (layoutId === "clue_deduction")` measurement case.
6. `apps/server/test/helpers/visualSnapshotHarness.ts`
   - Remove `clue_deduction` visual snapshot case.
7. `apps/server/test/questionBankReverseMatrixE2E.test.ts`
   - Remove `clue_deduction` prompt and matrix test assertions.
8. `apps/server/test/questionBankSchema.test.ts`
   - Remove `clue_deduction` from valid archetypes list and choice count test.
9. `apps/server/test/questionCurationEngine.test.ts`
   - Update target archetype tests.
10. `apps/server/test/quizAssetPlannerDynamicResolution.test.ts`
    - Remove `clue_deduction` aspect ratio assertion.
11. `apps/server/test/quizAllLayoutsEndToEnd.test.ts`
    - Update count to 7 layouts and remove `clue_deduction` expectations.
12. `apps/server/test/quizImageSlotSizing.browser.test.ts`
    - Remove `clue_deduction` slot expectation.
13. `apps/server/test/quizIntegrationAudit.test.ts`
    - Remove `clue_deduction` beats and schema assertions.
14. `apps/server/test/quizLayoutAssetAspectRatioE2E.test.ts`
    - Remove `clue_deduction` test beat.
15. `apps/web/src/features/channel/components/TopicLayoutPreviewButton.test.tsx`
    - Remove `clue_deduction` test case.

## Verification
- Run full test suites:
  - `pnpm --filter @studio/shared test`
  - `pnpm --filter @studio/server test`
  - `pnpm --filter @studio/web test`
