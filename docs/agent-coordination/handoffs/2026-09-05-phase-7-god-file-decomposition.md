# Phase 7: God File Decomposition (Question Bank to Quiz Bridge) Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: subagent-phase-7
- Working mode: main-direct
- Baseline before edits: 123 pre-existing dirty files on main captured via `git status --porcelain`

## Source Files Read

- AGENTS.md
- GEMINI.md
- .agents/rules/agent-coordination.md
- .agents/rules/english-only.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-05-phase-6-god-file-decomposition.md

## Files Changed

### Created
- `apps/server/src/quiz/bank/bridge/bankQuestionConverter.ts` (200 lines):
  - Interface `ConvertBankQuestionOptions`
  - Function `convertBankQuestionToQuizQuestion`: Handles true/false normalization, choice shuffling/mapping, translations merging, and fallback choices.
  - Function `resolveBankQuestionTranslation`: Resolves and dynamically transcreates translation with offline failover.
  - Function `transcreateAndConvertTopicQuestions`: Transcreates and converts batches of bank questions into validated QuizQuestions.
- `apps/server/src/quiz/bank/bridge/bankDirectorPlanFactory.ts` (170 lines):
  - Function `mapToDirectorArchetype`: Maps archetype ID to DirectorArchetype.
  - Function `resolveTargetLayoutForTopic`: Resolves target layout based on suggested layout, archetype, or quiz format.
  - Function `buildSingleQuestionDirectorPlan`: Builds archetype-tailored DirectorPlan for single-question episodes.
  - Function `buildTopicDirectorPlan`: Builds archetype-tailored DirectorPlan for multi-question topic episodes.
- `apps/server/src/quiz/bank/bridge/bankEpisodeBootstrapper.ts` (329 lines):
  - Function `resolveEpisodeVisualStyles`: Resolves requested and concrete visual styles from channel presets.
  - Function `triggerPipelineTask`: Submits background GENERATE_PIPELINE tasks with graceful fallback.
  - Function `bootstrapSingleQuestionEpisode`: Generates unique slug, assets folder, and writes atomic `episode.json`, `quiz-v2.json`, and markdown stubs.
  - Function `bootstrapTopicEpisode`: Generates unique slug, assets folder, and writes atomic `episode.json`, `quiz-v2.json`, markdown stubs, and `topic_database.json`.
  - Type definitions: `CreateEpisodeFromQuestionBankInput`, `CreateEpisodeFromQuestionBankResult`, `CreateEpisodeFromTopicWithBankInput`, `CreateEpisodeFromTopicWithBankResult`.
- `apps/server/src/quiz/bank/bridge/index.ts` (3 lines):
  - Barrel export re-exporting all symbols from the bridge sub-modules.
- `docs/agent-coordination/handoffs/2026-09-05-phase-7-god-file-decomposition.md`: Phase 7 handoff documentation.

### Refactored
- `apps/server/src/quiz/bank/questionBankToQuizBridge.ts` (768 -> 122 lines, 84% reduction):
  - High-level coordinator strictly under 150 lines (122 lines).
  - Maintains 100% backward-compatible public exports:
    - `convertBankQuestionToQuizQuestion`
    - `createEpisodeFromQuestionBank`
    - `createEpisodeFromBankQuestions`
    - `createEpisodeFromTopicWithBank`
    - `createEpisodeFromTopicCandidate`
    - `ConvertBankQuestionOptions`
    - `CreateEpisodeFromQuestionBankInput`
    - `CreateEpisodeFromQuestionBankResult`
    - `CreateEpisodeFromTopicWithBankInput`
    - `CreateEpisodeFromTopicWithBankResult`

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside planned scope (only target bridge file, newly extracted sub-modules, and handoff document were created/modified)

## Scope

- Claimed phase: Phase 7 (God File Decomposition for Question Bank to Quiz Bridge)
- Allowed scope used: `server-core`, `agent-coordination`
- Scope deviations: None. All modifications strictly performed within declared claim and planned concrete files.

## Decisions

- Decision: Decompose `questionBankToQuizBridge.ts` into 3 specialized sub-modules under `apps/server/src/quiz/bank/bridge/`: question converter, director plan factory, and episode bootstrapper, bound via a clean barrel export `index.ts`.
  - Reason: Separates concerns cleanly according to SRP: data format transformation, director/beat choreography, and filesystem bootstrapping.
  - Impact on later phases: Sub-modules can be imported either via `./bridge/index.js` or directly from `./questionBankToQuizBridge.js` with zero breaking changes.
- Decision: Reduced `questionBankToQuizBridge.ts` from 768 lines down to 122 lines (well below the 150-line maximum constraint).
  - Reason: Keeps the top-level entry point as a concise coordinator orchestrating validation, conversion, bootstrapping, director planning, and background task launching.
  - Impact on later phases: Highly maintainable and testable structure.

## Verification

- Command: `pnpm --filter @studio/server test test/questionBankIntegration.test.ts`
  - Result: 7/7 tests passed (1-click integration, cooldown, transcreation bridge).
- Command: `pnpm --filter @studio/server test test/questionBankReverseMatrixE2E.test.ts`
  - Result: 24/24 tests passed.
- Command: `pnpm --filter @studio/server test test/topicToEpisodePipelineE2E.test.ts`
  - Result: 3/3 tests passed.
- Command: `pnpm --filter @studio/server test test/questionBankResilience.test.ts`
  - Result: 29/29 tests passed (including transcreation failover and boundary tests).
- Command: `pnpm typecheck`
  - Result: Monorepo TypeScript check passed cleanly across `@studio/shared`, `@studio/server`, and `@studio/web` (0 errors).
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: 19 zones valid, 0 errors, 0 unmapped files, 0 overlapping files.
- Command: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`
  - Result: 57/57 tests passed (0 failures).

## Open Risks

- None identified. All public signatures, return types, and runtime behaviors have been preserved with complete backwards compatibility.

## Next Phase Input

- Files the next agent must read:
  - `apps/server/src/quiz/bank/questionBankToQuizBridge.ts`
  - `apps/server/src/quiz/bank/bridge/index.ts`
  - `apps/server/src/quiz/bank/bridge/bankQuestionConverter.ts`
  - `apps/server/src/quiz/bank/bridge/bankDirectorPlanFactory.ts`
  - `apps/server/src/quiz/bank/bridge/bankEpisodeBootstrapper.ts`
- Commands the next agent should run first:
  - `node scripts/agent-status.mjs --json`
  - `pnpm --filter @studio/server test test/questionBankIntegration.test.ts`
- Important constraints:
  - Keep `questionBankToQuizBridge.ts` under 150 lines.
  - Maintain English-only naming, comments, and docstrings across all modules.
