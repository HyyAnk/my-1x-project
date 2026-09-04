# Sandbox Layout UI Fixes & End-to-End Layout Verification Handoff Summary

## Status

- Result: completed
- Date: 2026-09-03
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: 49 pre-existing dirty files preserved

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts
- apps/web/src/i18n/locales/vi/sandbox.ts
- apps/web/src/i18n/locales/en/sandbox.ts
- packages/shared/src/sandboxPreviewLayoutPolicy.ts

## Files Changed

- `apps/web/src/i18n/locales/vi/sandbox.ts`: Added unique, clear labels, subtitles, and sample question presets for all 6 layouts.
- `apps/web/src/i18n/locales/en/sandbox.ts`: Added unique, clear English labels, subtitles, and sample question presets for all 6 layouts.
- `apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts`: Assigned distinct i18n keys and correct icon/preview mappings for all 6 layouts.
- `apps/web/src/features/sandbox/hooks/useSandboxQuestionState.ts`: Added True/False and 1v1 Versus presets.
- `apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.tsx`: Preserved combobox selection with all 6 options.
- `apps/web/src/features/sandbox/components/SandboxContentTab.tsx`: Rendered all 5 sample question buttons and added 2/3 choice toggling.
- `apps/web/src/features/sandbox/VisualSandboxTab.tsx`: Implemented `handleLayoutChange` to dynamically adapt choices when switching to 2-choice layouts.
- `apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.ts`: Passed derived `question_format` in `SandboxPreviewRequest`.
- `apps/web/src/features/stageStudio/questionLayouts.test.ts`: Updated test assertions for 6 production layouts.
- `apps/web/src/features/episode/utils/episodePreviewQuestions.test.ts`: Updated expectations for smart auto-resolved layouts.
- `apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.test.tsx`: Updated combobox option count assertion to 6.
- `apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx`: Added `afterEach` test cleanup to prevent timer bleed.
- `packages/shared/src/sandboxPreviewLayoutPolicy.ts`: Filtered requested media by `capability.media.supported` to prevent false rejection of media-less layouts like `full_stack_list`.
- `apps/server/test/quizAllLayoutsEndToEnd.test.ts`: Added comprehensive 25-test E2E integration test suite covering Archetype registry, layout auto-resolution, 16:9 and 9:16 scene rendering, and sandbox preview composition across all 6 layouts.

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: None outside claimed scope

## Scope

- Claimed zones: `web-api-state`, `web-layout-style`, `server-tests`, `shared-contracts`, `agent-coordination`
- Allowed scope used: UI bug fixes, test synchronization, E2E test suite, and coordination artifacts

## Decisions

- Decision: Automatically adapt choices in Sandbox when selecting `verdict_true_false` (default to `["Đúng", "Sai"]`) and `split_versus_two` (trim to 2 choices).
- Reason: Prevents `400 QUIZ_LAYOUT_INCOMPATIBLE` crashes caused by 3-choice defaults when exploring 2-choice layouts in Sandbox.
- Decision: Filter media in `sandboxPreviewLayoutPolicy` by `capability.media.supported`.
- Reason: Prevents `layout_media_unsupported` false positives for text-only layouts such as `full_stack_list`.

## Verification

- Command: `pnpm --filter @studio/shared build`
  - Result: Passed (TypeScript build successful)
- Command: `pnpm typecheck`
  - Result: Passed (0 errors across 3 workspaces)
- Command: `pnpm --filter @studio/web build`
  - Result: Passed (Vite production build successful)
- Command: `pnpm --filter @studio/web test`
  - Result: Passed (41/41 test files, 155/155 tests passing)
- Command: `pnpm --filter @studio/server test -- test/quizAllLayoutsEndToEnd.test.ts`
  - Result: Passed (25/25 integration tests passing)
- Command: `pnpm --filter @studio/server test`
  - Result: Passed (124/124 test files, 752/752 tests passing)
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: Passed (`valid: true`)

## Open Risks

- None. All 6 layouts are fully integrated, styled, auto-resolved, tested, and verified across web and server.
