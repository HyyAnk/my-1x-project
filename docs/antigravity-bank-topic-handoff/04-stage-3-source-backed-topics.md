# Stage 3 Source-Backed Topic Implementation Plan

**Goal:** Suggest only Topics with actual allocated English questions.
**Dependency:** Stage 2B accepted, coherent adapter and post-migration baseline frozen.

## Exact integration map

- `apps/server/src/context/channelContextBuilder.ts`: replace index/taxonomy-only SUGGEST_TOPICS context.
- `topicMatrixPlanner.ts`, `topicCandidateValidator.ts` in that directory: source-first allocation, stable slots, creative-only response validation.
- `apps/server/src/tasks/codexRunner.ts`: empty/failure fast path before client.connect.
- `apps/server/src/tasks/codexRetries.ts`: remove exact-five retry assumptions.
- `apps/server/src/tasks/handlers/textArtifactHandlers.ts`: persist complete validated run, not just array.
- `apps/server/src/repository/topics.ts`, `helpers.ts`: partial run persistence and latest-run diagnostics.
- Shared Topic contracts: reuse Stage 2A exports; claim exclusively if revision is necessary.

Create focused allocation/prompt modules near the context planner rather than expanding its mixed responsibilities. Proposed regression file: `apps/server/test/bankTopicGeneration.test.ts`; claim it before creating.

## Tests and implementation sequence

- [ ] RED: a complete fixture yields three coherent Episode allocations and two Reel allocations, with no repeated source ID across kinds.
- [ ] RED: stable Episode slots 1/2/3 and Reel slots 4/5 survive holes; steered allocation has priority.
- [ ] RED: scarce inventory yields honest partial; complete empty makes zero provider connection/call; incomplete/unavailable is a failure, not shortage.
- [ ] RED: unavailable scan or provider parse failure preserves prior persisted successful suggestions and distinct diagnostics.
- [ ] RED: unmatched keyword is shortage, never unrelated low-score fallback.
- [ ] RED: provider cannot replace bindings, kind, slot, archetype, group or source count; duplicated/missing response slots fail.
- [ ] GREEN: allocate exact sources, build full English question/choice/correct-ID/explanation context, receive only creative fields, merge server-owned authority and persist.
- [ ] Persist per-Episode supported source count/capacity; reject requests beyond it instead of JIT generation.
- [ ] Preserve legacy runs for reading; require re-suggestion for unbound legacy creation.
- [ ] Execute actual task-to-storage path with provider doubles, then existing planner/validator/task tests and static checks.

Source context cannot be silently truncated to fit prompts. Report an explicit oversized-context failure.

Output: `docs/agent-coordination/handoffs/bank-topic-upgrade-stage-03.md` with exported contract names, exact tests, full/partial/empty evidence and claim release.
