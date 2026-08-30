# ADR-004: Treat Background Style as an Independent Axis

Status: Accepted

## Context

Current Candy Arcade scenes hard-code gradient, ray, pattern, shape, and decoration layers. Palette supplies colors, while motion_id describes foreground scene motion. Sandbox and production duplicate background markup.

Adding background animation to layout modules or palette definitions would mix unrelated responsibilities and create a large combination matrix.

## Decision

Introduce a Scene Background variant registry after the core renderer and CSS boundaries are stable.

A background variant owns:

- deterministic layer HTML;
- its CSS and animation;
- performance metadata or limits;
- a static reduced-motion fallback;
- deterministic seeding where variation is required.

Palette remains semantic color data. Foreground motion and transitions remain independent. Visual presets may select a background style ID.

## Consequences

- Background can vary without changing layout or choice skins.
- The current Candy background becomes the compatibility default before any new effect is added.
- Preview and production must call the same background renderer.
- Performance and motion-budget verification become part of registry acceptance.

## Phase impact

Phase 1 records current duplicate markup. Phase 7 implements the registry.
