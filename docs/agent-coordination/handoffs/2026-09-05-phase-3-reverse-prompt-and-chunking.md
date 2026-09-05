# Phase 3: Reverse Prompt Builder & 20-Question Chunking Engine Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: Pre-existing dirty files preserved in workspace baseline

## Source Files Read

- AGENTS.md
- GEMINI.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- packages/shared/src/schemas/questionBank.ts
- apps/server/src/quiz/bank/knowledgeBaseLoader.ts
- apps/server/src/quiz/bank/matrixCoverageService.ts
- apps/server/src/quiz/bank/batchGeneratorPrompt.ts
- apps/server/src/quiz/bank/questionBankBatchService.ts

## Files Changed

- apps/server/src/quiz/bank/batchGeneratorPrompt.ts (Added buildReverseGenerationPrompt, parseReverseBatchGenerationOutput with strict 1-to-1 entity anchoring, traits/facts injection, and distractor pool matching)
- apps/server/src/quiz/bank/questionBankBatchService.ts (Implemented 20-question chunking loop, candidate selection via Auto and Manual diversity modes, in-flight matrix state updates, real-time chunk progress emission, and open batch fallback)
- apps/server/test/questionBankBatchService.test.ts (NEW: unit tests covering reverse prompt building, reverse parsing with entity_id correlation, raw candidates QA override, and multi-chunk execution)
- docs/agent-coordination/handoffs/2026-09-05-phase-3-reverse-prompt-and-chunking.md (NEW)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside claimed scope

## Scope

- Claimed phase: server-core, server-tests, agent-coordination
- Allowed scope used: apps/server/src/quiz/bank/batchGeneratorPrompt.ts, apps/server/src/quiz/bank/questionBankBatchService.ts, apps/server/test/questionBankBatchService.test.ts, docs/agent-coordination/handoffs/2026-09-05-phase-3-reverse-prompt-and-chunking.md
- Scope deviations: none

## Decisions

- Decision: Enforced strict 1-to-1 entity anchoring in \`buildReverseGenerationPrompt\`, feeding concrete \`core_traits\`, \`facts_and_myths\`, \`visual_anchor\`, and \`distractor_pool\` to eliminate AI hallucination and semantic drift.
- Decision: Implemented chunking loop bounded by \`MAX_BATCH_CHUNK_SIZE = 20\`. Requests for large volumes (e.g. 40, 60, 100 questions) are split into sequential batches of $\le 20$ questions, immediately persisted to disk and verified through Auto-QA per cycle.
- Decision: Added an automatic fallback to \`buildBatchGenerationPrompt\` when custom or legacy subtopics without matching knowledge base entities are requested, preserving 100% backward compatibility for all existing tests and open generations.
- Decision: Provided \`onChunkProgress\` callback reporting \`totalRequested\`, \`completedCount\`, \`currentChunk\`, \`totalChunks\`, and approved/rejected counts for real-time frontend feedback.

## Verification

- Command: \`pnpm --filter @studio/server test -- test/questionBankBatchService.test.ts\`
  Result: Passed (4/4 tests).
- Command: \`pnpm --filter @studio/server test -- test/questionBankAutoQa.test.ts\`
  Result: Passed (10/10 tests).
- Command: \`pnpm --filter @studio/server test -- test/questionBank*.test.ts test/matrixCoverageService.test.ts\`
  Result: Passed all 9 test files (93/93 tests).
- Command: \`pnpm typecheck\`
  Result: Passed across all 3 workspace packages with 0 errors.

## Open Risks

- None. Both reverse generation and legacy batch generation paths are tested and fully functional.

## Next Phase Input

- Files the next agent must read: \`apps/server/src/routes/questionBank.ts\`, \`apps/web/src/api/questionBankApi.ts\`, \`apps/server/src/quiz/bank/questionBankBatchService.ts\`
- Commands the next agent should run first: \`node scripts/agent-status.mjs --json\`
- Next step: Phase 4 - Server REST API Endpoints (\`GET /api/question-bank/matrix-coverage\`, \`POST /api/question-bank/generate-batch\` with mode & chunk progress) and Web API client methods.
