# Mascot Rendering Contract V2

Status: Batch E portrait parity and persistence migration complete; legacy strip paths remain compatibility-only

The contract defines one coordinate system and one render input for Visual Sandbox, Stage Studio, and final video. It uses snake_case to match the existing channel/API data model. Batch B provides in-memory normalization and deterministic resolution; Batch C connects production; Batch D connects the preview/editor surfaces; Batch E completes portrait output and opt-in V2 persistence migration.

## Asset model

- New assets are single images, one image per mascot action.
- Motion is a deterministic CSS/transform preset; authoring generates one image per action.
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
    → mascot scale and horizontal flip around the registered pivot (bottom-center by default)
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

`MascotRenderConfigV2` is versioned and contains placement per aspect ratio plus a complete visibility policy. `MascotRenderSpecV2` is the fully resolved, deterministic input consumed by both preview and production renderers.

## Batch B core engine

The shared implementation in `packages/shared/src/mascot/` now provides:

- `adaptMascotV1ToV2` — converts legacy profile/config data in memory without writing it back;
- `resolveMascotRenderSpec` — applies visibility, phase action, reveal outcome, fallback, aspect placement, and timeline state;
- `resolveMascotRenderGeometry` — computes canvas-space box, pivot, visible content bounds, offsets, and flip;
- `resolveMascotMotionTransform` — computes deterministic CSS-independent motion from preset, speed, intensity, and timestamp.

Legacy multi-frame metadata is copied only into the optional `legacy_animation` compatibility field. New single-image assets do not require it. Missing action assets use the fallback asset's own registration and motion metadata; if no action asset exists, the master image is synthesized with the requested action's default motion.

Timeline states such as `curious`, `surprised`, and `encourage` can be supplied as an explicit action override and are mapped to the canonical action set. The legacy `explanation` phase name is normalized to the contract's `explain` phase before resolution.

## Batch C production integration

The HyperFrames Candy Arcade production path now uses
`apps/server/src/quiz/render/productionMascotRenderer.ts`. For every production
clip it adapts the persisted V1 profile in memory, resolves the phase/action
against the compiled timeline, and serializes a V2 layer with:

- the selected canonical canvas (`1920×1080` for `16:9` or `1080×1920` for `9:16`) and `220×220` logical base box;
- anchor, channel offsets, scale, horizontal flip, registered pivot, visible
  bounds, and action registration offsets;
- resolved fallback asset identity and motion preset/speed/intensity;
- phase transitions and timeline state overrides (`mascot.state` events);
- optional `legacy_animation` metadata for existing multi-frame assets.

The production DOM hierarchy keeps placement offset outside the scaled frame,
applies scale/flip around the registered pivot, applies action registration
offsets next, and applies deterministic motion last. New V2 assets use one image
per action with CSS-independent motion metadata. Legacy frame strips remain
readable only through the adapter compatibility field; they are not the V2
authoring model.

The legacy `renderMascotHtmlLayer` export remains available only for older callers
and compatibility tests. New production output uses the V2 renderer. Production
output uses the configured aspect ratio and passes the same canvas dimensions to
every HyperFrames sub-composition.

## Batch D preview and editor parity

Visual Sandbox and Stage Studio now call the same backend preview endpoint and
the same V2 resolver/HTML serializer used by production. The preview request
carries the complete placement and state contract:

- `scale`, anchor, offsets, and `flip_x`;
- phase, action/state override, reveal outcome, visibility policy, and timeline time;
- resolved fallback asset registration, visible bounds, motion preset, speed, and intensity.

Stage Studio keeps a transparent 220×220 editor-control box only for drag/resize
input. The visible mascot is rendered inside the preview iframe, so the editor
does not draw a second mascot implementation. Stale preview responses are
discarded by request identity, and a candidate iframe is promoted only after
font verification succeeds.

The Stage Studio 9:16 switch changes the editor frame, fit calculation, backend
preview canvas, and sub-composition dimensions together. The final video uses
the same `video_generation.aspect_ratio` setting, so portrait preview and
production share the 1080×1920 canvas contract.

## Compatibility rules

- Existing V1 `ChannelMascotConfig` and `MascotSpriteAction` remain readable during migration.
- V1 data is normalized in memory before rendering through `adaptMascotV1ToV2`.
- V2 is written by the Batch E migration (dry-run/apply/rollback) and preserved by mascot repository writes.
- Legacy metadata is not deleted as part of Batch B.
- A migration must preserve the observed V1 visual position, or record an explicit conversion when offset semantics change.

The old `generate-sprite` and `upload-sprite` routes remain available for
backward-compatible imports and clients. They are deprecated for authoring:
new action assets are single images with deterministic V2 motion metadata.

## Batch E persistence migration

`POST /api/mascots/migration` defaults to `dry_run`. Use `mode: "apply"` with
an explicit `migration_id` to write `schema_version: 2` and `render_bundle`
fields. Each applied mascot receives a runtime backup and checksum-protected
manifest. `mode: "rollback"` restores only manifests that are unchanged since
migration; a changed V2 manifest is reported as a conflict instead of being
overwritten.

## Deferred follow-on scope

- Legacy V1 fields/assets are retained until a separately approved removal and
  data-retention plan; they are not required by the active V2 authoring path.
- Legacy route names remain as compatibility shims until downstream clients have
  migrated to action-image terminology.
