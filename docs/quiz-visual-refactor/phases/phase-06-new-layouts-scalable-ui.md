# Phase 6 Execution Brief: New Layouts and Scalable UI

Status: PLANNED

Dependency: Phase 5 COMPLETE with a dated handoff

## Goal

Prove the refactored architecture by adding two production layouts under the existing two/three-choice domain contract and replacing fixed two-layout UI assumptions with a scalable, accessible selector driven by exhaustive metadata.

## New proof layouts

Add these persisted production IDs unless current Phase 5 evidence proves a naming conflict:

### `media_top_choices_bottom`

- text choice presentation;
- two or three choices;
- supports `multiple_choice`, `image_guess`, and `true_false`;
- optional/expected hero media expressed through Phase 2 capabilities;
- supports 16:9 and 9:16;
- media occupies the upper region and unified choices occupy the lower region.

### `full_stack_list`

- text choice presentation;
- two or three choices;
- supports `multiple_choice` and `true_false`;
- no required hero media;
- supports 16:9 and 9:16, with portrait readability as a primary proof;
- question and unified choices use a clear vertical stack.

Both layouts are explicit-selection options in this phase. Existing `auto` resolution remains unchanged so current episodes do not silently change composition.

## User-visible outcome

Users can preview and explicitly select four production layouts through one compact control that scales beyond two items. Selection receives immediate feedback, preview state stays synchronized without refresh, and both new layouts render correctly across aspect ratios, phases, skins, long-text tiers, and mascot occupancy.

## Interaction prerequisite

Before implementation, review and update `phase-06-interaction-plan.md` against the current UI. Use it to guide the implementation and record deviations in the Phase 6 handoff.

## In scope

1. Add both IDs to shared schemas and the Phase 2 capability catalog.
2. Update Director schema, prompt, parser, and audit consumers that enumerate persisted IDs so explicit new selections round-trip safely without changing auto policy.
3. Add one focused renderer module per layout using Phase 4 slots and Phase 5 CSS ownership.
4. Supply capability-derived render/asset metrics, QA capacity tokens, and both aspect-ratio rules.
5. Add exhaustive web UI metadata and concise translations without layout-specific conditional branches.
6. Replace the fixed two-button Sandbox selector with a compact accessible select, listbox, or established project equivalent that can scale.
7. Update Stage Studio, Episode Preview, and other layout-label/thumbnail consumers through the shared UI metadata catalog.
8. Preserve immediate local selection, pending feedback, latest-request-wins synchronization, error recovery, and unrelated controls.
9. Verify existing responsive footer credit instead of adding a duplicate.
10. Add structural, integration, responsive, and visual evidence for both new layouts.

## Out of scope

- No four-choice schema, 2x2 grid, mixed-choice product format, or new question format.
- No new Answer Card skin, preset system, palette, or background registry.
- No change to current auto-selection policy.
- No broad redesign of Sandbox, Stage Studio, or Episode pages.
- No layout-specific business rules outside the capability catalog.

## Implementation constraints

- Each layout module owns only structure, aspect adaptation, and capacity tokens.
- Do not branch on new IDs in optimizer, QA, preview request builders, or UI icon rendering when catalog/metadata can drive behavior.
- Keep IDs, metadata, renderers, and translations exhaustive through typed records.
- Use concise visible copy, no title with a trailing period, and no redundant descriptions or one-button-per-layout expansion.
- Optional descriptions belong in an accessible tooltip/popover or the opened option surface, with keyboard focus and touch fallback.
- Every selection receives immediate visible acknowledgement; prevent duplicate preview submissions while the same request is pending without freezing unrelated controls.
- Ignore stale or out-of-order preview responses and preserve user selection on failure.
- Honor `prefers-reduced-motion` and root `AGENTS.md` responsive footer requirements.

## Verification focus

- Shared schema/catalog and exhaustive registry/UI metadata tests.
- Existing auto resolution unchanged; explicit new IDs compatible only with declared contexts.
- Layout structural tests using unified slots and capability metrics.
- Pairwise skin/phase/aspect/mascot/text-tier renders.
- UI component and preview synchronization tests for pending, success, error, retry, rapid changes, and stale responses.
- Browser verification at desktop and mobile widths with keyboard and touch-sized controls.
- Existing Phase 1–5 suites remain green.

## Acceptance criteria

- Every required case in `phase-06-test-matrix.md` passes.
- Both new IDs work end-to-end in schema, catalog, renderer, production composition, Sandbox, UI metadata, translations, QA, and asset metrics.
- Existing auto resolution outputs are unchanged.
- No consumer requires a new hard-coded layout branch except the renderer module and exhaustive presentation metadata entry.
- The selector remains usable with four layouts and has an evident extension path for more.
- Both new layouts pass 16:9/9:16, two/three-choice, long-text, phase, skin, mascot, and reduced-motion verification.
- All visible UI and responsive footer requirements from `AGENTS.md` are verified.
- Applicable workspace gates and primary workflows pass after rebuilding/restarting affected processes.
- Phase 6 handoff is complete and Phase 7 becomes `READY` only after the exit gate passes.

## Stop rules

Stop when a new layout would require four choices, when Phase 2 capabilities or Phase 5 CSS boundaries still require per-consumer hard-coded branches, when existing UI state cannot prevent stale response overwrite, or when visual QA cannot be performed at both target aspect ratios.
