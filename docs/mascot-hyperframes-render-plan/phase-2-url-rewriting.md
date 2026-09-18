# Phase 2 Specification: URL Normalization & Composition Rewriting Engine

## Objective
Ensure that all mascot media URLs emitted into HTML compositions, styles, and subcompositions are properly normalized to local relative paths (`./mascot-assets/...`), preventing any leaking of raw HTTP `/api/mascots/...` paths into HyperFrames.

## Target Files
- `apps/server/src/quiz/render/candyArcade/candyArcadeAudio.ts` (`source()` function)
- `apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts` (`rootRelativeSubCompositionAssets()`)
- `apps/server/src/quiz/render/candyArcadeComposition.ts` (`getMascotPreloadTags()` or similar preload helpers)

## Detailed Requirements
1. **Extend `source(value)`**:
   - In `apps/server/src/quiz/render/candyArcade/candyArcadeAudio.ts`:
     - Match `/api/mascots/:mascotId/styles/:styleId/animations/:state/:slotIndex/artifacts/:filename`
     - Match `/mascot/assets/animations/:mascotId/:styleId/:state/:slotIndex/:filename`
     - Rewrite cleanly to `./mascot-assets/${filename}` (or the localized collision-safe filename).
2. **Subcomposition Asset Path Consistency**:
   - In `apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts`:
     - Ensure `rootRelativeSubCompositionAssets` handles all `./mascot-assets/` and `src="..."` correctly without breaking relative paths when nested inside `compositions/<scene-id>.html`.
3. **Preload Tag Safety**:
   - Verify `getMascotPreloadTags` does not generate preload tags for missing files or broken API routes that could trigger pre-render check warnings.
