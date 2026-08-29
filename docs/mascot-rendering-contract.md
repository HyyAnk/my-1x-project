# Mascot Rendering Contract V2

Status: Batch A contract declaration; no runtime consumer yet

The contract defines one coordinate system and one render input for Visual Sandbox, Stage Studio, and final video. It uses snake_case to match the existing channel/API data model. Runtime normalization and migration are intentionally deferred to Batch B.

## Asset model

- New assets are single images, one image per mascot action.
- Motion is a deterministic CSS/transform preset, not a newly generated spritesheet.
- Every asset declares its source dimensions, visible content bounds, pivot, and action registration offset.
- Legacy multi-frame metadata may be read by a compatibility adapter in Batch B, but new V2 writes do not create it.

## Canvas and scale

- Landscape canvas: `1920×1080`.
- Portrait canvas: `1080×1920`.
- Canonical mascot base box: `220×220` logical pixels.
- `scale` is a unitless multiplier in the inclusive range `0.3–3.0`.
- `scale = 1` means the canonical 220px box at output resolution, independent of browser zoom or viewport fit.
- The default placement is bottom-left, scale 1, zero offsets, and no horizontal flip.
- The existing recommended placement remains available as a named preset: bottom-left, scale 1.84, X +21, Y +90.

## Transform order

The renderer must preserve this order:

```text
canvas anchor
  → channel placement offset (unscaled logical canvas pixels)
    → mascot scale and horizontal flip around bottom-center pivot
      → per-action registration offset
        → motion transform
```

Channel placement offsets and action registration offsets are separate values. Viewport Fit/zoom must never mutate either value.

## Motion

Each action has:

- a motion preset;
- a speed multiplier from `0.1` to `5.0`;
- an intensity of `subtle`, `normal`, or `dynamic`.

The same resolved motion values and timeline timestamp must produce the same transform in preview and video. `none` means no motion transform. The editor may pause playback, but the final renderer is driven by the composition clock rather than a browser interval.

## Visibility and phase rules

The V2 policy names these phases explicitly:

```text
intro → question → choices → thinking → reveal → explain → outro
```

Each phase declares visibility, action, enter transition, and exit transition. Reveal outcome mapping is explicit for `correct`, `wrong`, and `timeout`. A missing action is resolved through the shared fallback chain, including the metadata belonging to the fallback asset.

## V2 data shape

The public declarations live in `packages/shared/src/mascot/`:

- `renderTypes.ts` — framework-independent types;
- `renderSchema.ts` — Zod boundary validation;
- `renderConstants.ts` — canvas, scale, and default policy constants;
- `index.ts` — feature barrel export.

`MascotRenderConfigV2` is versioned and contains placement per aspect ratio plus a complete visibility policy. `MascotRenderSpecV2` is the fully resolved, deterministic input that the canonical renderer will consume in Batch B.

## Compatibility rules

- Existing V1 `ChannelMascotConfig` and `MascotSpriteAction` remain readable during migration.
- V1 data is normalized in memory before rendering.
- V2 is written only after the Batch B migration path is tested.
- Legacy metadata is not deleted as part of Batch A.
- A migration must preserve the observed V1 visual position, or record an explicit conversion when offset semantics change.

## Non-goals for Batch A

- No UI behavior change.
- No renderer integration.
- No 9:16 output claim.
- No deletion of legacy fields or assets.
