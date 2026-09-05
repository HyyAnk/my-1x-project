# Phase 2: God File Decomposition (Server Prompt Engineering) Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: phase-2-agent
- Working mode: main-direct
- Baseline before edits: 53 pre-existing dirty files on main captured via `git status --porcelain`

## Source Files Read

- AGENTS.md
- GEMINI.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-05-phase-1-god-file-decomposition.md

## Files Changed

### Created
- `apps/server/src/quiz/bank/prompts/archetypePromptGuidelines.ts` (159 lines): Defines `ArchetypePromptGuideline` interface and the complete `ARCHETYPE_GUIDELINES` map covering all gameplay archetypes with formatting, choice counts, and cinematic guidelines.
- `apps/server/src/quiz/bank/prompts/standardBatchPromptBuilder.ts` (163 lines): Defines `BuildBatchPromptOptions` and `buildBatchGenerationPrompt` for open topic-based batch question prompt construction with archetype paradigms.
- `apps/server/src/quiz/bank/prompts/reverseMatrixPromptBuilder.ts` (235 lines): Defines `TargetEntityForGeneration`, `BuildReverseBatchPromptOptions`, and `buildReverseGenerationPrompt` for deterministic entity-anchored generation with specialized directives.
- `apps/server/src/quiz/bank/prompts/batchPromptOutputParser.ts` (282 lines): Defines `sanitizeBankQuestionText`, `makeUniqueBankId`, `parseBatchGenerationOutput`, and `parseReverseBatchGenerationOutput` with schema validation and choice count enforcement.
- `docs/agent-coordination/handoffs/2026-09-05-phase-2-god-file-decomposition.md`: Phase handoff record.

### Refactored
- `apps/server/src/quiz/bank/batchGeneratorPrompt.ts` (829 -> 27 lines): Clean barrel facade re-exporting all prompt guidelines, builders, parsers, types, and sanitizer utilities for 100% backward compatibility.

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside planned scope (only target prompt files and handoff summary were modified)

## Scope

- Claimed phase: Phase 2 (Decompose server prompt engineering)
- Allowed scope used: `server-core`
- Scope deviations: None. All planned files decomposed within declared domain.

## Decisions

- Decision: Decompose `batchGeneratorPrompt.ts` (829 lines) into 4 specialized prompt modules under `apps/server/src/quiz/bank/prompts/` and 1 backward-compatible barrel facade.
  - Reason: The original file combined guideline specifications, template builders, and JSON parsing logic into a single monolithic file violating clean architecture rules.
  - Impact on later phases: All existing callers (`questionBankBatchService.ts`, `questionJitSeeder.ts`, and test suites) continue importing from `batchGeneratorPrompt.js` without any breaking changes.

## Verification

- Command: `pnpm --filter @studio/server test test/questionBankBatchService.test.ts`
  - Result: 7/7 unit tests passed.
- Command: `pnpm --filter @studio/server test test/questionBankReverseMatrixE2E.test.ts`
  - Result: 24/24 integration tests passed.
- Command: `pnpm --filter @studio/server test test/questionBankAutoQa.test.ts`
  - Result: 13/13 tests passed.
- Command: `pnpm typecheck`
  - Result: TypeScript check passed cleanly across packages/shared, apps/server, and apps/web.
- Command: `pnpm --filter @studio/server test`
  - Result: All 146 test files passed (1,032 tests total) with zero failures.

## Open Risks

- None. All exports, interfaces, and function signatures remain identical and 100% backward-compatible.

## Next Phase Input

- Files the next agent must read:
  - `docs/agent-coordination/handoffs/2026-09-05-phase-2-god-file-decomposition.md`
  - `docs/agent-coordination/phase-roadmap.md`
- Commands the next agent should run first:
  - `node scripts/agent-status.mjs --json`
  - `pnpm --filter @studio/server test test/questionBankBatchService.test.ts`
- Important constraints:
  - Strict English-only codebase and documentation.
  - Maintain the Agent Coordination lifecycle and backward-compatible facades.
