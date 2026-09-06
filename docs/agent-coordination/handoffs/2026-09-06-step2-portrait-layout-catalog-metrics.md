# Step 2: Layout Catalog & Metric Specifications Handoff Summary

## Status

- Result: completed
- Date: 2026-09-06
- Agent: subagent-2-step2
- Working mode: main-direct
- Baseline before edits: 25 pre-existing dirty files preserved untouched

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-06-step1-shared-portrait-layout-enums.md
- packages/shared/src/quizLayouts.catalog.ts
- packages/shared/src/quizLayouts.types.ts
- packages/shared/src/quizLayouts.policy.ts
- apps/server/src/quiz/render/layouts/registry.ts
- apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts
- apps/server/test/quizLayoutCapabilities.test.ts
- apps/web/src/features/stageStudio/questionLayouts.test.ts
- apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.test.tsx
- apps/server/test/quizAllLayoutsEndToEnd.test.ts

## Files Changed

- packages/shared/src/quizLayouts.catalog.ts
- apps/server/src/quiz/render/layouts/registry.ts
- apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts
- apps/server/test/quizLayoutCapabilities.test.ts
- apps/server/test/quizAllLayoutsEndToEnd.test.ts
- apps/web/src/features/stageStudio/questionLayouts.test.ts
- apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.test.tsx
- docs/agent-coordination/handoffs/2026-09-06-step2-portrait-layout-catalog-metrics.md

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed phase: Step 2 - Layout Catalog & Metric Specifications in packages/shared
- Allowed scope used: shared-contracts, coordination-handoffs, render-implementation, web-layout-style, server-tests
- Scope deviations: Claim expanded via authenticated lease expansion to include render-implementation, web-layout-style, and server-tests so consumers of ResolvedQuizLayoutId and QUIZ_LAYOUTS compile and pass cleanly after expanding to 12 production layouts.

## Decisions

- Decision: Registered all 4 portrait layouts in `QUIZ_LAYOUT_CATALOG` (`portrait_hero_choices`, `portrait_split_versus`, `portrait_verdict_tf`, `portrait_stack_list`) with exact metric specifications (`render: width/height/itemCount` and `assets: maxWidth/maxHeight`) and `supportedAspectRatios: ["9:16"]`.
- Reason: Establishes complete catalog definitions and precise 9:16 geometry for vertical video pipelines.
- Decision: Restricted the 8 existing landscape layouts in `QUIZ_LAYOUT_CATALOG` (`media_left_choices_right`, `visual_choices_three`, `visual_choices_three_pure`, `split_versus_two`, `verdict_true_false`, `full_stack_list`, `mystery_reveal`, `clue_deduction`) to `supportedAspectRatios: ["16:9"]`.
- Reason: Prevents awkward landscape layouts and multi-image overflow in 9:16 vertical video renders, enforcing layout separation by aspect ratio.
- Decision: Updated `ResolvedQuizLayoutIdSchema` to `QuizLayoutIdSchema.exclude(["auto"])` and typed `ResolvedQuizLayoutId` to include all 12 resolved layout IDs (8 landscape + 4 portrait).
- Reason: Provides full exhaustiveness in schema validation and catalog lookups across both orientations.
- Decision: Configured fallback renderer delegation in `apps/server/src/quiz/render/layouts/registry.ts` and UI catalog entries in `apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts` for the 4 portrait layouts.
- Reason: Satisfies exhaustive `Record<ResolvedQuizLayoutId, ...>` and `Record<QuizPreviewLayoutId, ...>` typing across the monorepo, keeping `pnpm typecheck` at 100% green while subsequent steps implement dedicated server layout renderers (Steps 4-8).
- Decision: Updated tests in server and web (`quizLayoutCapabilities.test.ts`, `quizAllLayoutsEndToEnd.test.ts`, `questionLayouts.test.ts`, `SandboxLayoutSelector.test.tsx`) to assert 12 production layouts and orientation-aware aspect ratios.
- Reason: Ensures regression suites validate that landscape layouts require 16:9 and portrait layouts require 9:16.

## Verification

- Command: `pnpm --filter @studio/shared build` -> Result: passed
- Command: `pnpm --filter @studio/shared test` -> Result: passed
- Command: `pnpm typecheck` -> Result: passed across packages/shared, apps/server, and apps/web
- Command: `pnpm --filter @studio/server test -- test/quizLayoutCapabilities.test.ts test/quizAllLayoutsEndToEnd.test.ts` -> Result: passed (2 files, 32 tests)
- Command: `pnpm --filter @studio/web test -- src/features/stageStudio/questionLayouts.test.ts src/features/sandbox/components/design/SandboxLayoutSelector.test.tsx src/features/episode/utils/episodePreviewQuestions.test.ts` -> Result: passed (3 files, 11 tests)
- Command: `node scripts/agent-validate-zones.mjs --json` -> Result: passed (0 errors, 0 unmapped)

## Open Risks

- None for Step 2. All 12 layouts are registered, aspect ratios are partitioned (16:9 landscape vs 9:16 portrait), type contracts are exhaustive, and all consumers compile cleanly.

## Next Phase Input

- Files the next agent must read:
  - `packages/shared/src/quizLayouts.catalog.ts`
  - `packages/shared/src/quizLayouts.policy.ts`
  - `packages/shared/src/enums/quiz/pipelineEnums.ts`
- Commands the next agent should run first:
  - `node scripts/agent-status.mjs --json`
  - `git status --porcelain`
- Important constraints:
  - Step 3 subagent should update `resolveQuizLayout` and `preferredAutoLayout` in `packages/shared/src/quizLayouts.policy.ts` to automatically route 9:16 questions to optimal portrait layouts (`portrait_verdict_tf`, `portrait_split_versus`, `portrait_hero_choices`, `portrait_stack_list`).
