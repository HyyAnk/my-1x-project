# Step 2: Stage Studio Layout Select & Miniature Wireframe Previews Handoff Summary

## Status

- Result: completed
- Date: 2026-09-06
- Agent: subagent-2-stagestudio-sync
- Working mode: main-direct
- Baseline before edits: 66 pre-existing dirty files preserved untouched

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-06-step1-sandbox-layout-aspect-ratio-sync.md
- apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts
- apps/web/src/styles/features/mascot/stageStudio.css
- apps/web/src/features/stageStudio/questionLayouts.ts
- apps/web/src/features/stageStudio/components/StageQuestionLayoutSelect.tsx
- apps/web/src/features/stageStudio/hooks/useStageStudio.ts
- apps/web/src/features/stageStudio/questionLayouts.test.ts
- apps/web/src/i18n/locales/en/sandbox.ts

## Files Changed

- `apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts` (modified)
- `apps/web/src/styles/features/mascot/stageStudio.css` (modified)
- `apps/web/src/features/stageStudio/questionLayouts.ts` (modified)
- `apps/web/src/features/stageStudio/components/StageQuestionLayoutSelect.tsx` (modified)
- `apps/web/src/features/stageStudio/hooks/useStageStudio.ts` (modified)
- `apps/web/src/features/stageStudio/questionLayouts.test.ts` (modified)
- `apps/web/src/i18n/locales/en/sandbox.ts` (modified)
- `docs/agent-coordination/handoffs/2026-09-06-step2-stagestudio-layout-sync.md` (new)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside verified scope

## Scope

- Claimed phase: Step 2 - Stage Studio Layout Select & Miniature Wireframe Previews in `apps/web/src/features/stageStudio`
- Allowed scope used: web-api-state, web-layout-style, coordination-handoffs
- Scope deviations: Expanded claim via authenticated lease expansion to add `apps/web/src/i18n/locales/en/sandbox.ts` in writeZone `web-layout-style` for human-readable Stage Studio portrait layout strings.

## Decisions

- Decision: Expanded `QuizLayoutUiDefinition["preview"]` type union to include dedicated portrait wireframe identifiers: `"portrait-hero" | "portrait-versus" | "portrait-verdict" | "portrait-stack"`.
  - Reason: Enables precise CSS miniature wireframe rendering for each 9:16 layout without falling back to landscape approximations.
  - Impact on later phases: Gives Stage Studio wireframe views parity with actual rendered layouts across all aspect ratios.
- Decision: Implemented CSS miniature wireframes in `apps/web/src/styles/features/mascot/stageStudio.css` for `.is-portrait-hero`, `.is-portrait-versus`, `.is-portrait-verdict`, and `.is-portrait-stack`.
  - Reason: Accurately previews hero scene rectangles, stacked choice lines, split versus matchup divider, and True/False verdict buttons inside the inspector sidebar.
- Decision: Updated `getStageQuestionLayouts(aspectRatio?: StageAspectRatio)` in `questionLayouts.ts` to strictly filter layouts by aspect ratio:
  - `"9:16"` returns only the 4 portrait layouts (`portrait_hero_choices`, `portrait_split_versus`, `portrait_verdict_tf`, `portrait_stack_list`).
  - `"16:9"` (or default) returns only the 8 landscape layouts (`media_left_choices_right`, `visual_choices_three`, `visual_choices_three_pure`, `split_versus_two`, `verdict_true_false`, `full_stack_list`, `mystery_reveal`, `clue_deduction`).
  - Reason: Prevents invalid layout selections in Stage Studio that would fail render validation.
- Decision: Added `resolveInitialStageQuestionLayout` and `getCompatibleStageQuestionLayout` in `questionLayouts.ts` and integrated them into `useStageStudio`.
  - Reason: When switching aspect ratio, automatically maps between compatible layouts (`split_versus_two` <-> `portrait_split_versus`, `verdict_true_false` <-> `portrait_verdict_tf`, `full_stack_list` <-> `portrait_stack_list`, defaults <-> `portrait_hero_choices` / `media_left_choices_right`).
- Decision: Updated `StageQuestionLayoutSelect` to filter dropdown options with `getStageQuestionLayouts(aspectRatio)` and resolve fallback active layout when current layout is incompatible.
  - Reason: Eliminates UI layout mismatch and guarantees invalid layouts are never selectable in the active aspect ratio.

## Verification

- Command: `pnpm --filter @studio/web test -- src/features/stageStudio/`
  - Result: 7 passed test files, 24 passed tests
- Command: `pnpm --filter @studio/web test`
  - Result: 62 passed test files, 304 passed tests
- Command: `pnpm typecheck`
  - Result: Clean exit code 0 across `@studio/shared`, `@studio/server`, and `@studio/web`
- Command: `pnpm --filter @studio/web build`
  - Result: Vite production build succeeded in 3.08s
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: `valid: true`, 0 definition errors, 0 unmapped files, 0 overlapping files

## Open Risks

- Risk: None identified. All unit tests, typechecks, build validations, and zone checks pass cleanly with zero regressions.

## Next Phase Input

- Files the next agent must read:
  - `apps/web/src/features/stageStudio/questionLayouts.ts`
  - `apps/web/src/features/stageStudio/components/StageQuestionLayoutSelect.tsx`
  - `apps/web/src/features/stageStudio/hooks/useStageStudio.ts`
- Commands the next agent should run first:
  - `node scripts/agent-status.mjs --json`
  - `pnpm --filter @studio/web test -- src/features/stageStudio/`
- Important constraints:
  - Maintain strict 100% English requirement across all code and text.
  - Ensure aspect ratio separation remains clean between 16:9 landscape and 9:16 portrait.
