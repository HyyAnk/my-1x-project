# Data and State Contracts

## Source variant fields
style_id, state, slot_index, image_url, raw_image_url, transparent_image_url, canvas, content_bounds, pivot, source_fingerprint and status.

Both source downloads preserve the full 16:9 canvas. The transparent PNG is not alpha-cropped.

## Processing job fields
id, mascot_id, style_id, state, slot_index, attempt, source_video_url, source_video_fingerprint, status, progress, error_code, error_message, created_at and updated_at.

Allowed status values: queued, uploading, processing, qa_failed, ready and cancelled.

## Processed animation fields
version, style_id, state, slot_index, source_video_url, atlas_url, manifest_url, frame_urls, frame_count, source_fps, playback_fps, duration_ms, loop_mode, canvas, content_bounds, pivot, registration, source_fingerprint, processing_fingerprint, qa_report_url and status.

## State machine
empty -> uploading -> processing -> ready
processing -> failed -> retrying -> processing
ready -> replacing -> processing
processing -> cancelled

Ready revisions are immutable. A stale completion cannot overwrite a newer attempt. A style is production-ready only when all twenty slots are ready.
