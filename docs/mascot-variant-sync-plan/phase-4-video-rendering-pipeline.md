# Phase 4 Specification: Production Video Rendering Pipeline Integration

## Objective
Wire the updated random variant selector into the server video composition pipeline (`candyArcadeComposition.ts`, `productionMascotRenderer.ts`, and `productionMascotTimeline.ts`) to ensure multi-question episodes render diverse random variants per question without frame stutter or visual glitches.

## Scope & Implementation Details
1. **Video Composition Assembly:**
   - In `apps/server/src/quiz/render/candyArcadeComposition.ts`:
     - Ensure each question clip resolves its thinking and celebrate variants via the upgraded selector.
     - Ensure previous slot indices are accurately carried forward question-by-question for repeat avoidance.
     - Snapshot recording remains fully functional for resume/re-render integrity.
2. **Timeline & Frame Resolution:**
   - In `apps/server/src/quiz/render/productionMascotTimeline.ts`:
     - When the selected variant has `transparent_video_url` (such as Slot 2 WebM):
       - Resolve seeking time (`seekTimeSeconds`) deterministically from the clip start of the active phase.
       - Support loop modes (`loop` vs `one_shot_rest`).
     - When the selected variant is a static image:
       - Apply motion preset CSS keyframes (e.g. `sway` or `jump`).
     - When a state has no available variant:
       - Gracefully produce null/invisible layer without crashing timeline markers.
3. **Integration Tests:**
   - Run `apps/server/test/mascotRendererIntegration.test.ts`.
   - Add/verify test scenario where a 5-question quiz episode renders with random variants across questions, verifying Slot 2 renders video HTML layer and other slots render static HTML layers.

## Acceptance Criteria
- [ ] Composition resolves distinct random variants across questions.
- [ ] Transparent WebM video layers render proper video seek attributes.
- [ ] Missing variants omit layer cleanly.
- [ ] All server mascot render integration tests pass.
