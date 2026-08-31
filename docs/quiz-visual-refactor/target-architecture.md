# Target Quiz Visual Architecture

Status: implemented and acceptance-closed through Phase 8

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

`buildQuizSceneRenderModel` normalizes question data, resolved asset references and deterministic fallbacks, canonical answer state, phase, mascot occupancy, accepted layout capability, resolved styles, aspect ratio, and palette. Production and Sandbox use separate pure state/surface adapters, then call the same model and semantic-part builders. Production retains compiled timeline timing; Sandbox retains explicit phase and scrub-time control.

### Choice renderer

`renderChoiceGroup` is the single choice workflow for production and Sandbox. It owns normalized ordering, A/B/C labels, canonical-ID correctness, phase states, escaping, accessible attributes, typography tiers, deterministic media fallback, and stable group/card markup. `AnswerCardSkin` owns only a stable class, optional bounded decoration/status hooks, and CSS; every registered skin supports both text and visual content.

### Layout renderer

A layout arranges semantic slots and publishes capacity tokens. It does not select an Answer Card implementation or own choice workflow. The active layout contract has one `choicesHtml` slot, and layout CSS no longer owns skin decoration.

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

Implemented in Phase 2 and acceptance-closed in Phase 8D. The production catalog is executable policy and the only owner of layout render/asset dimensions. It declares supported choice presentations, counts, supported versus recommended formats, media requirements, aspect ratios, and metrics. Server CSS, hero-area calculations, optimization, QA, and preview consumers read the catalog directly; no parallel dimensions view remains. The pure resolver returns a compatible layout or structured incompatibility, preserves the established auto policy, and never silently replaces an incompatible explicit request. The preview-only baseline remains outside the production catalog.

### Presets

Visual presets bundle theme, palette, element skins, and eventually background style. They do not force a production layout. A preview layout may remain as showcase metadata.

### Backgrounds

Background is an independent visual axis. A `SceneBackgroundVariant` owns deterministic inner HTML, CSS, motion limits, and a static reduced-motion fallback. Both surfaces wrap it in one canonical semantic background layer and compositions bundle selected variant CSS once. The obsolete Phase 7 adapter is removed. Palette remains semantic color data; foreground motion remains separate.

## Resolution policy direction

The shared resolver defines and tests this precedence contract:

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
