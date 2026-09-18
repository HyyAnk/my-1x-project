# Mascot Video Animation Pipeline Upgrade

Status: authoritative implementation plan

## Product decision

Build a first-party mascot video-to-animation pipeline inside the existing application. Do not integrate the full sprite-gen repository and do not call a video generation provider from the application. The user creates and quality-controls each source video externally, then uploads it for deterministic processing.

## Final workflow

```text
Step 1: Mascot Concept and Styles
  master concept -> style anchor

Step 2: Expressive States
  style x state x variant -> large half-body 16:9 source image
  download original image or background-removed PNG

Step 3: Animation Processing
  upload a user-created 16:9 720p video for the selected slot
  extract frames -> remove background -> validate -> package sequence

Step 4: Motion and Animation
  preview the processed sequence, placement and timing
  approve the animation for production rendering
```

## Scope

- Keep Step 1 behavior and style-anchor creation unchanged.
- Keep exactly two semantic states: `thinking` and `celebrate`.
- Keep ten variants per state per style.
- Step 2 source images use a 16:9 canvas and a large half-body mascot composition.
- The source mascot is not positioned in the final lower-left video location.
- Source images and uploaded videos preserve quality and framing for later placement.
- Step 3 owns video ingestion, frame extraction, matting, alpha cleanup, registration, sequence packaging and status.
- Step 4 replaces the old CSS-motion preview with processed-frame playback.
- Production render applies the existing placement preset after processing; the processed asset remains placement-neutral.
- Existing concept/style data and unrelated video flows remain unchanged.

## Quality model

The source is intentionally large so the mascot retains facial, hand and costume detail before it is scaled down for the quiz canvas. Input video is 1280x720. Extraction cannot restore detail lost in the source video, so the system must preserve source pixels, avoid per-frame resizing and avoid per-frame recentering.

The source canvas and final composition are separate contracts:

```text
source: 16:9, 1280x720, large half-body mascot, neutral placement
output: quiz canvas, scaled mascot, bottom-left placement, registered pivot
```

The half-body composition should read as a character entering from or continuing beyond the lower edge, not as a floating portrait. It must leave head and hand clearance for motion. Do not bake the final lower-left placement into the source image or PNG sequence.

## Step 2 contract: Expressive States

For every existing style, show two tabs and ten slots per tab:

```text
Thinking: 1..10
Celebrate: 1..10
```

Each slot displays the approved 16:9 source image. On hover, keyboard focus or touch action, expose:

- Download original image with its background.
- Download background-removed PNG.

Both downloads must preserve identical canvas dimensions, mascot scale, position and registration. Do not crop the transparent PNG to the alpha bounds.

Generation prompts for Step 2 must be separate from the current full-body concept/action prompts. They must preserve the style anchor while requesting:

- large half-body framing;
- fixed camera and scale;
- lower-edge continuation;
- full head and hand clearance;
- simple neutral background;
- no final quiz-corner placement;
- no text, scenery, floor, frame or pedestal.

The source image is an input/reference asset for the user's external video creation, not the final animation asset.

## Step 3 contract: Animation Processing

Each slot owns one current processing revision and may receive a replacement video. Processing a replacement happens in a new attempt; the current approved revision remains intact until the new attempt succeeds.

```text
empty -> uploading -> processing -> ready
                         |             |
                         v             v
                       failed       replace
```

Per attempt:

1. Validate the upload is a supported video and is within configured size/duration limits.
2. Record source video checksum, dimensions, source fps, duration and codec metadata.
3. Decode frames with the bundled FFmpeg boundary.
4. Preserve the source canvas and frame coordinates.
5. Run built-in background removal independently on each frame.
6. Fail the attempt if any frame cannot be matted; never publish a raw frame as success.
7. Clean RGB under alpha zero and remove residual key contamination.
8. Check alpha flicker, silhouette holes, edge clipping and frame decode completeness.
9. Compute a common content bounds, pivot and registration for the sequence. Do not recenter each frame independently.
10. If a common crop is used, apply one crop to the entire sequence and persist its offset.
11. Build a PNG frame sequence, atlas and manifest.
12. Generate a contact sheet and preview GIF or equivalent review artifact.
13. Persist the attempt report and expose the slot as ready only after server confirmation.

The slot shows a representative thumbnail from the processed sequence, a success status, source metadata and a replace-video action. A failed attempt shows a recoverable error next to the slot and keeps the user's other slots usable.

## Step 4 contract: Motion and Animation

Step 4 reads only processed animation revisions. It must provide:

- style selection;
- Thinking/Celebrate state selection;
- ten variant slot selection;
- play/pause;
- frame stepping;
- playback speed display;
- transparent and contrast preview backgrounds;
- zoom;
- final quiz-canvas preview with automatic bottom-left placement;
- animation metadata and processing status.

The old CSS motion presets are not the primary motion source for processed variants. The preview must use the same frame-at-time resolver and manifest used by production rendering.

## Animation asset contract

```ts
type MascotProcessedAnimation = {
  version: 1;
  style_id: string;
  state: "thinking" | "celebrate";
  slot_index: number;
  source_video_url: string;
  atlas_url: string;
  manifest_url: string;
  frame_urls?: string[];
  frame_count: number;
  source_fps: number;
  playback_fps: number;
  duration_ms: number;
  loop_mode: "loop" | "one_shot";
  canvas: { width: number; height: number };
  content_bounds: MascotBounds;
  pivot: MascotPoint;
  registration: MascotAssetRegistration;
  source_fingerprint: string;
  processing_fingerprint: string;
  qa_report_url: string;
  status: "processing" | "failed" | "ready";
  created_at: string;
};
```

The manifest is the frame-layout source of truth. The renderer must not infer a grid from alpha or assume equal-width cells. The processed asset is neutral with respect to final placement; placement remains in the existing render bundle.

## Render integration

The existing phase resolver remains responsible for choosing `thinking` or `celebrate`, style selection and reveal outcome. A deterministic variant selector chooses one ready slot using a stable seed based on video id, question id, state and style id. It must avoid immediate repeats where possible and record the selected slot and processing revision in the render snapshot.

The renderer applies:

```text
canvas anchor -> placement offset -> scale/flip around pivot
-> sequence registration -> manifest frame at timeline time
```

The same resolver serves Step 4 preview, HyperFrames preview and production video. Required animation files must be available before capture; no render-time network fetch or unseeded randomness is allowed.

## API and persistence responsibilities

Suggested endpoints, matching existing route conventions:

```text
GET  /api/mascots/:mascotId/styles/:styleId/animations
POST /api/mascots/:mascotId/styles/:styleId/animations/:state/:slot/upload
POST /api/mascots/:mascotId/styles/:styleId/animations/:state/:slot/retry
POST /api/mascots/:mascotId/styles/:styleId/animations/:state/:slot/replace
GET  /api/mascots/:mascotId/animation-processing/:jobId
```

Routes remain thin. Services own validation, processing and publish decisions. Repositories own immutable revisions, asset paths, checksums and slot projections. A ready slot is never written before server-side processing and QA finish.

## Required processing gates

- Supported video and safe upload path.
- Non-empty decoded frame set.
- Complete sequential frame numbering.
- Consistent source dimensions and usable metadata.
- Matting success for every frame.
- No hidden RGB under transparent pixels.
- No excessive residual background or alpha flicker.
- No accidental interior holes or unsafe clipping.
- Stable common bounds, pivot and registration.
- Valid manifest references.
- Preview opens and plays from the saved manifest.
- Production renderer can localize and load every required asset.

## Implementation stages

### 1. Baseline and scope lock

Capture current Step 1, Step 2 slot data, Step 3 motion studio and production behavior. Do not change code.

### 2. Source-image layout contract

Add the 16:9 large half-body prompt contract for Step 2 without changing Step 1. Add prompt tests and reference-image tests.

### 3. Source image downloads

Add original and background-removed downloads that preserve the full canvas. Verify hover, keyboard focus and touch access.

### 4. Shared animation types

Add strict types and schemas for processing attempts, animation revisions, frame manifests, status, bounds, pivot and registration.

### 5. Upload boundary

Add safe multipart upload validation, size/duration limits, checksum, storage path isolation and structured errors.

### 6. Frame extraction service

Add a dedicated FFmpeg adapter with abort, timeout, metadata capture, sequential frame output and fixture tests.

### 7. Frame matting service

Reuse the built-in matting implementation behind a strict animation adapter. One frame failure fails the attempt. Add alpha cleanup and flicker/holes diagnostics.

### 8. Registration service

Calculate one common sequence registration and pivot. Preserve source coordinates and reject per-frame independent recentering.

### 9. Atlas and manifest packaging

Create the sequence manifest, atlas or frame URL set, contact sheet, preview and processing report. Validate every path and rectangle.

### 10. Processing lifecycle and persistence

Persist attempts, statuses, progress, errors, source fingerprints and immutable revisions. Ensure replacement cannot overwrite the approved revision until success.

### 11. Step 3 upload UI

Add upload controls to every Step 2-matching slot. Show uploading, processing, ready, failed and replace states. Keep unrelated slots interactive.

### 12. Step 4 processed preview

Move the old motion studio behavior to Step 4 and replace CSS-motion playback with manifest-driven frame playback and final-placement preview.

### 13. Shared render integration

Extend the shared render contract and resolver. Keep phase policy, style choice and placement in the existing system.

### 14. Deterministic variant selection

Choose ready variants by stable video/question/state/style seed, avoid immediate repeats and record the selected revision.

### 15. Failure, replacement and recovery

Test failed uploads, failed decode, failed matting, cancellation, retry, replacement, stale completion and reconnect behavior.

### 16. Preview/production parity

Compare Step 4, HyperFrames and production at exact frame boundaries, mid-frame times, loop wrap and final bottom-left placement.

### 17. End-to-end pilot

Process one style with two Thinking and two Celebrate videos. Inspect source, alpha, registration, preview and rendered quiz output before processing all slots.

### 18. Full rollout and handoff

Process every existing style and all twenty slots per style in bounded batches. Run typecheck, tests, lint, build, visual review, responsive review and document the operational workflow.

## Acceptance criteria

The upgrade is complete only when:

1. Step 1 remains unchanged in behavior.
2. Step 2 produces large 16:9 half-body reference images for every style/state/slot.
3. Both source download variants preserve the full canvas.
4. Step 3 can replace any slot video without damaging the approved revision.
5. A successful slot has a complete, transparent, registered frame sequence and manifest.
6. Step 4 and production use the same processed asset and frame timing.
7. Automatic final placement is applied only at preview/render time.
8. Missing or failed processing never appears as ready.
9. Re-rendering the same video/question selects the same variant and frame output.
10. All existing styles can reach twenty ready animations without manual file copying.

