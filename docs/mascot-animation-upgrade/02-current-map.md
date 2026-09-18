# Current System Map and Integration Seams

## Existing model

MascotProfile contains styles. Each style has an anchor_image_url and states.thinking and states.celebrate arrays. Each slot is numbered 1 through 10 and currently stores an image_url, prompt_modifier and motion metadata.

The current slot generator in apps/server/src/quiz/mascot/artGenerator.ts creates one image per slot from the anchor or master reference. The current web motion studio previews an image with CSS motion presets. The shared renderer resolves phase and action and serializes one image with optional legacy multi-frame metadata.

## Required seam

Do not grow artGenerator.ts or MascotAnimationCanvas.tsx into orchestration modules. Add focused modules for animation types, recipes, fingerprints, process execution, artifact import, job persistence, QA, deterministic selection and frame lookup.

## Preserve

- MascotProfileSchema and style identity fields.
- Style anchors and existing slot identity.
- MascotRenderBundleV2 placement and registration geometry.
- Phase rules and reveal outcome mapping.
- Existing source localization and asset caching.
- Existing task locks and structured server logging.
- English-only code, test names, UI labels and documentation.

## Existing compatibility note

The renderer already has a legacy animation path using frames_count, fps, frame_width and frame_height. The new path must use the sprite-gen manifest rectangles as the source of truth. Do not assume equal-width grid cells and do not copy pre-curation frames as a deliverable.

