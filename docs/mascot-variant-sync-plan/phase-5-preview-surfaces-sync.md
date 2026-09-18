# Phase 5 Specification: Preview Surfaces Synchronization

## Objective
Synchronize the three primary user-facing preview surfaces (Visual Sandbox, Stage Studio, and Preview Episode) with the new media availability and random selection logic, ensuring zero UI mock artifacts and complete WYSIWYG fidelity.

## Scope & Implementation Details
1. **Visual Sandbox & Question Preview:**
   - In `apps/server/src/quiz/render/sandboxComposition.ts`:
     - Provide stable question context (`questionId: "sandbox_q_" + questionIndex`) and episodeId so that shifting the question slider dynamically and deterministically selects variants according to the randomized engine.
     - When inspecting Slot 2 in thinking state, display the transparent WebM video.
2. **Stage Studio:**
   - In `apps/web/src/features/mascot/` (specifically `MascotMotionAnimationStep.tsx` and animation steps):
     - Ensure processed video artifacts (like Slot 2 WebM) display directly with native video player preview.
     - Ensure slots without media display clean empty states ("No variant generated") instead of trying to load non-existent or broken fixture images.
3. **Preview Episode:**
   - Verify full episode preview in the web UI sequences through the randomized question variants identically to the final render pipeline.

## Acceptance Criteria
- [ ] Visual Sandbox previews reflect the upgraded variant selector.
- [ ] Stage Studio displays Slot 2 WebM video correctly and displays empty slots cleanly.
- [ ] Zero 404 or broken image errors on web console for preview components.
