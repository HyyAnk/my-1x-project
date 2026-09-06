# Step 7: Question Bank Curation & Reverse Matrix Filtering for 9:16 Handoff Summary

## Status

- Result: completed
- Date: 2026-09-06
- Agent: subagent-7-bank-curation-sync
- Working mode: main-direct
- Baseline before edits: 88 dirty files recorded at claim creation

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-06-disallow-3image-odd-one-out-in-9-16.md
- docs/agent-coordination/handoffs/2026-09-06-question-bank-9-16-portrait-routing.md
- apps/server/src/quiz/bank/questionCurationEngine.ts
- apps/server/src/quiz/bank/questionJitSeeder.ts
- apps/server/test/questionCurationEngine.test.ts

## Files Changed

- apps/server/src/quiz/bank/questionCurationEngine.ts
- apps/server/src/quiz/bank/questionJitSeeder.ts
- apps/server/test/questionCurationEngine.test.ts
- docs/agent-coordination/handoffs/2026-09-06-step7-question-bank-9-16-sync.md

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed phase: step7-question-bank-9-16-sync
- Allowed scope used: server-core, server-tests, coordination-handoffs
- Scope deviations: none

## Decisions

- Decision: Added mapping branches for the 4 dedicated 9:16 portrait layouts in `resolveTargetArchetype(topic: TopicCandidate)`:
  - `portrait_hero_choices`: returns `"deep_trivia"`
  - `portrait_split_versus`: returns `"versus_faceoff"`
  - `portrait_verdict_tf`: returns `"verdict_true_false"`
  - `portrait_stack_list`: returns `"speed_blitz"`
- Decision: Added optional `aspectRatio?: "16:9" | "9:16"` to `CurateQuestionsForTopicDeps` and `EnsureTopicQuestionsWithJitDeps`.
- Decision: In `curateQuestionsForTopic`, when `deps.aspectRatio === "9:16"`:
  - If `targetArchetype` resolves to `"visual_spotting"` or `"visual_identification"`, cleanly fall back `targetArchetype` to `"deep_trivia"`.
  - Filter candidates to strictly exclude any question with format `"odd_one_out"` or archetype `"visual_spotting"`.
  - Guarantees no 3-image / spotting questions are selected for 9:16 vertical video.
- Decision: In `ensureTopicQuestionsWithJitFallback`:
  - Forward `aspectRatio` to `curateQuestionsForTopic`.
  - If `deps.aspectRatio === "9:16"` and `archetypeId === "visual_spotting"`, re-assign `archetypeId` to `"deep_trivia"`.

## Verification

- Command: `pnpm --filter @studio/server test -- test/questionCurationEngine.test.ts`
  - Result: 19 passed tests across 1 file.
- Command: `pnpm --filter @studio/server test -- test/bankDirectorPlanFactory.test.ts test/questionBankResilience.test.ts test/questionBankAutoQa.test.ts test/questionBankIntegration.test.ts test/questionBankJobManager.test.ts test/questionBankRoute.test.ts test/questionBankClear.test.ts test/questionBankTranscreation.test.ts test/questionJitSeeding.test.ts test/questionCurationEngine.test.ts`
  - Result: 131 passed tests across 10 test files.
- Command: `pnpm typecheck`
  - Result: Passed across all workspaces (`@studio/shared`, `apps/server`, `apps/web`).
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: valid: true, 0 unmapped, 0 overlapping.

## Open Risks

- Risk: none. Curation and JIT seeder handle both 16:9 and 9:16 cleanly with complete backward compatibility.

## Next Phase Input

- Files the next agent must read:
  - `apps/server/src/quiz/bank/questionCurationEngine.ts`
  - `apps/server/src/quiz/bank/questionJitSeeder.ts`
  - `apps/server/test/questionCurationEngine.test.ts`
- Commands the next agent should run first:
  - `node scripts/agent-status.mjs --json`
- Important constraints: Maintain strict English-only across repository code and preserve the 4-layout portrait architecture without 3-image / spotting questions in 9:16.
