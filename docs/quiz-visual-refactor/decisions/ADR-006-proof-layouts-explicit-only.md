# ADR-006: Keep Proof Layouts Explicit-Only

Status: Accepted

## Context

Phase 6 adds `media_top_choices_bottom` and `full_stack_list` to prove that the new capability, renderer, CSS, and UI architecture scales. Automatically assigning them at the same time would also change composition choices for existing episodes, making architectural verification and product-policy changes difficult to separate.

## Decision

Both Phase 6 layouts are valid explicit production selections but are not chosen by `auto` during the seven-phase refactor.

Existing auto rules remain:

- ordinary text/media questions resolve to `media_left_choices_right`;
- visual multiple-choice or `odd_one_out` resolves to `visual_choices_three`.

A later product-policy change may introduce rotation, preference, experimentation, or content-aware selection only through a separate ADR and dedicated evidence.

## Consequences

- Existing episodes do not silently change layout after Phase 6.
- New layouts can be evaluated deliberately in Sandbox and explicit Director inputs.
- Layout architecture and auto-selection product policy remain independently testable.
- The UI must not imply that adding a layout automatically changes existing content.

## Phase impact

Phase 2 must support explicit compatible resolution without silent fallback. Phase 6 adds both IDs and proves them end-to-end while retaining the existing auto matrix.
