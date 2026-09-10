# Phase 5: Availability and Run Synchronization Implementation Plan

> Execute directly. Write the interaction plan below into test cases before UI edits.

Goal: suggestions and confirmation controls reflect actual eligible capacity without refresh or clock heuristics.
Architecture: authoritative run identity, shared capacity policy, request-sequence stale-response protection.
Tech stack: React hooks, shared schemas, TypeScript, Vitest and browser E2E.
Spec: [Contract](02-contract.md).

## Files

Modify apps/server/src/repository/topics.ts, apps/web/src/features/channel/hooks/useTopicAvailability.ts and apps/web/src/features/channel/components/ChannelTopicsTab.tsx.
Inspect mutation owners/callers via CodeGraph and invalidate/refetch their affected run, Topic, Bank and availability queries.
Extend apps/server/test/topicAvailabilityRoute.test.ts and apps/web/src/features/channel/hooks/useTopicAvailability.test.ts.
Create apps/server/test/topicRunIntegrity.test.ts and apps/web/src/features/channel/components/ChannelTopicsTab.test.tsx if equivalent coverage does not already exist.

## Interaction plan

Suggestion: pending acknowledgement; successful newest run replaces latest even when empty; prior runs remain history. Error preserves context and exposes retry, not a fabricated latest result.
Confirmation: disable only pending candidate; success refreshes selection, products and availability/cooldown; conflict shows re-suggest/retry recovery.
Bank changes and reconnect: invalidate affected queries and reconcile through bounded polling/events. New request sequence wins even if server clock moves backward.
Desktop/mobile: same state semantics, concise English copy, keyboard/touch accessible actions, existing responsive footer preserved.

## Tasks

- [ ] Seed candidate count=8 with eight bindings but only three eligible prefix sources. Assert can_confirm=false; seven fails and eight passes. Include explicit count override behavior if the UI supports it.
- [ ] Share required-count computation with confirmation. Keep source_capacity descriptive, not an implicit permission to reduce count silently.
- [ ] Write two runs within 1500ms and an empty third run. The newest run remains authoritative and empty; no history promoted into latest.
- [ ] Strictly parse run JSON/schema. Malformed latest run returns typed corruption/unavailable state, not an older successful run. Explicit legacy adapter must not fabricate bindings or infer grouping from timestamps.
- [ ] Remove timestamp clustering from ChannelTopicsTab. Group only by authoritative run_id; unassigned legacy candidates belong in an explicit legacy/history state.
- [ ] Resolve request B before A and set B.checked_at earlier than A. B must remain current. Remove checked_at ordering rejection; retain sequence/cancellation guards.
- [ ] Test channel switch, unmount, slow response, aborted request, offline/online, empty scan, incomplete scan and Bank scan failure. Loading always settles; errors are actionable.
- [ ] Exercise mutation-triggered refresh without F5 and verify both source capacity and selected/product views update.
- [ ] Run focused server/web tests and browser desktop/mobile/keyboard flows. Write reports/phase-5.md.

Do not translate UI or add redundant helper copy. Respect reduced motion and visible asynchronous acknowledgement.
