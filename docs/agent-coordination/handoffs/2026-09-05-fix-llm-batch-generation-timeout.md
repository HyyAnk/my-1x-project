# Fix LLM Batch Generation Timeout & Silent Failure Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: 76 dirty files captured in claim baseline

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-05-question-bank-background-task-and-progress-bar.md

## Files Changed

- apps/server/src/quiz/bank/questionBankBatchService.ts
- apps/server/src/utils/promptSanitizer.ts
- apps/server/test/questionBankBatchService.test.ts
- docs/agent-coordination/handoffs/2026-09-05-fix-llm-batch-generation-timeout.md

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside planned scope

## Scope

- Claimed phase: server-core, server-tests, agent-coordination
- Allowed scope used: apps/server/src/quiz/bank/questionBankBatchService.ts, apps/server/src/utils/promptSanitizer.ts, apps/server/test/questionBankBatchService.test.ts, docs/agent-coordination/handoffs/2026-09-05-fix-llm-batch-generation-timeout.md
- Scope deviations: none

## Decisions

- Decision 1: Increased `timeoutMs` for single-prompt LLM generation in batch service and prompt sanitizer from 60 seconds (60,000ms) to 180 seconds (180,000ms).
- Reason: Generating 20 complex trivia questions with full explanations, distractors, visual specs, and tags via Antigravity local engine takes approximately 70-75 seconds. The 60-second limit aborted the turn right before completion.
- Decision 2: Removed silent `catch {}` suppression in `questionBankBatchService.ts`. Errors during chunk generation are now properly tracked, logged, and thrown if 0 questions are produced, preventing jobs from masquerading as successfully completed with 0 questions.
- Decision 3: Extended `LLMClient` type and `executeSinglePromptText` in `promptSanitizer.ts` to support duck-typed mock clients offering `generateContent`, preserving full compatibility with unit test suites while continuing to support Antigravity and Codex app server clients.
- Impact on later phases: Batch generation of up to 20 questions per chunk completes reliably without timing out, and any real LLM failures are immediately transparent in the task progress UI and logs.

## Verification

- Command: `pnpm --filter @studio/server test test/questionBankBatchService.test.ts test/questionBankJobManager.test.ts test/questionBankRoute.test.ts`
- Result: 15 passed (15/15)
- Command: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`
- Result: 57 passed (57/57)
- Command: `node scripts/agent-validate-zones.mjs --json`
- Result: valid: true, 0 unmapped, 0 overlapping

## Open Risks

- Risk: High-volume batch requests (>100 questions) will take several chunk cycles (~75s each).
- Suggested next action: Users can track progress live via the newly implemented Background Task Progress Bar without keeping the generation dialog open.

## Next Phase Input

- Files the next agent must read: `apps/server/src/quiz/bank/questionBankBatchService.ts`, `apps/server/src/utils/promptSanitizer.ts`
- Commands the next agent should run first: `node scripts/agent-status.mjs --json`
- Important constraints: Maintain 180s timeout minimum for LLM turn execution when requesting 20-item chunk generations.
