# Transition Unification Handoff

Prepared: 2026-09-11

Status: proposed design and implementation plan, not an implemented upgrade. The owner requested this packet for Antigravity. Sending the kickoff prompt authorizes implementation of this proposal; material deviations require the owner's decision.

## Read order

1. [Design contract](01-design-contract.md)
2. [Architecture and contracts](02-architecture.md)
3. [Interaction and synchronization](03-interaction-and-sync.md)
4. [Implementation plan](04-implementation-plan.md)
5. [Acceptance and verification](05-acceptance.md)
6. [Adding and changing transitions](06-authoring-guide.md)
7. [Antigravity kickoff prompt](07-antigravity-prompt.md)

## Decisions

- One canonical transition implementation per effect, shared by all production composition builders.
- One review player, showing a server-rendered video artifact. React never simulates transition pixels.
- Paused inspection and frame stepping use images decoded from that exact video artifact, not a second animation implementation.
- Automatic refresh after selecting an effect or changing committed timing; no accuracy toggle or manual render button for sample previews.
- One effect selector and one transport bar. Secondary timing and inspection actions are progressively disclosed.
- Stable IDs, revisioned implementations, content fingerprints, immutable render inputs, automatic cache invalidation, and explicit stale states.
- Registry-driven discovery and verification: adding an effect must not require new frontend or composition-builder branches.
- Existing production behavior is the initial reference, not the current React simulation. Known semantic defects are corrected deliberately and recorded separately from extraction.

## Accuracy boundary

The strict guarantee is artifact identity and frame identity for identical resolved inputs. A sample is rendered production content, but is not the user's actual episode. An existing episode review must use the actual episode output. A changed draft is not an already-rendered episode.

Do not claim byte-identical pixels across displays, browser video decoders, GPU drivers, independently encoded MP4s, different source media, or different engine versions. Lossy encoding can change pixel values. Section 2 of the design contract defines exact, testable guarantees without weakening the owner's requirement for truthful preview.

## Scope and working-tree safety

The implementation covers the current quiz production Transition paths, Visual Sandbox Transition tab, and the channel intro/outro transition preview consumer. It must not redesign quiz layouts, regenerate media, change narration pacing, replace the task platform, or rewrite unrelated sandbox tabs.

The working tree already contains unrelated edits, including layout-unification work and transition preview changes. Re-read current files before editing; do not reset, broadly stage, commit, or upgrade dependencies without a separate request. Follow the repository's English-only file and UI policy. Reuse the application footer; never burn dashboard credits into video frames.

No render was performed while preparing this packet. Findings are source-based; browser, runtime, encoding, and performance validation are explicit implementation gates, not completed evidence.

## Deliverable expected from Antigravity

A working integrated feature; passing shared/server/web tests; real rendered review artifacts and frame comparisons; responsive and asynchronous UX evidence; an authoring guide; and a concise report of deviations, limitations, commands, and measured performance. Passing a build or matching CSS classes is insufficient.
