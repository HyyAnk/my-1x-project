# Phase 4: Web UI - Question Bank, Topic Confirmation & Wireframes

## Purpose
Remove `clue_deduction` from all Question Bank web tables, filters, stats, AI generation configs, channel topic layout maps, and wireframe modal popovers.

## Target Files to Modify

1. `apps/web/src/features/questionBank/components/QuestionBankTable.tsx`
   - Remove `clue_deduction` from `ARCHETYPE_META`.
2. `apps/web/src/features/questionBank/components/QuestionBankMetaFields.tsx`
   - Remove `clue_deduction` from `ARCHETYPE_OPTIONS`.
3. `apps/web/src/features/questionBank/components/QuestionBankHeaderStats.tsx`
   - Remove `clue_deduction` from `ARCHETYPE_CHIPS`.
4. `apps/web/src/features/questionBank/components/aiGenerate/AiGenerateManualConfig.tsx`
   - Remove `clue_deduction` from `ARCHETYPE_OPTIONS`.
5. `apps/web/src/features/channel/constants/layoutPreviewCatalog.ts`
   - Remove `clue_deduction` from `ARCHETYPE_LAYOUT_MAP` and `LAYOUT_CATALOG`.
6. `apps/web/src/features/channel/components/LayoutWireframeModal.tsx`
   - Remove `layoutId === "clue_deduction"` wireframe branch.
7. `apps/web/src/styles/features/topics/wireframeVariants.css`
   - Remove `.wf-deduction-row`, `.wf-clue-box`, `.wf-reveal-box` and related styles.
8. `apps/web/src/styles/features/topics/layoutBadgeButton.css`
   - Remove `.topic-layout-badge-btn.is-clue-deduction` styles.
9. `apps/web/src/i18n/locales/en/questionBank.ts`
   - Remove `clue_deduction: "Clue Deduction"`.

## Verification
- Verify that Question Bank UI builds and filters correctly across the 7 remaining archetypes.
