# Phase 4 Execution Brief: Unified Choice Rendering

Status: PLANNED

Dependency: Phase 3 COMPLETE with a dated handoff

## Goal

Replace separate text and visual choice workflows with one semantic choice-group renderer and one unified layout slot. Make every registered Answer Card skin work with both text and visual choices while preserving canonical state, phase timing, accessibility, and the current two/three-choice domain contract.

## User-visible outcome

Text choices retain their established appearance and behavior. Visual choices now receive the selected Answer Card skin instead of ignoring it. Production and Sandbox render the same semantic choice structure, including labels, correct/incorrect states, media fallback, and typography tiers.

## Required architecture

The normalized choice contract must carry stable choice ID, text, optional resolved media, and any deterministic fallback metadata. Correctness must be derived from canonical choice ID rather than display text or assumed position.

One choice-group renderer owns:

- ordered list iteration and stable labels;
- phase-to-state mapping;
- correct, incorrect, normal, and pending semantics;
- escaping and accessible media labels;
- text/visual/mixed-capable content slots;
- typography tier metadata;
- stable outer group and card markup.

An Answer Card skin owns visual classes, CSS, and explicit decorative extension points. It must not repeat choice iteration, correctness, escaping, labels, or phase workflow.

## In scope

1. Define normalized choice and skin contracts in focused type modules.
2. Implement one shared choice-group renderer used by the Phase 3 scene-part builder.
3. Migrate all registered Answer Card variants to the new skin contract.
4. Make all registered skins support text and visual choice content.
5. Replace `textChoicesHtml` and `visualChoicesHtml` with one `choicesHtml` layout slot, plus optional media slot direction established by the target architecture.
6. Migrate baseline and both production layouts to the unified slot.
7. Remove production/Sandbox dual-renderer and split-slot compatibility adapters owned by Phase 4.
8. Preserve API compatibility at external boundaries through small adapters where required.
9. Deliberately review and update visual/structural evidence for the intended visual-skin parity change.

## Out of scope

- No new layout or four-choice support.
- No broad layout/skin CSS ownership rewrite beyond hooks required by the new stable markup.
- No preset precedence or palette-token refactor.
- No background registry.
- No new Answer Card skin.
- No unrelated Sandbox or Stage Studio redesign.

## Implementation constraints

- Do not move the duplicate workflow into every new skin under a different name.
- Keep the group renderer independent from concrete layout IDs; consume Phase 2 capabilities and Phase 3 model fields.
- Represent missing visual media explicitly and preserve useful text rather than emitting a broken image.
- Keep semantic state classes/data attributes stable across skins.
- Do not rely on array index as canonical correctness after normalization.
- Preserve two-choice and three-choice layouts; reject four choices at the existing boundary.
- Split Phase 4 internally into model/renderer and caller migration commits or cohesive steps if helpful, but do not mark it complete until both are integrated.
- Remove adapters when their final caller migrates; do not leave parallel render paths.

## Verification focus

- Pure choice-state, label, escaping, tier, and fallback tests.
- Exhaustive registry parity showing every skin renders text and visual content.
- Integration through production and Sandbox public entry points.
- Layout-slot tests for baseline and every production layout.
- Pairwise phase/aspect/mascot/style coverage rather than a full Cartesian product.
- Intentional visual evidence for visual choices under each skin.
- Existing Phase 1–3 contracts remain green except explicitly superseded divergence assertions.

## Acceptance criteria

- Every required case in `phase-04-test-matrix.md` passes.
- One semantic choice renderer is used by production and Sandbox.
- One `choicesHtml` slot replaces split text/visual slots in active layout contracts.
- Every Answer Card registry variant supports both text and visual choice content.
- Correctness, labels, escaping, tiers, missing-media fallback, and phase states have one owner.
- Old dual renderers, duplicate Sandbox visual renderer, and split-slot adapters are removed.
- Current 2/3-choice schema remains unchanged and four choices remain rejected.
- Visual changes are limited to applying the selected skin consistently to visual choices and are explicitly reviewed.
- Applicable workspace gates and primary workflows pass.
- Phase 4 handoff is complete and Phase 5 becomes `READY` only after the exit gate passes.

## Stop rules

Stop when the Phase 3 model lacks enough canonical information to render choices without re-querying, when a skin requires an unbounded special-case API, when the slot migration would break an unknown external consumer, or when visual evidence cannot distinguish intended parity from accidental regression.
