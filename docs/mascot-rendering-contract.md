# Mascot rendering contract

Reviewed and updated on 2026-09-16. This documents the canonical Mascot V2 rendering contract, recording the retirement of the legacy V1 Sprite Action model.

## Retirement of Legacy V1 Sprite Action Model

The legacy V1 Sprite Action architecture (based on `MascotSpriteAction`, multi-frame sprite sheets/strips, and the root `mascot.actions` dictionary) is **formally retired**:
- **Authoring Discontinued:** Authoring multi-frame sprite sheets or strips has been discontinued. New mascot assets are authored as standalone V2 action images (`MascotActionAssetV2`) or style state slot variants (`MascotStateVariant`).
- **Compatibility Phase-Out:** Legacy compatibility adapters (`adaptMascotV1ToV2`, `buildLegacySpriteAction`) remain available strictly for transient reading of unmigrated data and are slated for removal. Runtime mutation of `mascot.actions` is disabled.
- **Retired Portrait Path:** Legacy portrait (`9:16`) preview and production composition paths for legacy sprites are retired.

## Canonical Data Models: `render_bundle` and `styles`

`render_bundle` (`MascotRenderBundleV2`) and `styles` (`MascotStyle`) are the canonical, authoritative, and primary data models across all authoring, persistence, preview, and video rendering pipelines:

### 1. `render_bundle` (`MascotRenderBundleV2`)
Defined in [packages/shared/src/mascot/renderTypes.ts](../packages/shared/src/mascot/renderTypes.ts) and validated by [packages/shared/src/mascot/renderSchema.ts](../packages/shared/src/mascot/renderSchema.ts):
- **`config` (`MascotRenderConfigV2`):** Defines placements across supported aspect ratios (`16:9`, `9:16`) with anchor, scale, offset, and flip parameters, alongside visibility phase rules and reveal outcome actions.
- **`assets` (`MascotRenderAssetCatalogV2`):** Maps action keys (`idle`, `wave`, `thinking`, `point`, `celebrate`, `oops`, `outro`) to dedicated `MascotActionAssetV2` instances, each specifying `image_url`, `registration` (source dimensions, content bounds, pivot, offsets), and deterministic `motion` presets (`preset`, `speed`, `intensity`).
- **Canonical Base Geometry:** The base box is 220 by 220 logical pixels in canvas coordinates. Placement transforms apply in strict order:
  ```text
  canvas anchor -> unscaled placement offset -> scale/flip around pivot
  -> per-action registration offset -> deterministic motion
  ```

### 2. `styles` (`MascotStyle[]`)
Defined in [packages/shared/src/mascot/mascotStyleSchema.ts](../packages/shared/src/mascot/mascotStyleSchema.ts):
- Authoritative for costume variants and multi-slot visual diversity across questions.
- Each style contains an `id`, `name`, `keyword`, optional `anchor_image_url`, and a map of `states` (`thinking`, `celebrate`) containing up to 10 slot variants (`MascotStateVariant`).
- Supports both static 3D characters with CSS keyframe motion and transparent WebM VP9 dynamic video animations (`MascotAnimationAssetV1`).

## Runtime Pipeline Consumers

- **State Adaptation:** [productionMascotRenderer.ts](../apps/server/src/quiz/render/productionMascotRenderer.ts) and [productionMascotStateAdapter.ts](../apps/server/src/quiz/render/mascot/productionMascotStateAdapter.ts) adapt question requirements directly onto `render_bundle.assets.actions` and active style slots without mutating legacy `actions`.
- **HTML Serialization:** [mascotHtmlRenderer.ts](../apps/server/src/quiz/render/mascotHtmlRenderer.ts) and [previewMascotRenderer.ts](../apps/server/src/quiz/render/previewMascotRenderer.ts) serialize DOM/CSS layers directly from `MascotRenderBundleV2`.
- **Timeline Seeking:** [productionMascotTimeline.ts](../apps/server/src/quiz/render/productionMascotTimeline.ts) deterministically resolves phase markers, frame indices, and video seek times without clock drift.
- **Studio & Previews:** [Stage Studio](../apps/web/src/features/stageStudio/) and [Visual Sandbox](../apps/web/src/features/sandbox/) consume canonical V2 bundles.

## Persistence and Storage Migration

All persistent mascot documents in [mascot repositories](../apps/server/src/repository/mascots.ts) enforce `schema_version: 2` with canonical `render_bundle` and `styles`:
- When writing mascots, `buildPersistedMascotProfile` maintains `render_bundle` as the single source of truth.
- Backward compatibility mirrors in `mascot.actions` are generated read-only for older external integrations and should not be relied upon for new features.

## Verification

Modernized tests must verify the native V2 path (`render_bundle` and `styles`):
- Test fixtures should directly instantiate `render_bundle` and `styles`.
- Assertions should verify updates to `render_bundle.assets.actions` and `action_asset` rather than legacy `actions`.
- HyperFrames validation tests verify bitwise deterministic rendering across arbitrary seek points.
