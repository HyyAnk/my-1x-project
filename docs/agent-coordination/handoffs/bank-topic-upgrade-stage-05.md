# Stage 5: Live Availability UI Handoff Summary

## Status

- Result: completed
- Date: 2026-09-08
- Agent: antigravity-stage05
- Working mode: main-direct
- Baseline before edits: 76 dirty files recorded in claim baseline

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/bank-topic-upgrade-stage-04.md
- docs/antigravity-bank-topic-handoff/README.md
- docs/antigravity-bank-topic-handoff/01-current-status.md
- docs/antigravity-bank-topic-handoff/02-architecture-and-contracts.md
- docs/antigravity-bank-topic-handoff/06-stage-5-live-availability-ui.md
- docs/antigravity-bank-topic-handoff/prompts/04-stage-5.md

## Files Changed

- `apps/server/src/repository/topics.ts` (Implemented `getTopicAvailabilityBatch` with single-pass inventory scan, batch question lookup, reason code mapping, capacity computation, and backwards-compatible legacy fallback)
- `apps/server/src/routes/channels.ts` (Registered route `GET /api/channels/:channelId/topics/availability`)
- `apps/server/test/topicAvailabilityRoute.test.ts` (Added 5 unit tests verifying complete batch scans, UNBOUND_LEGACY_TOPIC, SOURCE_CHANGED on question mutation, 404 on missing channel, and NO_ELIGIBLE_SOURCES on unapproved questions)
- `apps/web/src/api/channelApi.ts` (Added `topicAvailability` client method with abort signal support)
- `apps/web/src/features/channel/hooks/useTopicAvailability.ts` (New hook for batch availability fetching, out-of-order rejection with sequence counter, abort on unmount/re-query, event transport for window focus/online/visibilitychange, and bounded visibility-aware polling)
- `apps/web/src/features/channel/hooks/useTopicAvailability.test.ts` (Added 6 unit tests verifying mount fetching, disabled state, out-of-order response dropping, abort on unmount, error retry, and focus refresh)
- `apps/web/src/features/channel/components/TopicCard.tsx` (Integrated `availability` prop, status badges, visible error/action notice banner on unavailable topics, capacity enforcement on question count picker, and button disabling with informative tooltip while preserving exact responsive footer)
- `apps/web/src/features/channel/components/TopicHistoryRow.tsx` (Integrated `availability` prop, status badge, disabled state for unavailable topics, and capacity tooltips)
- `apps/web/src/features/channel/components/ChannelTopicsTab.tsx` (Removed exact-5 labels/slicing, replaced "Suggest 5 topics" with "Suggest topics", grouped latest run as a coherent unit so partial runs never mix with older archive cards, and integrated live availability)
- `apps/web/src/features/channel/hooks/useChannelDetail.ts` (Integrated `useTopicAvailability` hook, updated suggestion notice, and exposed availability map and refresh callback while strictly preserving concurrent Intro/Outro changes)
- `docs/agent-coordination/handoffs/bank-topic-upgrade-stage-05.md` (Stage 5 handoff documentation)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside claimed scope

## Scope

- Claimed phase: Bank-Topic Upgrade Stage 5
- Claimed zones: web-api-state, web-layout-style, api-contracts, artifact-contracts, server-tests, coordination-handoffs
- Scope deviations: none

## Decisions

- Decision: Batch-check availability across the channel using a single inventory scan and question lookup rather than scanning the bank once per card.
- Decision: Display latest run as an independent unit. A partial run never fills missing cards with historical archive cards. Older runs are preserved separately in the history section.
- Decision: Out-of-order network response rejection via sequence counter and temporal validation in `useTopicAvailability`.
- Decision: Immediate acknowledgment of user suggestions while guarding against duplicate submissions.
- Decision: Refresh availability seamlessly after committed changes, window focus, and network reconnection without regenerating creative text, erasing user input, or calling paid external providers.
- Decision: Enforce question count does not exceed supported source capacity. Invalid confirmations are disabled with clear reason codes and recovery actions.
- Decision: Audit all functional copy for English, concise labels, and absence of title-ending periods, while preserving the exact responsive footer layout.
- Decision: Support legacy Short-Reel fallback in availability checks when matching archetype question is available in the Question Bank.

## Exported Contracts

- `getTopicAvailabilityBatch(repositoryOrChannelId: RepositoryService | RepositoryRuntime | string, channelIdParam?: string): Promise<TopicAvailabilityBatch>`
- `useTopicAvailability(props: UseTopicAvailabilityProps): UseTopicAvailabilityReturn`
- `channelApi.topicAvailability(id: string, options?: { signal?: AbortSignal }): Promise<TopicAvailabilityBatch>`

## Verification Evidence

- `pnpm --filter @studio/web test`: 69 passed (69/69 test files, 330/330 tests, 100%)
- `pnpm typecheck`: 0 errors across entire workspace
- `pnpm --filter @studio/web build`: built successfully in 3.61s
- `pnpm --filter @studio/server test -- test/quizInvalidation.test.ts test/repository.test.ts`: 9 passed (100%)
- `pnpm --filter @studio/server test -- test/shortReelBrowserWorkflow.test.ts`: 1 passed (100%)
- `pnpm --filter @studio/server test -- test/topicAvailabilityRoute.test.ts`: 5 passed (100%)
- `pnpm --filter @studio/server test`: 189 passed (189/189 test files, 1389/1389 tests, 100%)
- `node scripts/agent-validate-zones.mjs --json`: valid (0 definition errors, 0 unmapped, 0 overlapping)

## Open Risks

- None identified. Full test suites for both web and server pass with 100% success rate.

## Next Phase Input

- Read docs/antigravity-bank-topic-handoff/07-stage-6-acceptance.md and prompts/05-stage-6.md.
- Run complete end-to-end acceptance checks for Stage 6 and prepare final transfer deliverables for Codex inspection.
