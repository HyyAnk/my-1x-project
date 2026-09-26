# Episode thumbnail concurrency

## Interaction plan

- After quiz assets, voice, timeline and QA are ready, submit a persisted thumbnail task alongside the video task.
- The video pipeline completes when the video is ready. Thumbnail failure, cancellation or a slow provider does not fail or delay it.
- Show thumbnail queued/running/failed independently in the Episode rail and thumbnail panel. Keep video controls usable after rendering.
- Use the existing task event stream and terminal-task reload to refresh Episode data. Poll the thumbnail manifest during active work; retry and cancel remain available in Tasks.
- Group thumbnail tasks separately from video production in Tasks, with no invented percentage for image generation.
- Retain successful image variants on partial failure. Automatic retries reuse valid variants. Explicit Generate continues to request a new version.
- Recover interrupted thumbnail tasks independently of their parent pipeline, with the existing bounded restart policy.
- Keep the same behavior at desktop and mobile widths, with status text available to screen readers.

## Boundaries and data flow

Thumbnail generation no longer belongs to visual asset resolution. The production coordinator owns scheduling; the existing image queue supplies concurrency limits and a thumbnail-specific lock prevents duplicates.

The thumbnail runner owns cancellation, a bounded deadline, timing and terminal status. The thumbnail service serializes automatic/manual generation and version mutations, checks input freshness, and writes images/manifests atomically.

Video metadata and thumbnail paths use the repository's episode mutation queue. Export packaging is serialized per channel because all episode exports share a channel manifest. A late thumbnail refresh updates metadata and images without copying the video again. If no video export exists yet, the later video export includes the completed thumbnail.

## Verification

Verify that a deferred thumbnail permits video completion; image failure remains isolated; cancellation prevents late activation; restart recovery and duplicate submission preserve one task; concurrent metadata writes retain both results; and thumbnail completion before, during or after export converges to the same package. Verify rail state, task grouping, refresh behavior, desktop/mobile layout, type checks and build.
