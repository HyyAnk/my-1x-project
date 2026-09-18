# Phase 1 Specification: Data Integrity, Mock Purge & Slot 2 WebM Activation

## Objective
Establish complete data integrity for the mascot profile:
1. Backup `mascot.json` prior to modifications.
2. Bind the existing, successfully processed VP9 WebM transparent video artifact to **Slot 2 of Core Thinking**.
3. Purge all synthetic mock fixture `atlas.png` references (`F1..F12` rainbow circle fixtures) from all 20 slots across all styles.
4. Ensure all valid 3D character static images (`image_url`) are preserved.
5. Validate `mascot.json` with schema validation.

## Inputs & File Locations
- Target Mascot ID: `mascot_22cb190ece7b4475`
- Mascot JSON: `D:\1a Cursor Project\My 1x Youtube Channel File\.quiz-studio\mascots\mascot_22cb190ece7b4475\mascot.json`
- Slot 2 WebM Artifact:
  - Video URL: `/api/mascots/mascot_22cb190ece7b4475/styles/core/animations/thinking/2/artifacts/video_transparent.webm`
  - Revisions Data: `D:\1a Cursor Project\My 1x Youtube Channel File\.quiz-studio\mascots\mascot_22cb190ece7b4475\animations\core\thinking\slot_2\revisions\rev_2.json`
  - Manifest URL: `/api/mascots/mascot_22cb190ece7b4475/styles/core/animations/thinking/2/artifacts/manifest.json`

## Detailed Implementation Tasks
1. **Backup:** Create `mascot.json.bak` in the same directory before modifying.
2. **Activate Slot 2 (Core Thinking):**
   - Populate `animation` on `thinking` slot 2:
     - `version`: 1
     - `state`: "thinking"
     - `slot_index`: 2
     - `transparent_video_url`: `/api/mascots/mascot_22cb190ece7b4475/styles/core/animations/thinking/2/artifacts/video_transparent.webm`
     - `alpha_codec`: "vp9_alpha"
     - `manifest_url`: `/api/mascots/mascot_22cb190ece7b4475/styles/core/animations/thinking/2/artifacts/manifest.json`
     - `frame_count`: 192
     - `fps`: 24
     - `duration_ms`: 8000
     - `loop`: true
     - `loop_policy`: "loop"
     - `registration`: from `rev_2.json` (source_width: 1280, source_height: 720, content_bounds: { x: 251, y: 6, width: 783, height: 714 }, pivot: { x: 643, y: 719 }, offset_x: 0, offset_y: 0)
     - `status`: "ready"
3. **Purge Synthetic Mock Atlases:**
   - For all other slots in `core` (thinking slots 1, 3..10 and celebrate slots 1..10):
     - Remove `animation` or set `animation: undefined` so the renderer relies strictly on the high-res 3D `image_url`.
     - Set `status: "idle"` (or keep as image-ready state without mock animation).
   - For `style_1789297141012` (Police):
     - Thinking slot 1: keep `image_url`, remove mock `animation`.
     - Thinking slots 2..10 & Celebrate slots 1..10: remove mock `animation`, keep slots clean.
4. **Validation:**
   - Execute a validation script to verify `MascotProfileSchema.safeParse(mascot)`.
   - Confirm Slot 2 has `transparent_video_url`.
   - Confirm 0 slots reference `/assets/animations/.../atlas.png`.

## Acceptance Criteria
- [ ] Backup file exists.
- [ ] Slot 2 Core Thinking contains valid WebM video URL and registration.
- [ ] No slots contain synthetic mock fixture references.
- [ ] Schema validation succeeds with zero errors.
- [ ] A concise report of active media assets is provided upon completion.
