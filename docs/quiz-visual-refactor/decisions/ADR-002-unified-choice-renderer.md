# ADR-002: Use One Choice Renderer with Pluggable Skins

Status: Accepted

## Context

Current production code has separate text and visual choice renderers. Sandbox duplicates visual choice rendering. Answer Card variants receive string arrays and reimplement state, labels, tiering, escaping, and most markup.

Simply teaching every variant to render both text and visual choices would multiply duplicated workflow logic and make parity harder to prove.

## Decision

Introduce one semantic choice-group renderer in a later phase.

The shared renderer owns:

- choice iteration and stable ordering;
- canonical correct/incorrect state;
- letter labels;
- escaping;
- optional media and fallback;
- typography tier metadata;
- stable outer and semantic markup.

A Choice Card skin owns appearance and optional decorations or specialized status content. It does not own the list workflow.

The normalized choice item should support text, visual, and future mixed presentation without exposing provider-specific asset lookup inside skin implementations.

## Consequences

- Sandbox and production can render the same semantic choice markup.
- Every skin can support text and visual representations through one contract.
- Comic-specific decorations remain possible through explicit extension points.
- The migration requires characterization tests before markup changes.

## Phase impact

Phase 1 captures current divergence. The renderer is implemented only after the shared scene pipeline is ready.
