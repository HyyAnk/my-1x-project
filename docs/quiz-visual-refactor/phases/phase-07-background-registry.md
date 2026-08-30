# Phase 7 Execution Brief: Background Variant Registry

Status: PLANNED

Dependency: Phase 6 COMPLETE with a dated handoff

## Goal

Make scene background an independent, typed visual axis with one registry used by production and Sandbox. Extract the current Candy background as the compatibility default, prove extension with one lightweight deterministic animated variant, and integrate background selection with Phase 5 style/preset resolution.

## Compatibility and proof variants

- `auto`: inherited selection resolved by shared style policy.
- `candy_rays`: compatibility variant that preserves current gradient, rays, patterns, shapes, and scene decoration behavior.
- One additional palette-driven proof variant with a concise stable ID selected during implementation after checking current naming. It must be deterministic, lightweight, and visually distinct without coupling to a layout.

Record the chosen proof ID and rationale in the Phase 7 handoff. Do not add several speculative effects in this phase.

## User-visible outcome

Existing presets and episodes continue to use the current Candy background by default. Users can select the proof background in the existing design workflow and see immediate synchronized preview feedback. Production and Sandbox render the same selected background, including a static reduced-motion fallback.

## Interaction prerequisite

Before implementation, review and update `phase-07-interaction-plan.md` against the Phase 6 UI and Phase 5 style resolution. Record deviations in the Phase 7 handoff.

## Required architecture

A background variant contract owns:

- stable ID and display metadata boundary;
- deterministic layer HTML;
- scoped CSS and keyframes;
- reduced-motion/static behavior;
- declared layer/animation or performance metadata;
- deterministic seed input when variation is required.

The registry and renderer are independent from layout, palette definition, foreground motion, transition, and choice skin. Palette values are inputs; a background does not define a duplicate palette.

## In scope

1. Add backward-compatible optional background style contracts to shared schemas/configuration, Sandbox requests, render inputs, and preset/style resolution.
2. Extract current duplicated production/Sandbox background markup and CSS into `candy_rays` without visual drift.
3. Add one proof animated variant with deterministic output and static fallback.
4. Make Phase 3 scene construction call one selected background renderer on both surfaces.
5. Include only required background HTML/CSS once per scene/composition.
6. Add background selection to the existing scalable design control pattern with concise labels and synchronized async preview.
7. Keep visual presets independent from production layout while allowing them to select a background style.
8. Add registry, resolver, determinism, reduced-motion, performance, surface-parity, UI, and visual evidence.

## Out of scope

- No new layout, choice count, question format, Answer Card skin, palette system, foreground motion, or transition system.
- No WebGL/canvas dependency or external runtime solely for a background effect.
- No nondeterministic `Math.random()` output.
- No large catalog of new backgrounds.
- No background-specific layout branches.
- Four-choice support remains a separate deferred project.

## Implementation constraints

- Existing data with no background field resolves to `candy_rays`.
- Additive optional persisted fields must parse old records without migration.
- Use stable episode/question/preview seed inputs where variation is needed.
- Prefer transform and opacity animation; avoid layout-thrashing properties and excessive DOM layers.
- Scope selectors to the background root and do not target choice/layout internals.
- Reduced motion must remove continuous decorative animation and retain an intentional static composition.
- Production and Sandbox may differ in timing adapters but not background variant markup semantics.
- UI actions follow the Phase 6 synchronization and accessibility contract.

## Verification focus

- Enum/catalog/registry/preset/UI metadata exhaustiveness.
- Missing/auto/current-default resolution and old-data parsing.
- Byte-stable or structurally deterministic output for identical seeds.
- Different seed behavior only where declared.
- Production/Sandbox parity for each variant and palette.
- Reduced-motion static output and performance budget evidence.
- UI pending/error/retry/latest-response behavior.
- Existing Phase 1–6 suites remain green.

## Acceptance criteria

- Every required case in `phase-07-test-matrix.md` passes.
- One registry and renderer own background HTML/CSS for production and Sandbox.
- Existing records and presets retain `candy_rays` behavior by default.
- One proof animated variant is selectable end-to-end and deterministic.
- Every variant has a reviewed static reduced-motion fallback and declared performance bounds.
- Background remains independent from layout, palette storage, foreground motion, transition, and choice skins.
- UI selection is accessible, synchronized, and uses no manual refresh.
- Applicable workspace gates and rebuilt/restarted primary workflows pass.
- Phase 7 handoff is complete and roadmap marks the core refactor complete; four-choice work remains explicitly deferred.

## Stop rules

Stop when background selection requires a breaking persisted migration, when current Phase 3/5 boundaries cannot accept a background without layout or palette coupling, when the proof effect cannot meet deterministic/reduced-motion/performance requirements, or when UI synchronization regresses.
