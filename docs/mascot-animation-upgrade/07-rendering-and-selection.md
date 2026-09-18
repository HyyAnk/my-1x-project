# Rendering, Selection and Determinism

## Shared frame resolver

Extend the shared render asset contract with an animation reference while preserving placement, registration, phase policy and reveal mapping. The resolver selects the asset; it does not create product policy.

For frame count 12 and fps 8:

cycle_seconds = 12 / 8 = 1.5
frame_index = floor(normalized_time * 8) modulo 12

Use manifest rectangles, never inferred grids. Apply registration and pivot before placement and phase transitions.

Thinking should loop. Celebrate must have an explicit manifest policy. The recommended policy is a 1.5 second readable cycle that returns to a rest-compatible final frame; if the row does not return cleanly, the job fails the seam gate rather than being silently clamped.

## Preview and production parity

Browser preview, HyperFrames HTML and production rendering call the same shared frame resolver. Required assets are localized and available before capture. Test exact frame boundaries, mid-frame timestamps, loop wrap, placement, pivot and missing/stale asset rejection.

## Deterministic selection

seed = hash(video_id + question_id + state + style_id)
candidate = seed modulo ready_variant_count

If the candidate equals the immediately previous variant for that state and at least two variants are ready, advance one position. Record seed, slot index, animation revision, style and state in the render input snapshot. Never use Date.now or unseeded Math.random in render-critical selection.

## HyperFrames constraints

The animation must be seekable from time alone. Do not use render-time clocks, network fetches for required assets, event-driven playback or infinite CSS/GSAP loops. Use finite duration and explicit frame state.

