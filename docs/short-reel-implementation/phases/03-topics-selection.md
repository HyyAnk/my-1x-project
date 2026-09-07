# Phase 03: Mixed Topics And Bank Selection

> Execution: use the host's plan-execution workflow when available; otherwise follow these explicit steps. No sub-agent dispatch is required or authorized by this file.

**Goal:** Mixed Topics And Bank Selection for the manual-Flow Short-Reel product.

**Architecture:** Follow [architecture](../architecture.md) and [contracts](../contracts.md); keep changes in the owning boundary.

**Tech Stack:** Existing TypeScript/Zod/Fastify/React, repository adapters and project test tooling.

**Spec:** [specification](../specification.md). Requirement coverage: SR-01, SR-02, SR-03, SR-13, SR-15.

**Prerequisite:** Phase 02 contract/repository reviewed and released; new application zone approved before creating its files.

## Global Constraints

Read [agent runbook](../agent-runbook.md). Main-direct, concrete claims, English artifacts, no unsolicited commits, no Flow automation, no folder deletion. Required predecessor review and current-code verification are mandatory.

## Purpose And Scope

Make mixed topic suggestions and confirmation usable without converting Short-Reels into Episodes. Include a minimal real draft destination now, rather than exposing cards that navigate to a missing page.

**Modify:** `packages/shared/src/schemas/channel.ts`, `packages/shared/src/api/channel.ts`, `apps/server/src/context/topicMatrixPlanner.ts`, `apps/server/src/repository/topics.ts`, `apps/server/src/routes/channels.ts`, topic-generation callers and web TopicCard/ChannelTopicsTab/API/nav consumers located in Phase 01.

**Create:** `apps/server/src/shortReel/questionSelection.ts`, `topicConfirmation.ts`, `apps/server/src/routes/shortReels.ts`, `apps/web/src/api/shortReels.ts`, `apps/web/src/features/shortReel/ShortReelStudio.tsx`, `apps/server/test/shortReelQuestionSelection.test.ts`. Route/view begin as a real source-summary draft surface; Phase 06 extends them.

## Work Slices

- [ ] Review Phase 02 contract, record registry release, and claim all producer/consumer files before editing the topic DTO.
- [ ] Add failing TP-01 through TP-06 tests. Preserve existing Episode topic confirmation tests and update expected union responses explicitly.
- [ ] Implement a deterministic slot plan with 3 Episode/2 Short-Reel and keyword provenance assigned by the server. Validate LLM output against assigned slots; bounded correction/retry keeps previous successful suggestions.
- [ ] Introduce the discriminated topic schema and update every current reader/writer/API/UI consumer in this same phase. Remove the title-containing-shorts heuristic.
- [ ] Select an approved English bank question or existing verified English translation. Preserve correct choice identity through translation; reject duplicates/missing canonical choices.
- [ ] Query eligible candidates across bounded pages rather than silently restricting selection to the first default page. Choose by topic/domain/subtopic suitability with stable ID tie-break. Empty matches return BANK_EMPTY with no hidden bank generation.
- [ ] Confirm idempotently into Short-Reel storage and only then reconcile topic selected state. Replay after interruption returns the same product and repairs any incomplete selection projection.
- [ ] Keep Episode confirmation in its existing bank bridge and enforce its independent count rules. Do not share Episode creation side effects with Short-Reel.
- [ ] Add minimal GET detail/list routes, API client and actual draft view showing topic/source question and current draft state. No fake Generate action until functional behavior exists.
- [ ] Exercise keyword suggestion -> Short-Reel confirmation -> draft view -> refresh/reopen, and Episode confirmation in an isolated integration fixture. Verify no Episode artifact for the reel.
- [ ] Run topic, repository, web routing and type checks, then hand off and release.

## Verification

`pnpm --filter @studio/server test -- test/topicSuggestionMatrix.test.ts test/topicConfirmRoute.test.ts test/topicToEpisodePipelineE2E.test.ts test/shortReelQuestionSelection.test.ts`

`pnpm --filter @studio/web test -- src/features/channel/components/TopicCard.test.tsx src/components/AppViewRouter.test.tsx`

Run new draft-view tests at their recorded paths, `pnpm typecheck`, web build and zone validation. Rebuild/restart changed processes before the primary route test.

## Acceptance And Stop Conditions

Five valid mixed topics; one keyword-directed candidate per pillar; one immutable approved source per reel; usable draft destination; correct repeat confirmation. A keyword-directed slot cannot be silently substituted with unrelated discovery content.

For old topic-run files incompatible with the new discriminant, inventory them as obsolete test data and require explicit scoped reset; do not add silent legacy coercion or delete all channel data. Stop if protected bank/reference data would be affected.

## Evidence And Handoff

Use [phase evidence template](../templates/phase-evidence.md). Write `verification/evidence/phase-03-implementation.md` and `docs/agent-coordination/handoffs/short-reel-phase-03.md` (the latter relative to repository root). Link commands/findings in progress.md before verification; then verify/release without further edits. A reviewer records acceptance in a subsequent documentation claim.
