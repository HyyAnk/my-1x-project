# Mascot video canvas placement

## Failure and policy

Processed WebM files retain the full uploaded canvas, while atlas frame rectangles
may be cropped to the detected foreground. Combining cropped frame dimensions with
full-canvas pivots caused different translations for different variants.

Video uses a common 220-by-220 contain box, with a fixed bottom-center transform
origin and no content-dependent pivot compensation. The original aspect ratio,
internal subject position, and animation motion remain unchanged. Matching canvases
does not imply matching silhouettes or subject sizes inside those canvases.

## Implementation boundaries

1. Keep `registration` for atlas geometry and store full-canvas metadata separately
   as optional `video_registration` in published assets and packaging manifests.
2. Hydrate existing active revisions with their full-canvas registration at read
   time. No migration, media reprocessing, or re-upload is required. Older video
   assets without the new field continue to read their existing registration.
3. Resolve media-specific geometry in the shared mascot domain. Production HTML,
   Sandbox, and Studio use this contract. Cropped frame rectangles never determine
   the video contain box or transform origin.
4. Fit the entire logical Studio stage to its viewport, including placement
   offsets, rather than scaling only the mascot. ResizeObserver handles responsive
   resizing and disconnects on unmount. Do not animate placement between variants.
5. Preserve saved placement and uploaded assets. This change does not rewrite
   existing MP4 files; they must be rendered again to use the new geometry.

## Verification

- Shared regression tests cover different crop dimensions and pivots, both states,
  horizontal flip, absent atlas frames, legacy metadata, atlas-only fallback, and
  schema round trips.
- Browser tests compare actual production/preview DOM bounds against shared
  geometry, not just serialized configuration.
- Packaging tests confirm cropped atlas registration and full video registration
  coexist in a real encoded artifact manifest.
- Studio tests cover variant changes, removal of extra landscape margins, and
  whole-stage zoom.
- Live read-only verification on 2026-09-28 inspected 839 animations across 21
  mascots; all active videos have 1280-by-720 canvases. Sixteen decoded videos
  from four mascots, two styles, and both states matched Studio/production
  bounds at desktop and mobile preview widths. A decoded 9:16 preview also
  matched production bounds at mobile width.
- The placement readout was removed from the stage viewport after the mobile
  screenshot showed that it covered the mascot. The placement controls remain
  in the adjacent Studio sidebar.
- The earlier geometry verification used X=315, Y=150, scale=3.75 and measured
  transformed video element bounds of x=12.5, y=405, width=825, height=825.
  These include contain padding, not foreground bounds. The current shared
  placement is X=121, Y=181, scale=3.6 across mascot profiles and channels.

Commands used:

```text
pnpm --filter @studio/shared build
pnpm --filter @studio/shared test
pnpm --filter @studio/server typecheck
pnpm --filter @studio/web typecheck
pnpm --filter @studio/server build
pnpm --filter @studio/web build
pnpm --filter @studio/server test mascotRenderEngine mascotPreviewParity mascotVideoHyperframesParity mascotLocalizationV2 previewStageSource
pnpm --filter @studio/web test QuizStagePlacementPreview StageMascotOverlay MascotMotionStepCanvasView
```

With `STUDIO_TEST_SUITE=system`, run `vitest run` in `apps/server` for
`test/mascotVideoCanvas.browser.test.ts` and
`test/mascotVideoAnimation/sequencePackaging.system.test.ts`.

This verification covers decoded browser playback, production HTML geometry, and
artifact packaging. It does not re-export existing full episode MP4s.
