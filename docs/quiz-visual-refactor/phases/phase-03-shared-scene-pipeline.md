# Phase 3 Execution Brief: Shared Scene Pipeline

Status: PLANNED

Dependency: Phase 2 COMPLETE with a dated handoff

## Goal

Create one normalized quiz scene render model and one shared scene-part builder used by production composition and Sandbox preview. Remove duplicated semantic assembly while preserving timeline behavior, current choice renderers, layout slots, styles, and visible output.

## User-visible outcome

Sandbox and production are driven by the same question, phase, answer-state, asset, mascot-occupancy, layout, and resolved-style model. A preview of a canonical state represents the same semantic scene as production at the corresponding timeline state, without intentional visual redesign.

## Required architecture

Introduce cohesive contracts and application services for:

- normalized scene inputs and resolved layout result;
- question, choices, correct choice, assets, phase, aspect ratio, and mascot occupancy;
- resolved element style and palette inputs passed into rendering;
- production timeline-to-scene-state adaptation;
- Sandbox simulated-time/phase-to-scene-state adaptation;
- shared construction of question, counter, hero/media, current text/visual choice parts, phase content, brand, and other stable semantic parts.

The shared model must not import web components, HyperFrames document assembly, filesystem/provider clients, or browser state. Production retains compiled timeline timing and Sandbox retains interactive simulated time; adapters translate both into the same scene state.

## In scope

1. Define explicit scene model, phase, part, and adapter contracts in focused modules.
2. Extract duplicated semantic state calculation and shared element-part construction from production and Sandbox.
3. Make both public composition entry points use the shared builder.
4. Preserve the Phase 2 compatibility result rather than resolving layout again in downstream renderers.
5. Preserve existing choice render paths behind a temporary focused adapter until Phase 4.
6. Preserve existing layout slot shape behind a temporary adapter until Phase 4.
7. Keep background markup and CSS behavior compatible behind one legacy scene-background part; registry work remains Phase 7.
8. Add cross-surface contract tests and update dossier/handoff evidence.

## Out of scope

- No unified choice renderer or visual skin parity.
- No `choicesHtml` slot migration.
- No CSS ownership rewrite or preset precedence change.
- No new layout, element skin, palette, or background style.
- No timeline compiler redesign.
- No four-choice support.
- No web selector redesign.

## Implementation constraints

- Avoid a god `sceneBuilder` file. Separate model types, pure state normalization, element-part rendering, and surface adapters.
- Keep production and Sandbox entry points thin.
- Pass dependencies explicitly; do not introduce hidden mutable globals or service locators.
- Model phase and answer state explicitly instead of deriving behavior from arbitrary CSS strings.
- Keep asset lookup and provider/filesystem I/O at existing boundaries; the core model receives resolved references or fallbacks.
- Preserve escaping, canonical correct-choice identity, deterministic ordering, and latest-preview request behavior.
- Any compatibility adapter must have a named Phase 4 or Phase 7 removal owner.

## Verification focus

- Pure tests for timeline and Sandbox phase adapters.
- Contract tests proving equivalent normalized models for matching production/Sandbox states.
- Shared-part tests for question, counter, hero, phase, mascot occupancy, and missing assets.
- Integration tests through both public composition entry points.
- Existing Phase 1 and Phase 2 suites remain green.
- Structural evidence that duplicated semantic calculations were removed rather than copied into a third path.

## Acceptance criteria

- Every required case in `phase-03-test-matrix.md` passes.
- Production and Sandbox both call one normalized model builder and one shared semantic part builder.
- Timeline and interactive preview remain separate adapters with deterministic mappings.
- Existing production output timing and Sandbox phase controls retain observable behavior.
- Choice rendering and layout-slot compatibility adapters are isolated and assigned to Phase 4 removal.
- Background compatibility adapter is isolated and assigned to Phase 7 removal.
- No intentional visual, schema, layout, preset, or choice-count change occurs.
- Applicable workspace gates and primary workflows pass.
- Phase 3 handoff is complete and Phase 4 becomes `READY` only after the exit gate passes.

## Stop rules

Stop when sharing the pipeline would require changing the timeline contract, when Phase 2 compatibility output is unavailable or unstable, when parity can be achieved only by hiding surface-specific behavior inside the core model, or when overlapping user changes make extraction unsafe.
