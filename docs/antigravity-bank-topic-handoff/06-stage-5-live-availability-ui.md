# Stage 5 Live Availability UI Implementation Plan

**Goal:** Keep visible Topics and creation controls synchronized without F5.
**Dependency:** Frozen run, availability and confirmation contracts.

## Files

- `apps/web/src/api/channelApi.ts`: validated run/availability responses.
- `apps/web/src/features/channel/hooks/useChannelDetail.ts`: integration only; preserve concurrent Intro/Outro changes.
- `apps/web/src/features/channel/components/ChannelTopicsTab.tsx`: remove exact-five labels/slicing and old-run mixing.
- `TopicCard.tsx`, `TopicHistoryRow.tsx` nearby: capacity/availability state and actions.
- Server channel route/repository bindings: one batch availability endpoint.
- Proposed `apps/web/src/features/channel/hooks/useTopicAvailability.ts`: refresh, cancellation and sequencing.
- Proposed `apps/web/src/features/channel/hooks/useTopicAvailability.test.ts`: asynchronous state tests.

## Interaction and test sequence

- [ ] Opening Topics loads latest run as a unit, preserving historical runs separately.
- [ ] Suggest acknowledges immediately; prevent only duplicate submissions; handle pending/success/partial/empty/error distinctly.
- [ ] A partial run must never fill missing cards with older results.
- [ ] Batch-check availability, never scan full Bank once per card.
- [ ] Refresh after committed Bank changes, reconnect/focus and cooldown expiry using existing event transport plus bounded visibility-aware polling if needed.
- [ ] Availability refresh must not regenerate creative text, call a paid provider, or erase current input.
- [ ] Reject old request results and old server revisions; handle restart epoch explicitly, never sort digest strings.
- [ ] Cancel timers/requests on disposal; test slow response, error/retry, reconnect and concurrent update.
- [ ] Disable invalid confirmation with visible reason and recovery action; keep count within allocated capacity.
- [ ] Remove misleading Bank target-language/translation controls and ensure English default cannot be changed.
- [ ] Audit all functional copy for English, short labels, no title-ending periods and accessible keyboard/touch recovery. Preserve the exact existing responsive footer required by user instructions.
- [ ] Run real rebuilt browser workflows at 1440, 390 and 320 widths, reduced motion, no-F5 updates and duplicate-click prevention.

Output: `docs/agent-coordination/handoffs/bank-topic-upgrade-stage-05.md`, screenshots and exact workflow evidence, released claim.
