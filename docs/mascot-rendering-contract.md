# Mascot rendering contract

Reviewed against source boundaries on 2026-09-09. This describes the V2 model, not a claim that every preview and production combination has passed visual QA.

## Contracts and geometry

[packages/shared/src/mascot](../packages/shared/src/mascot/) owns render types, schemas, constants, compatibility adaptation, geometry, motion and resolution.

- V2 action assets use one image per action with dimensions, visible bounds, pivot and registration metadata.
- Legacy frame metadata can be preserved through compatibility adapters; do not infer that V2 authoring should create sprite strips.
- The canonical base box is 220 by 220 logical pixels. Placement is in canvas coordinates, independent of viewport fit/zoom.
- Read scale, motion limits, defaults and supported values from [renderSchema.ts](../packages/shared/src/mascot/renderSchema.ts) and [renderConstants.ts](../packages/shared/src/mascot/renderConstants.ts).

Preserve this transform order:

```text
canvas anchor -> unscaled placement offset -> scale/flip around pivot
-> per-action registration offset -> deterministic motion
```

Fallback assets must use the selected asset's own geometry and motion metadata. The resolver owns phase visibility, action overrides and reveal outcomes; do not duplicate that policy in UI components.

## Runtime consumers

[productionMascotRenderer.ts](../apps/server/src/quiz/render/productionMascotRenderer.ts) adapts product state into the shared render contract. [mascotHtmlRenderer.ts](../apps/server/src/quiz/render/mascotHtmlRenderer.ts) serializes the layer. [productionMascotTimeline.ts](../apps/server/src/quiz/render/productionMascotTimeline.ts) resolves phase/action markers.

[Stage Studio](../apps/web/src/features/stageStudio/) and [Visual Sandbox](../apps/web/src/features/sandbox/) are preview/editor consumers. Viewport scaling must not mutate saved placement. Preserve request identity and stale-preview rejection when changing asynchronous preview behavior.

The shared mascot model retains both landscape and portrait canvas contracts. This is compatibility capability, not proof of a public portrait Episode mode: [Stage preview requests](../apps/web/src/features/stageStudio/utils/stagePreviewRequest.ts) and [video configuration](../packages/shared/src/schemas/config.ts) currently use `16:9`. Short-Reel workflows must be assessed separately.

## Persistence and compatibility

Use [mascot repositories](../apps/server/src/repository/mascots.ts) for changes. Preserve readable V1 data and existing V2 metadata; do not trigger migration, remove legacy fields or rewrite live assets as a side effect of preview.

Migration tooling and compatibility tests are not instructions to migrate the user's storage automatically. Establish scope, recovery and position-preservation checks before any explicit migration.

## Visual styles

[Style modules](../apps/server/src/quiz/visual/styleModules/) and [element registries](../apps/server/src/quiz/visual/elements/) own module manifests, catalogs, namespacing, activation and concrete variants. [The visual registry](../apps/server/src/quiz/visual/registry.ts) composes themes.

Read active catalog/registry definitions rather than copying variant lists into UI or documentation. Keep preview selection, persistence, cache revision and production lookup aligned when adding a style.

## Verification

Verify geometry, fallback registration, phase visibility, deterministic seeking and persistence at the narrowest useful level. For changed visuals, also compare preview and rendered output at supported dimensions, including missing assets, stale requests and reduced-motion behavior where applicable. Follow [Workflow](workflow.md); this documentation update did not run visual regression or migrate assets.
