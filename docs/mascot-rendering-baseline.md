# Mascot Rendering Baseline

Status: Batch A characterization, 2026-08-29

This document records the current mascot rendering paths before the V2 contract is connected. It is intentionally descriptive: Batch A does not change Stage Studio, Visual Sandbox, or video output behavior.

## Current paths

| Surface        | Current implementation                                      |    Mascot base box | Source of scale               |
| -------------- | ----------------------------------------------------------- | -----------------: | ----------------------------- |
| Visual Sandbox | Backend `buildSandboxComposition` HTML in a 1920×1080 frame | 220×220 logical px | `mascot_scale` request value  |
| Stage Studio   | React mascot overlay over a backend background-only preview |     250×250 CSS px | Local `scale` state           |
| Final video    | HyperFrames composition using `renderMascotHtmlLayer`       | 220×220 logical px | Channel `mascot_config.scale` |

The production and Sandbox path uses `.candy-mascot-container`/`.candy-mascot-sprite` in `apps/server/src/quiz/render/candyArcade/candyArcadeStyles.ts`. Stage Studio uses `.stage-mascot-sprite` in `apps/web/src/styles/features/mascot.css` and is therefore not a WYSIWYG view of the production mascot layer.

## Scale comparison

For the same numeric scale `s`:

```text
Stage Studio rendered box = 250 × s px
Sandbox/video rendered box = 220 × s px
Sandbox/video ÷ Stage Studio = 0.88
```

The final video is therefore 12% smaller in linear box dimensions than the current Stage Studio overlay for the same saved scale. This comparison describes the CSS box; transparent pixels inside an asset can make the visible character differ further.

## Other captured divergences

- Stage Studio anchors at `bottom: 0` and `left/right: 36px`; production uses `bottom: 18px` and `left/right: 32px` for the question layer, with different intro/outro anchors.
- Stage Studio requests `stage_preview_layout_only`, so the backend preview does not contain the real mascot. The overlay is rendered by a separate React implementation.
- Stage Studio currently applies action motion metadata in the overlay. The production HTML resolver currently resolves motion metadata but does not yet serialize all preset, speed, and intensity values into the rendered layer.
- Stage Studio keeps `flipHorizontal` as local state; the current channel mascot configuration has no persisted flip field.
- Stage Studio supports a 1080×1920 viewport, while the Sandbox composition is still hard-coded to a 1920×1080 document.
- New Mascot Studio state assets default to `frames_count = 1` and use CSS motion. The API/schema and production CSS still contain a multi-frame compatibility path; it is not the active authoring model.
- Stage Studio resolves a fallback image URL separately from the fallback action metadata, so a missing action can display one asset with another action's offset/motion metadata.

## Characterization coverage

The existing server tests cover the current scalar propagation and mascot HTML output in `apps/server/test/sandboxComposition.test.ts` and `apps/server/test/mascotStateResolver.test.ts`. Batch A adds focused V2 schema tests without changing these expectations. Later batches must add screenshot/frame comparison tests before replacing any path.

## Batch A boundary

Batch A adds only shared V2 declarations and documentation. It does not:

- change persisted channel or mascot data;
- migrate legacy assets;
- alter CSS dimensions;
- connect a new resolver;
- change preview or final video output.
