# Phase 4 Specification: Multi-Question Test Harness & Parity Verification

## Objective
Establish automated test coverage in `@studio/server` and `@studio/shared` to verify that animated mascot videos pass all structural, lifecycle, localization, and seeking requirements across multi-question episodes.

## Target Files
- `apps/server/test/mascotRendererIntegration.test.ts`
- `apps/server/test/mascotLocalizationV2.test.ts`
- `apps/server/test/mascotVideoHyperframesParity.test.ts` (new dedicated test file)

## Detailed Requirements
1. **Localization Test Suite**:
   - Verify `prepareLocalizedMascot` copies `video_transparent.webm` into `<renderRoot>/mascot-assets/`.
   - Verify `mascotProfile.styles[0].states.thinking[0].animation.transparent_video_url` points to `./mascot-assets/...`.
   - Verify error handling when video file is missing (graceful fallback).
2. **Video Element Attribute Tests**:
   - Verify emitted `<video>` contains:
     - `id="mascot-video-..."`
     - `data-start="..."`
     - `data-duration="..."`
     - `src="./mascot-assets/..."`
3. **Multi-Question Lifecycle Parity**:
   - Test a 3-to-5 question quiz episode where slot 2 (WebM) is selected for thinking, and confirm proper timing values per question.
