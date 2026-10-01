# Uploaded intro/outro rendering

## Selection contract

- Built-in Style selects uniformly from ready active pairs in the resolved style category when the episode is confirmed, before production tasks start.
- Each new episode draws independently with replacement. Concurrent episodes may choose the same pair. Selection history does not influence the draw.
- A durable episode selection record is written under `channels/<channel>/intro_outro_selections/<episode-id>.json` and copied into `quiz_config.intro_outro_snapshot` on episode creation or settings updates.
- An empty category pins a null pair with zero bookend duration. Later uploads do not change that episode's retry behavior.
- Explicit pair and None selections bypass random selection. Deprecated selection fields and channel defaults cannot override the current selection.
- Retries retain the pair, media fingerprint, measured durations, audio presence, and resolved visual style. Explicit selection/category changes establish a new decision. Media selection changes are rejected while episode tasks are active.
- Missing, disabled, or changed pinned media fails explicitly. The renderer never silently chooses a replacement or falls back to generated bookends.

## Media ownership

Voice generation omits intro/outro narration regardless of whether the uploaded clips have audio. Timeline compilation uses measured uploaded video duration, not legacy minimum/hold values. Source audio is emitted exactly once through separate audio elements; video elements are muted. Silent uploaded clips remain silent.

The system soundtrack is restricted to the body window after mixing, including narration, BGM and SFX. Intro transition timing remains bounded by the uploaded intro duration; it does not stretch, loop, or replace the source clip. Existing transition effects remain in use.

## Existing episodes and caches

Direct render of an existing episode constructs a render-local body voice plan and timeline. If timing differs, it extracts each body speech segment from the original narration and places it at its new timestamp. Original narration and timeline files are not overwritten. A content/timing checkpoint makes the derived WAV reusable. Incompatible or unmeasured speech fails with instructions to regenerate voice.

Pipeline retries regenerate obsolete voice plans before timeline compilation. Body synthesis uses the existing voice cache when compatible. Rebuilding a timeline directly from a legacy voice plan is rejected to avoid silently desynchronizing its narration file.

The master soundtrack cache version changed to `master-soundtrack-v4-body-only`. Copied media is fingerprint-checked again before composition generation to detect source changes during preparation.

## Verification

- `uploadedPairSelection.test.ts`: independent draws, duplicates, empty styles, concurrent pinning, retry, explicit modes, source measurement, silent clips, changed/missing sources.
- `uploadedPairTiming.test.ts`: real FFmpeg retiming, silence outside body windows, incompatible segment rejection.
- `uploadedPairRender.system.test.ts`: production sub-composition helpers, HyperFrames check/render, 1080p media, duration, frame colors and audio windows.
- Existing topic confirmation, voice pipeline, repository, custom render and soundtrack suites cover integration.

Run the real render test with `STUDIO_TEST_SUITE=system`. Set `KEEP_PAIR_RENDER_ARTIFACTS=1` to retain its isolated diagnostic composition and MP4 under `scratch/intro-outro-qa-*`.
