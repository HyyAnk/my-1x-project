# Phase 1 Specification: Physical Asset Localization Engine for Mascot Animations

## Objective
Upgrade `apps/server/src/tasks/video/mascotLocalization.ts` to fully discover, locate, copy, and localize mascot animation artifacts (transparent WebM videos, manifest JSONs, PNG atlases) into the isolated render directory `<renderRoot>/mascot-assets/`.

## Target Files
- `apps/server/src/tasks/video/mascotLocalization.ts`
- `apps/server/src/quiz/mascotAssetCache.ts` (if caching support is needed)

## Detailed Requirements
1. **URL Recognition & Parsing**:
   - Enhance the asset localizer to recognize:
     - `/api/mascots/:mascotId/styles/:styleId/animations/:state/:slotIndex/artifacts/:filename`
     - `/mascot/assets/animations/:mascotId/:styleId/:state/:slotIndex/:filename`
     - Direct or relative filenames (`video_transparent.webm`, `atlas.png`).
2. **Physical Disk Resolution**:
   - When an animation artifact is detected, resolve its physical file on disk:
     - Check published slot directory: `storage/mascots/<mascotId>/animations/<styleId>/<state>/slot_<slotIndex>/<filename>`
     - Check published animations directory: `storage/mascots/<mascotId>/published_animations/...`
     - Check latest attempt directory: `.../attempts/att_<latest>/<filename>`
   - Use existing `createAnimationStorageAdapter` or repository helpers to locate the actual file safely.
3. **Collision-Free File Copy**:
   - Copy the resolved physical file into `<renderRoot>/mascot-assets/`.
   - Use a clean, collision-free filename, e.g., `${mascotId}_${styleId}_${state}_s${slotIndex}_${filename}` or decodeURIComponent(filename) if unique.
4. **State Variant Mutation**:
   - Update `localizeStates` to iterate over each `MascotStateVariant`:
     - Localize `variant.image_url`.
     - Localize `variant.animation.transparent_video_url` -> `./mascot-assets/<localized_video_name>`.
     - Localize `variant.animation.atlas_url` -> `./mascot-assets/<localized_atlas_name>`.
     - Localize `variant.animation.manifest_url` if present.
5. **Render Bundle Mutation**:
   - In `localizeRenderBundle`, localize `actionAsset.animation.transparent_video_url` and `actionAsset.animation.atlas_url` if present.
6. **Backward Compatibility**:
   - Maintain full compatibility with static mascot image localization.
