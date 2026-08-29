# Mascot Rendering Baseline

Status: Batch E implementation complete, with the pre-V2 characterization retained below, 2026-08-30

The first section records the mascot rendering paths before the V2 contract was
connected. It remains a historical comparison point. The second section records
the current Batch E paths; the normative field and transform definitions live in
`mascot-rendering-contract.md`.

## Pre-V2 characterization

| Surface                   | Pre-V2 implementation                                       |    Mascot base box | Source of scale               |
| ------------------------- | ----------------------------------------------------------- | -----------------: | ----------------------------- |
| Visual Sandbox            | Backend `buildSandboxComposition` HTML in a 1920×1080 frame | 220×220 logical px | `mascot_scale` request value  |
| Stage Studio              | React mascot overlay over a backend background-only preview |     250×250 CSS px | Local `scale` state           |
| Final video (pre-Batch C) | HyperFrames composition using `renderMascotHtmlLayer`       | 220×220 logical px | Channel `mascot_config.scale` |

The production and Sandbox path uses `.candy-mascot-container`/`.candy-mascot-sprite` in `apps/server/src/quiz/render/candyArcade/candyArcadeStyles.ts`. Stage Studio uses `.stage-mascot-sprite` in `apps/web/src/styles/features/mascot.css` and is therefore not a WYSIWYG view of the production mascot layer.

## Historical scale comparison

For the same numeric scale `s`:

```text
Stage Studio rendered box = 250 × s px
Sandbox/video rendered box = 220 × s px
Sandbox/video ÷ Stage Studio = 0.88
```

The final video is therefore 12% smaller in linear box dimensions than the current Stage Studio overlay for the same saved scale. This comparison describes the CSS box; transparent pixels inside an asset can make the visible character differ further.

## Historical divergences

- Stage Studio anchors at `bottom: 0` and `left/right: 36px`; production uses `bottom: 18px` and `left/right: 32px` for the question layer, with different intro/outro anchors.
- Stage Studio requests `stage_preview_layout_only`, so the backend preview does not contain the real mascot. The overlay is rendered by a separate React implementation.
- Stage Studio currently applies action motion metadata in the overlay. The pre-Batch C production HTML resolver resolved motion metadata but did not serialize all preset, speed, and intensity values into the rendered layer.
- Stage Studio keeps `flipHorizontal` as local state; the current channel mascot configuration has no persisted flip field.
- Stage Studio supports a 1080×1920 viewport, while the Sandbox composition is still hard-coded to a 1920×1080 document.
- New Mascot Studio state assets default to `frames_count = 1` and use CSS motion. The API/schema and production CSS still contain a multi-frame compatibility path; it is not the active authoring model.
- Stage Studio resolves a fallback image URL separately from the fallback action metadata, so a missing action can display one asset with another action's offset/motion metadata.

## Current Batch E paths

| Surface        | Current renderer                                                   |       Canonical canvas |    Mascot base box | Scale source                           |
| -------------- | ------------------------------------------------------------------ | ---------------------: | -----------------: | -------------------------------------- |
| Visual Sandbox | Backend `buildSandboxComposition` → `renderPreviewMascotHtmlLayer` | selected `16:9`/`9:16` | 220×220 logical px | `mascot_scale` → V2 placement          |
| Stage Studio   | Backend preview iframe using the same preview renderer             | selected `16:9`/`9:16` | 220×220 logical px | editor state → V2 placement            |
| Final video    | HyperFrames Candy Arcade → `renderProductionMascotHtmlLayer`       |   config `16:9`/`9:16` | 220×220 logical px | channel `mascot_config` → V2 placement |

For 16:9, preview and production now serialize the same V2 placement, asset
registration, visible bounds, action, motion metadata, and timeline state. The
editor overlay is controls only; it does not render a second mascot image.

## Characterization coverage

The server tests cover scalar propagation and mascot HTML output in
`apps/server/test/sandboxComposition.test.ts`, `apps/server/test/mascotStateResolver.test.ts`,
`apps/server/test/mascotPreviewParity.test.ts`, and
`apps/server/test/productionMascotRenderer.test.ts`. Web tests cover the canonical
Stage Studio request/timeline mapping and preset persistence. Batch E adds
portrait contract and migration coverage in `apps/server/test/mascotBatchE.test.ts`;
screenshot/frame comparison remains an optional visual QA follow-up when a media
fixture is available.

## Batch A historical boundary

Batch A adds only shared V2 declarations and documentation. It does not:

- change persisted channel or mascot data;
- migrate legacy assets;
- alter CSS dimensions;
- connect a new resolver;
- change preview or final video output.
