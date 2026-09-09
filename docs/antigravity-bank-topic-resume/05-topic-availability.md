# Work 4: Finish Topic Runs And Availability

## Files

- `apps/server/src/repository/topics.ts`, `helpers.ts`, `runtime.ts` and route `channels.ts`
- `apps/server/src/quiz/bank/bankInventory.ts`, source eligibility and snapshot adapter
- `apps/server/src/context/channelContextBuilder.ts`, `bankTopicAllocation.ts`, `topicCandidateValidator.ts`
- `apps/web/src/api/channelApi.ts`
- `apps/web/src/features/channel/hooks/useChannelDetail.ts`, `useTopicAvailability.ts`
- `apps/web/src/features/channel/components/ChannelTopicsTab.tsx`, `TopicCard.tsx`, `TopicHistoryRow.tsx`
- Existing shared TopicRun/availability contracts; add fields deliberately under exclusive ownership.
- Tests: bankTopicGeneration, bankInventory, topicAvailabilityRoute, useTopicAvailability plus browser Topic smoke tests.

## Confirmed remaining defects and work

- [ ] Availability currently scans inventory then independently queries capped 10,000 questions. Use one complete authoritative snapshot and derive all checks from it; no mixed state or false empty map after swallowed errors.
- [ ] Remove unbound Reel availability fallback. Validate English/structure/archetype/cooldown through the same policy as confirmation.
- [ ] Capacity must match deterministic allocated prefix and supported Episode minimum/requested count, not merely one eligible question anywhere in bindings.
- [ ] Preserve complete run metadata in persistence/API: run ID, generated time, candidates, shortages and empty state. Reject malformed new runs rather than downgrading to permissive legacy schema.
- [ ] UI currently groups candidates using a 1,500ms timestamp heuristic. Replace with authoritative run identity; a new empty run must display empty/shortage rather than old cards.
- [ ] Expose latest run metadata additively, keeping history separately readable. Refresh latest run after task completion without F5.
- [ ] Propagate coherent snapshot identity and any ordered epoch/revision semantics correctly. Never sort digest strings; timestamps alone do not prove server freshness.
- [ ] Preserve the already-fixed hook cleanup/channel switch behavior and avoid duplicate internal/parent polling.
- [ ] Verify Bank changes/focus/reconnect/cooldown update availability without provider generation or input loss.
- [ ] Allocation regressions already cover coherent grouping, all keyword tokens, duplicate policy projections and unknown provider slots. Add stopword-only keyword, malformed/mixed response slot, duplicate cross-run candidate authority and full task-to-storage tests where missing.
- [ ] Test complete/partial/empty/corrupt/unavailable runs, rapid consecutive runs, out-of-order requests, count controls, keyboard/touch and 1440/390/320 widths.

Coordinate topics.ts with Work 2: confirmation and listing/availability changes must not overwrite each other. Output `docs/agent-coordination/handoffs/bank-topic-run-availability-final.md`.
