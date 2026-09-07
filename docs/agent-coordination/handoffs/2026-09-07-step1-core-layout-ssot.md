# Step 1: Core Layout Catalog & Mapping Unification Handoff Summary

## Status

- Result: completed
- Date: 2026-09-07
- Agent: subagent-step1-core-layout-ssot
- Working mode: main-direct
- Baseline before edits: 54 pre-existing dirty files recorded in baseline; none touched.

## Source Files Read

- AGENTS.md
- GEMINI.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- packages/shared/src/quizLayouts.catalog.ts
- packages/shared/src/quizLayouts.policy.ts
- packages/shared/src/quizLayouts.ts
- packages/shared/src/index.ts
- packages/shared/test/quizLayouts.policy.test.ts

## Files Changed

- packages/shared/src/quizLayouts.catalog.ts: Exported `QUIZ_LANDSCAPE_LAYOUT_IDS` and `QuizLandscapeLayoutId`.
- packages/shared/src/quizLayouts.policy.ts: Implemented and exported `getCompatibleQuizLayout` (bidirectional mapping, idempotent calls, fallbacks) and `filterQuizLayoutsByAspectRatio`. Replaced local candidate arrays with catalog constants.
- packages/shared/test/quizLayouts.policy.test.ts: Added unit test suites verifying `getCompatibleQuizLayout` and `filterQuizLayoutsByAspectRatio`.

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed zone: `shared-layout-contracts`
- Allowed scope used: `packages/shared/src/quizLayouts.catalog.ts`, `packages/shared/src/quizLayouts.policy.ts`, `packages/shared/test/quizLayouts.policy.test.ts`
- Scope deviations: none

## Decisions

- Decision 1 (SSOT for Landscape Layouts): Formally declared `QUIZ_LANDSCAPE_LAYOUT_IDS` and its TypeScript type `QuizLandscapeLayoutId` in `quizLayouts.catalog.ts` alongside `QUIZ_PORTRAIT_LAYOUT_IDS`.
  - Reason: Landscape layouts previously existed implicitly across individual catalog keys and local arrays in `quizLayouts.policy.ts`. Exporting the constant and type establishes an authoritative catalog for downstream packages (`apps/web`, `apps/server`, Remotion renderers).
  - Impact on later phases: Steps 2-5 can now rely on `QUIZ_LANDSCAPE_LAYOUT_IDS` and `filterQuizLayoutsByAspectRatio` without hardcoding layout arrays.

- Decision 2 (Aspect Ratio Cross-Mapping Logic): Implemented `getCompatibleQuizLayout` in `quizLayouts.policy.ts`.
  - Behavior:
    - Target 9:16: Preserves existing portrait layouts; maps `split_versus_two` -> `portrait_split_versus`, `verdict_true_false` -> `portrait_verdict_tf`, `full_stack_list` -> `portrait_stack_list`; falls back to `portrait_hero_choices`.
    - Target 16:9: Preserves existing landscape layouts; maps `portrait_split_versus` -> `split_versus_two`, `portrait_verdict_tf` -> `verdict_true_false`, `portrait_stack_list` -> `full_stack_list`; falls back to `media_left_choices_right`.
  - Reason: Provides predictable bidirectional layout transitions when switching aspect ratios in the editor, generator, and sandbox.

- Decision 3 (Aspect Ratio Filter Helper): Implemented `filterQuizLayoutsByAspectRatio(aspectRatio?: "16:9" | "9:16")` returning portrait layouts for `"9:16"` and landscape layouts for `"16:9"` or undefined default.
  - Reason: Ensures consumers filter layout choices uniformly according to active video format.

## Verification

- Command: `pnpm --filter @studio/shared build`
  - Result: Passed cleanly (exit code 0).
- Command: `pnpm --filter @studio/shared test`
  - Result: 30 tests in 6 suites passed (exit code 0).
- Command: `pnpm typecheck`
  - Result: Typecheck passed across all workspace packages (`@studio/shared`, `apps/server`, `apps/web`) with zero errors (exit code 0).

## Open Risks

- Risk: None identified. All exports are additive and re-exported via `@studio/shared` barrel files.
- Suggested next action: Proceed to Step 2 (Web UI & Layout Selector unification).

## Next Phase Input

- Files the next agent must read:
  - `packages/shared/src/quizLayouts.catalog.ts`
  - `packages/shared/src/quizLayouts.policy.ts`
  - `docs/agent-coordination/handoffs/2026-09-07-step1-core-layout-ssot.md`
- Commands the next agent should run first:
  - `node scripts/agent-status.mjs --json`
- Important constraints:
  - Import `getCompatibleQuizLayout`, `filterQuizLayoutsByAspectRatio`, `QUIZ_LANDSCAPE_LAYOUT_IDS`, and `QUIZ_PORTRAIT_LAYOUT_IDS` directly from `@studio/shared`.
