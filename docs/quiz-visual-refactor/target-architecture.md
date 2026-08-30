# Target Quiz Visual Architecture

Status: approved direction, implementation deferred to later phases

Phase 1 does not implement this document. It creates executable evidence that later phases must preserve or intentionally migrate.

## Target flow

    Quiz question, resolved assets, phase, timing, and style inputs
        ↓
    buildQuizSceneRenderModel
        ↓ one normalized model shared by Sandbox and production
    element renderers plus renderChoiceGroup
        ↓ stable semantic scene parts
    layout renderer
        ↓ arranges question, optional media, choices, and phase
    base CSS plus layout tokens plus selected skins plus background variant
        ↓
    preview or HyperFrames production output

## Responsibility boundaries

### Shared contracts

Shared contracts own persisted IDs, layout capabilities, choice representation types, validation, and pure resolution policies. They do not depend on server HTML or web components.

### Scene model builder

One application service normalizes question data, assets, answer state, phase, timing, mascot occupancy, selected layout, resolved styles, and palette into a render model. Sandbox supplies simulated time; production supplies compiled timeline time.

### Choice renderer

One renderer owns choice iteration, canonical answer state, labels, escaping, media fallback, tier assignment, and stable semantic markup. A skin may add decorations or specialized status content but does not reimplement the workflow.

### Layout renderer

A layout arranges semantic slots and publishes capacity tokens. It does not select an Answer Card implementation or style skin internals.

The intended slot direction is:

    questionHtml
    mediaHtml optional
    choicesHtml
    phaseHtml

Counter/header chrome remains outside layout until a concrete layout requires layout-specific placement.

### CSS ownership

- Base component CSS owns structure and lifecycle states.
- Layout CSS owns placement, outer dimensions, gap, and capacity tokens.
- Skin CSS owns colors, borders, shadows, textures, and optional decorations.
- Typography tier CSS consumes layout-provided tokens.
- Background CSS belongs to a selected background variant.
- Emergency overrides are exceptional; normal variants do not depend on important declarations.

### Layout capabilities

The catalog becomes executable policy. A layout declares supported choice presentations, counts, formats, media requirements, aspect ratios, and render/asset metrics. A pure resolver returns a compatible layout or a structured failure/fallback reason.

### Presets

Visual presets bundle theme, palette, element skins, and eventually background style. They do not force a production layout. A preview layout may remain as showcase metadata.

### Backgrounds

Background is an independent visual axis. A SceneBackgroundVariant owns deterministic layer HTML, CSS, motion limits, and a static reduced-motion fallback. Palette remains semantic color data; foreground motion remains separate.

## Resolution policy direction

Later work must define and test one shared precedence contract for:

    theme defaults
        < channel defaults
        < selected episode/preset values
        < explicit episode custom values
        < explicit Director beat values

The exact persisted representation must preserve current episodes and distinguish inherited auto values from explicit selections.

## Migration constraints

- Preserve existing episode and Director artifacts.
- Keep baseline preview compatibility until all callers migrate.
- Do not add a parallel preset system.
- Do not increase choice counts as a side effect of renderer work.
- Remove compatibility adapters in the same phase that migrates their final caller, or record an owner and removal condition.
- Keep production and Sandbox synchronized through shared application services rather than duplicate fixes.

## Success shape after the core refactor

Adding a 2- or 3-choice layout should primarily require:

1. one shared capability/catalog entry;
2. one focused server layout module;
3. one exhaustive UI metadata entry and translations;
4. contract, integration, and visual verification cases.

It should not require a new choice renderer, new palette serializer, hard-coded optimizer branch, or skin-specific layout overrides.
