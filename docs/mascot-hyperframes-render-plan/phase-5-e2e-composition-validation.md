# Phase 5 Specification: Real-World HyperFrames Check Simulation & End-to-End Composition Validation

## Objective
Validate the entire video rendering pipeline against real HyperFrames checks (`hyperframes check` / `videoLayoutChecker.ts`) with a live or representative mascot bundle to guarantee zero blocking errors during actual video generation.

## Target Files
- `apps/server/src/tasks/video/videoLayoutChecker.ts`
- Live validation script or dedicated E2E integration test: `apps/server/test/mascotVideoEndToEndCheck.test.ts`

## Detailed Requirements
1. **End-to-End Bundle Generation**:
   - Generate a complete quiz video composition bundle using `prepareQuizVideoRender` with an animated WebM mascot variant.
   - Write out `index.html`, `compositions/*.html`, `mascot-assets/`, and `soundtrack.wav` to a temporary render directory.
2. **Execute HyperFrames Pre-Render Check**:
   - Run `verifyAndCheckLayout` (or `hyperframes check <renderRoot> --json`) directly on the generated directory.
   - Assert `hasHyperframesBlockingIssues(checkReport)` is `false`.
   - Specifically verify that:
     - No `missing_local_asset` errors are raised for `video_transparent.webm`.
     - No `media_missing_data_start` or `media_missing_id` errors are raised.
3. **Report Evidence**:
   - Record and output the JSON check report showing 0 blocking lint errors.
