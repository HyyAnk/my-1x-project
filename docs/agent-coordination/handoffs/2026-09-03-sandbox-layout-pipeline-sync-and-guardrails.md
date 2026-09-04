# Sandbox Layout UI Guardrails & Pipeline Media Sync Handoff Summary

## Status

- Result: completed
- Date: 2026-09-03
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: 63 pre-existing dirty files preserved

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- apps/web/src/features/sandbox/VisualSandboxTab.tsx
- apps/web/src/features/sandbox/components/SandboxContentTab.tsx
- apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.ts
- apps/server/src/quiz/layoutCompatibility.ts
- packages/shared/src/sandboxPreviewLayoutPolicy.ts

## Files Changed

- `apps/server/src/quiz/layoutCompatibility.ts`: Filtered `media` by `getQuizLayoutCapability(requestedLayout).media.supported` when `requestedLayout !== "auto"`, preventing false `layout_media_unsupported` rejection for media-less layouts like `full_stack_list`.
- `apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.ts`: Mapped `split_versus_two` to `question_format: "multiple_choice"` instead of hardcoding to `"true_false"`.
- `apps/web/src/features/sandbox/components/SandboxContentTab.tsx`: Added `layoutId` and `onLayoutChange` props; auto-adapted layout to `media_left_choices_right` on adding 3rd choice from 2-choice layouts, and to `split_versus_two` on trimming to 2 choices from 3-choice layouts.
- `apps/web/src/features/sandbox/VisualSandboxTab.tsx`: Implemented two-way auto-adaptation in `handleApplyPresetQuestion` when selecting preset questions, and enhanced `handleLayoutChange` to prevent `"Đúng, Sai, Lựa chọn C"` hybrid choices.
- `apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx`: Added integration test for accurate `question_format` inference across `split_versus_two`, `verdict_true_false`, and `visual_choices_three_pure`.
- `apps/server/test/quizLayoutCapabilities.test.ts`: Added test verifying `full_stack_list` resolves safely even with default Director `asset_intents: ["question_illustration"]`.

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside claimed scope

## Scope

- Claimed zones: `render-inputs`, `web-api-state`, `web-layout-style`, `server-tests`, `agent-coordination`
- Allowed scope used: Sandbox layout guardrails, Question format inference, Pipeline media filter, and test suites

## Decisions

- Decision: Automatically adapt layout when switching between 2-choice and 3-choice questions or clicking choice count buttons in Visual Sandbox.
- Reason: Completely eliminates HTTP 400 `QUIZ_LAYOUT_INCOMPATIBLE` crashes when experimenting in the Sandbox.
- Decision: Explicitly set `question_format: "multiple_choice"` for `split_versus_two`.
- Reason: Guarantees 1v1 face-off format renders as visual choice cards rather than falling back to text presentation.
- Decision: Filter media in `resolveQuestionLayout` by `capability.media.supported`.
- Reason: Prevents `layout_media_unsupported` blocker errors when Director assigns default asset intents to text-only layouts like `full_stack_list`.

## Verification

- Command: `pnpm --filter @studio/shared build`
  - Result: Passed (0 errors)
- Command: `pnpm typecheck`
  - Result: Passed (0 errors across 3 workspaces)
- Command: `pnpm --filter @studio/web build`
  - Result: Passed (Vite production build successful)
  - Command: `pnpm --filter @studio/web test`
  - Result: Passed (41/41 test files, 156/156 tests passing)
- Command: `pnpm --filter @studio/server test -- test/quizRenderStyleContract.test.ts test/quizSceneModel.test.ts test/quizLayoutCapabilities.test.ts test/quizAllLayoutsEndToEnd.test.ts`
  - Result: Passed (50/50 tests passing)
- Command: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`
  - Result: Passed (57/57 coordination tests passing)
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: Passed (`valid: true`)

## Open Risks

- None. All 6 layouts are fully guarded, mutually compatible, and verified across web UI and server pipeline.
