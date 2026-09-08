# Phase 03 Implementation Evidence: Mixed Topics And Bank Selection

## Identity And Scope

- **Date:** 2026-09-07
- **Agent:** antigravity-p03
- **Repository:** D:/1a Cursor Project/My 1x Project
- **Claim:** claim-antigravityp03-mtqwhgiw
- **Task:** Phase 03 Mixed Topics And Bank Selection
- **Working Mode:** main-direct (no git branches or worktrees)

## Files Owned

The following concrete files were modified or created under active claim `claim-antigravityp03-mtqwhgiw`:

- `packages/shared/src/schemas/channel.ts`
- `packages/shared/src/api/channel.ts`
- `apps/server/src/context/topicMatrixPlanner.ts`
- `apps/server/src/tasks/parsers.ts`
- `apps/server/src/shortReel/questionSelection.ts`
- `apps/server/src/shortReel/topicConfirmation.ts`
- `apps/server/src/routes/channels.ts`
- `apps/server/src/routes/shortReels.ts`
- `apps/server/src/app.ts`
- `apps/server/src/repository/topics.ts`
- `apps/server/src/quiz/bank/questionBankToQuizBridge.ts`
- `apps/server/src/quiz/bank/bridge/bankDirectorPlanFactory.ts`
- `apps/server/src/quiz/bank/bridge/bankEpisodeBootstrapper.ts`
- `apps/server/test/shortReelQuestionSelection.test.ts`
- `apps/server/test/topicConfirmRoute.test.ts`
- `apps/server/test/topicSuggestionMatrix.test.ts`
- `apps/server/test/bankDirectorPlanFactory.test.ts`
- `apps/server/test/helpers/stubQuizLlmClient.ts`
- `apps/web/src/api/shortReelApi.ts`
- `apps/web/src/api.ts`
- `apps/web/src/features/shortReel/ShortReelStudio.tsx`
- `apps/web/src/features/channel/components/TopicCard.tsx`
- `apps/web/src/features/channel/components/TopicHistoryRow.tsx`
- `apps/web/src/features/channel/components/TopicCard.test.tsx`
- `apps/web/src/features/channel/hooks/useChannelDetail.ts`
- `apps/web/src/components/ChannelView.tsx`
- `apps/web/src/components/AppViewRouter.tsx`
- `apps/web/src/hooks/router/hashCodec.ts`
- `apps/web/src/hooks/router/useNavigationActions.ts`
- `apps/web/src/hooks/useAppOrchestration.ts`
- `apps/web/src/hooks/useRouter.ts`
- `apps/web/src/App.tsx`
- `docs/short-reel-implementation/contracts.md`
- `docs/short-reel-implementation/decisions.md`
- `docs/short-reel-implementation/file-map.md`
- `docs/short-reel-implementation/progress.md`
- `docs/short-reel-implementation/verification/evidence/phase-03-implementation.md`
- `docs/agent-coordination/handoffs/short-reel-phase-03.md`

## Requirements Implemented

- **TP-01 (3:2 Mixed Topic Suggestions):** Topic matrix generator deterministically generates exactly 5 topics consisting of 3 Episode candidates (`content_kind: "episode"`) and 2 Short-Reel candidates (`content_kind: "short_reel"`).
- **TP-02 (Slot-Directed Keyword Steering):** Slot layout allocates Slot 1 (Episode, keyword-steered if hint present, else discovery), Slots 2-3 (Episode, discovery), Slot 4 (Short-Reel, keyword-steered if hint present, else discovery), Slot 5 (Short-Reel, discovery).
- **TP-03 (Bank Question Selection & English Provenance):** `selectShortReelQuestion` fetches approved questions with archetype filter (`versus_faceoff` | `deep_trivia`), validates English source language or verified English translation, scores candidate token suitability against topic hook/premise, stably breaks ties via ID, and returns `BANK_EMPTY` error when no questions qualify without synthesizing fake questions or mutating the bank.
- **TP-04 (Discriminated Confirmation Route):** `POST /api/channels/:channelId/topics/:topicId/confirm` dynamically branches on `candidate.content_kind`. Episode confirmation creates an episode record and kicks off episode research/tasks; Short-Reel confirmation invokes `confirmShortReelTopic`, selects a bank question, saves a `ShortReelRecord` with source snapshot, and responds with `{ content_kind: "short_reel", short_reel }`.
- **TP-05 (Heuristic Elimination):** Completely removed legacy heuristics checking for "shorts" in the topic title across `questionBankToQuizBridge.ts` and `repository/topics.ts`. Content type routing is strictly driven by the explicit `content_kind` discriminator.
- **TP-06 (Web Short-Reel Studio Shell & Navigation):** Added `apps/web/src/features/shortReel/ShortReelStudio.tsx`, API client `apps/web/src/api/shortReelApi.ts`, hash route `#/channels/:channelId/short-reels/:reelId`, updated `TopicCard` badges, and direct navigation into the Short-Reel draft workbench upon confirmation.
- **Backward Compatibility Guarantee:** `TopicCandidateSchema` includes a preprocessor fallback that defaults absent `content_kind` to "episode" and absent `origin` to "discovery", guaranteeing seamless backward compatibility with historical database topic runs and existing tests without requiring schema migrations.

## Verification Commands And Results

| Command | Status | Result Summary |
| --- | --- | --- |
| `pnpm --filter @studio/shared build` | Exit 0 | Clean build with TypeScript declarations |
| `pnpm --filter @studio/shared test` | Exit 0 | 30 tests passed (layout policies) |
| `node --import tsx --test packages/shared/test/shortReel.test.ts` | Exit 0 | 13 tests passed (SC-01 through SC-06) |
| `pnpm typecheck` | Exit 0 | 0 errors across `@studio/shared`, `@studio/server`, and `@studio/web` |
| `pnpm --filter @studio/server test -- test/shortReelQuestionSelection.test.ts` | Exit 0 | 6 behavioral tests passed (TP-01 through TP-06) |
| `pnpm --filter @studio/server test -- test/shortReelRepository.test.ts` | Exit 0 | 6 behavioral tests passed (RP-01 through RP-06) |
| `pnpm --filter @studio/server test -- test/topicSuggestionMatrix.test.ts` | Exit 0 | 8 tests passed |
| `pnpm --filter @studio/server test -- test/topicConfirmRoute.test.ts` | Exit 0 | 2 tests passed |
| `pnpm --filter @studio/server test -- test/bankDirectorPlanFactory.test.ts` | Exit 0 | 12 tests passed |
| `pnpm --filter @studio/server test -- test/tasks.test.ts test/hyperframesProgress.test.ts` | Exit 0 | 22 tests passed |
| `pnpm --filter @studio/web test -- src/components/TaskProgressPanel.test.tsx src/features/channel/components/TopicCard.test.tsx` | Exit 0 | 6 tests passed |
| `pnpm --filter @studio/web build` | Exit 0 | Clean Vite production bundle |
| `node scripts/agent-validate-zones.mjs --json` | Exit 0 | Valid: true, 0 definition errors, 0 unmapped files, 0 overlapping files |
