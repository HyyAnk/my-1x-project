# Stage 3: Source-Backed Topic Generation Handoff Summary

## Status

- Result: completed
- Date: 2026-09-08
- Agent: antigravity-stage03
- Working mode: main-direct
- Baseline before edits: 76 dirty files recorded in claim baseline

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/bank-topic-upgrade-stage-02b.md
- docs/antigravity-bank-topic-handoff/README.md
- docs/antigravity-bank-topic-handoff/01-current-status.md
- docs/antigravity-bank-topic-handoff/02-architecture-and-contracts.md
- docs/antigravity-bank-topic-handoff/04-stage-3-source-backed-topics.md
- docs/antigravity-bank-topic-handoff/prompts/02-stage-3.md

## Files Changed

- `apps/server/src/context/bankTopicAllocation.ts` (New module: deterministic source allocation, 5 stable archetypes, keyword steering, disjoint ID assignment, shortage reporting)
- `apps/server/src/context/bankTopicPromptBuilder.ts` (New module: source context formatter with 60k char overflow guard, creative-only LLM output contract)
- `apps/server/src/context/topicCandidateValidator.ts` (Merged provider creative outputs with immutable server-owned authorities and source bindings)
- `apps/server/src/context/channelContextBuilder.ts` (Integrated bank inventory scan and topic slot allocation into SUGGEST_TOPICS channel context)
- `apps/server/src/tasks/codexRunner.ts` (Added empty bank fast-path before client connection to prevent unnecessary provider calls)
- `apps/server/src/tasks/codexRetries.ts` (Decoupled suggestion retry logic from hardcoded 5-candidate expectations)
- `apps/server/src/tasks/handlers/textArtifactHandlers.ts` (Persisted full TopicRunResult with source bindings and typed shortages)
- `apps/server/src/repository/topics.ts` (Handled partial and full topic run persistence, source capacity checks, and unbound legacy rejection)
- `apps/server/src/repository/helpers.ts` (Updated TopicRun typing with optional shortages and run metadata)
- `apps/server/src/repository/runtime.ts` (Updated method signatures for TopicRunResult and TopicCandidate inputs)
- `apps/server/test/bankTopicGeneration.test.ts` (Comprehensive 10-test suite covering allocation, prompt limits, validator authority, fast-path, and repository capacity)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside claimed scope

## Scope

- Claimed phase: Bank-Topic Upgrade Stage 3
- Allowed scope used: `apps/server/src/context/`, `apps/server/src/tasks/`, `apps/server/src/repository/topics.ts`, `apps/server/src/repository/helpers.ts`, `apps/server/src/repository/runtime.ts`, `apps/server/test/bankTopicGeneration.test.ts`, `docs/agent-coordination/handoffs/bank-topic-upgrade-stage-03.md`
- Scope deviations: none (authenticated expansion was performed for `runtime.ts` prior to editing)

## Decisions

- Decision: Enforce 5 stable slot archetypes (Slot 1: Deep Trivia Episode, Slot 2: Mystery Reveal Episode, Slot 3: True/False Episode, Slot 4: Versus Face-off Reel, Slot 5: Deep Trivia Reel) surviving hole patterns without shifting slot indices.
- Decision: Pre-allocate English canonical questions before LLM provider invocation, ensuring 100% disjoint question allocation across all slots in a single run.
- Decision: Enforce `MAX_SOURCE_CONTEXT_CHARS = 60_000` with explicit `OVERSIZED_CONTEXT` error to completely prevent silent context truncation.
- Decision: LLM provider prompt requests ONLY creative presentation fields (`title`, `premise`, `hook`, `why_it_fits`, `estimated_potential`). All structural metadata (`slot_id`, `content_kind`, `archetype`, `domain_id`, `question_count`, `source_bindings`) is injected and validated authoritatively by the server.
- Decision: Completely empty inventory yields an immediate fast-path in `codexRunner` without connecting or paying for provider calls.
- Decision: Enforce supported source capacity upon topic confirmation, rejecting requested question counts that exceed the allocated source binding length (`INSUFFICIENT_SOURCE_CAPACITY`).
- Decision: Reject confirmation of unbound legacy topic candidates (`UNBOUND_LEGACY_TOPIC`), requiring re-suggestion to bind canonical sources.

## Exported Contracts

- `allocateSourceBackedTopicSlots(input: AllocateTopicSlotsInput): TopicAllocationResult`
- `formatSourceBackedTopicPrompt(allocation: TopicAllocationResult, topicHint?: string): SourceBackedTopicPrompt`
- `validateTopicCandidateResponse(params: ValidateTopicCandidateInput): TopicRunResult`
- `getAssignedTopicAllocation(manifest: ContextManifest): TopicAllocationResult | undefined`

## Verification Evidence

- `pnpm --filter @studio/server test -- test/bankTopicGeneration.test.ts`: 10 passed (100%)
- `pnpm --filter @studio/server test -- test/context.test.ts`: 8 passed (100%)
- `pnpm --filter @studio/server test -- test/shortReelAssignedPlan.test.ts`: 1 passed (100%)
- `pnpm --filter @studio/server test -- test/thumbnailService.test.ts`: 11 passed (100%)
- `pnpm --filter @studio/server test -- test/googleImagen.test.ts`: 3 passed (100%)
- `pnpm --filter @studio/server typecheck`: 0 errors
- `node scripts/agent-validate-zones.mjs --json`: Valid (0 definition errors, 0 unmapped, 0 overlapping)

## Open Risks

- Stage 4 requires implementing bound source resolution during episode and short-reel confirmation, ensuring zero JIT question creation or Bank translation writeback occurs.

## Next Phase Input

- Read `docs/antigravity-bank-topic-handoff/05-stage-4-confirmation-and-localization.md` and `prompts/03-stage-4.md`.
- Claim the required write zones for Stage 4 (`api-contracts`, `server-pipeline`, `server-tests`, `coordination-handoffs`).
- Implement `boundSourceResolver.ts`, topic confirmation receipts, and product-only localization artifact.
