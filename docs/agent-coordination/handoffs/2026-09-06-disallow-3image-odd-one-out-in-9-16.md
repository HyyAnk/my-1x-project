# Disallow 3-Image Archetypes and Formats in 9:16 Handoff Summary

## Status

- Result: completed
- Date: 2026-09-06
- Agent: antigravity-strict-4-portrait
- Working mode: main-direct
- Baseline before edits: 60 dirty files recorded at claim creation

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- packages/shared/src/quizLayouts.catalog.ts
- packages/shared/src/quizLayouts.policy.ts
- apps/server/src/quiz/bank/bridge/bankDirectorPlanFactory.ts

## Files Changed

- packages/shared/src/quizLayouts.catalog.ts
- packages/shared/src/quizLayouts.policy.ts
- packages/shared/test/quizLayouts.policy.test.ts
- apps/server/src/quiz/bank/bridge/bankDirectorPlanFactory.ts
- apps/server/test/bankDirectorPlanFactory.test.ts

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed phase: disallow-3image-visual-spotting-in-9-16
- Allowed scope used: shared-contracts, server-core, server-tests, coordination-handoffs
- Scope deviations: none

## Decisions

- Decision: Strictly disallow and reject `odd_one_out` format and `visual_spotting` archetype from the 9:16 vertical video system.
- Reason: User directive to guarantee exactly 4 clean layouts for 9:16 (`portrait_hero_choices`, `portrait_split_versus`, `portrait_verdict_tf`, `portrait_stack_list`) and avoid any automatic grouping/merging of 3 images into vertical canvases.
- Details:
  - Removed `odd_one_out` from `portrait_hero_choices.supportedFormats` in `@studio/shared`. None of the 4 portrait layouts support `odd_one_out`.
  - Added strict guard in `resolveQuizLayout`: throws compatibility error `layout_question_format_unsupported` when `aspectRatio === "9:16"` and `questionFormat === "odd_one_out"` or `archetype === "visual_spotting"`.
  - Removed `odd_one_out` from `preferredAutoLayout` for 9:16.
  - In `bankDirectorPlanFactory.ts`, `resolveTargetLayoutForTopic` immediately rejects `visual_spotting` and `odd_one_out` with a descriptive error when requested with `aspectRatio: "9:16"`.
  - Preserved 100% full support for `visual_spotting` and `odd_one_out` in 16:9 landscape aspect ratio (`visual_choices_three_pure`).

## Verification

- Command: `pnpm --filter @studio/shared build`
- Result: clean build, 0 errors.
- Command: `pnpm --filter @studio/shared test`
- Result: 23/23 tests passed.
- Command: `pnpm typecheck`
- Result: 100% clean across all 3 workspaces.
- Command: `pnpm --filter @studio/server test -- test/bankDirectorPlanFactory.test.ts test/questionBankResilience.test.ts test/quizLayoutCapabilities.test.ts test/quizLayoutsPortrait.test.ts`
- Result: 104/104 tests passed across 4 files.
- Command: `node scripts/agent-validate-zones.mjs --json`
- Result: valid: true, 0 unmapped, 0 overlapping.

## Open Risks

- Risk: none.
- Suggested next action: The 9:16 layout system is strictly locked to the 4 dedicated layouts without 3-image layouts or grouping logic.

## Next Phase Input

- Files the next agent must read: `packages/shared/src/quizLayouts.policy.ts`, `apps/server/src/quiz/bank/bridge/bankDirectorPlanFactory.ts`.
- Commands the next agent should run first: `node scripts/agent-status.mjs --json`
- Important constraints: Maintain 100% English-only in all codebase assets.
