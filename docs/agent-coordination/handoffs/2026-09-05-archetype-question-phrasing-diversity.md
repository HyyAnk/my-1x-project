# Archetype Question Phrasing Diversity & Anti-Repetition Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: `docs/system-map.md` (unmodified)

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md

## Files Changed

- `apps/server/src/quiz/bank/batchGeneratorPrompt.ts`
- `apps/server/src/quiz/bank/questionBankAutoQa.ts`
- `apps/server/test/questionBankAutoQa.test.ts`
- `apps/server/test/questionBankReverseMatrixE2E.test.ts`

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes (`docs/system-map.md` dirty baseline preserved)
- Pre-existing dirty files touched: none

## Scope

- Claimed task: `enhance-archetype-question-phrasing-diversity`
- Claimed zones: `server-core`, `server-tests`
- Allowed scope used: `apps/server/src/quiz/bank/batchGeneratorPrompt.ts`, `apps/server/src/quiz/bank/questionBankAutoQa.ts`, `apps/server/test/questionBankAutoQa.test.ts`, `apps/server/test/questionBankReverseMatrixE2E.test.ts`
- Scope deviations: none

## Decisions

- Decision: Upgraded `ARCHETYPE_GUIDELINES` and injected dedicated Archetype Directives (`versus_faceoff`, `visual_spotting`, `clue_deduction`, `mystery_reveal`, `visual_identification`) into both `buildBatchGenerationPrompt` and `buildReverseGenerationPrompt`.
- Reason: The LLM previously lacked varied phrasing models for these 5 archetypes, resulting in 90%–100% monotonous boilerplate repetitions (e.g. `is the odd one out?`, `Which [adjective] [noun] [verb clause]?`, redundant `: Option A or Option B?`).
- Decision: Added `sanitizeBankQuestionText` to automatically trim redundant trailing choice names (`: Option A or Option B?`) from `versus_faceoff` candidate questions.
- Reason: The split-screen card layout already renders choices A & B as prominent UI elements; including them in the question text wastes mobile character limits and causes repetitive phrasing.
- Decision: Added `detectSyntacticRepetition` in `questionBankAutoQa.ts` to detect and reject intra-batch syntactic boilerplate repetition (3+ consecutive identical 2-word prefixes or repetitive formulaic suffixes like `odd one out`).
- Reason: Jaccard and Bigram similarity checks alone failed to catch grammatical boilerplate across varying entity subjects.

## Verification

- Command: `pnpm --filter @studio/server test test/questionBankAutoQa.test.ts`
- Result: PASSED (13 tests)
- Command: `pnpm --filter @studio/server test test/questionBankReverseMatrixE2E.test.ts`
- Result: PASSED (24 tests)
- Command: `pnpm --filter @studio/server test test/questionBankBatchService.test.ts`
- Result: PASSED (7 tests)
- Command: `pnpm typecheck`
- Result: PASSED (0 errors across packages)
- Command: `node scripts/agent-validate-zones.mjs --json`
- Result: PASSED (valid: true, 0 unmapped, 0 overlapping)

## Open Risks

- Risk: External LLMs might occasionally fail to adhere to anti-repetition instructions under heavy token compression.
- Suggested next action: The newly added `detectSyntacticRepetition` and `sanitizeBankQuestionText` act as resilient downstream filters preventing malformed candidates from being saved.

## Next Phase Input

- Files the next agent must read: `apps/server/src/quiz/bank/batchGeneratorPrompt.ts`, `apps/server/src/quiz/bank/questionBankAutoQa.ts`
- Commands the next agent should run first: `node scripts/agent-status.mjs --json`
- Important constraints: Maintain English-only in all codebase assets. Do not touch pre-existing dirty files (`docs/system-map.md`).
