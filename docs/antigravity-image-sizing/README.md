# Layout Image Sizing Handoff

Prepared: 2026-09-11

Status: implementation proposal. This packet does not change application behavior. The owner requested a detailed handoff for Antigravity. Sending [the kickoff prompt](06-antigravity-prompt.md) authorizes implementation within this packet's boundaries, not paid generation, production data migration, or unrelated work.

## Read order

1. [Design contract](01-design-contract.md)
2. [Geometry, sizing, and persistence contracts](02-sizing-contract.md)
3. [Source map and responsibility boundaries](03-source-map.md)
4. [Implementation plan](04-implementation-plan.md)
5. [Acceptance and verification](05-acceptance.md)
6. [Antigravity kickoff prompt](06-antigravity-prompt.md)
7. [Packet verification](07-packet-verification.md)

[Baseline measurements](baseline-measurements.json) record the observed defect and the measurement limitations. They are evidence, not a new hardcoded ratio catalog. Future execution evidence belongs under `evidence/`; do not overwrite this baseline.

## Intended outcome

Image slots, Sandbox samples, Episode asset plans, provider requests, and render optimization agree through one deterministic sizing contract. Browser measurements test that contract against the real renderer. Neither a static `1:1` lookup nor changing only sample labels satisfies this work.

The three initially reported choice layouts resolve to `4:3`, `1:1`, and `16:9`, respectively, when their present geometry is preserved. Pure Visual Cards stays `1:1` because its actual 432 x 484 image viewport is closer to square than 3:4. The resolver must return `3:4` if that viewport is later changed to a genuinely 3:4 shape; do not reshape the current layout merely to force that result.

## Relationship to other work

- Preserve the fixed frame, arena coordinates, timing, and skin work in `docs/antigravity-layout-unification/` and the current working tree.
- Do not re-execute that older layout migration or the transition-unification packet.
- This packet owns image sizing, framing propagation, stale sizing detection, and relevant UI feedback only.
- The working tree contains extensive pre-existing edits, including the exact renderer and provider files involved here. Re-read them at execution time. Do not reset, broadly stage, commit, or upgrade dependencies without a separate request.
- All repository artifacts and visible application copy must be English. Owner-facing chat may be Vietnamese.

## Completion boundary

Complete the code changes and local verification with deterministic fixtures and intercepted provider requests. Produce a real local MP4 through the production composition path without paid APIs. A live paid-provider smoke test is a separately authorized follow-up, and its absence must be explicit in the final report.
