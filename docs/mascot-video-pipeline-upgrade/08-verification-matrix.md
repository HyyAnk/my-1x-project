# Verification Matrix

| Area | Evidence |
|---|---|
| Source prompt | 16:9 half-body prompt tests preserve style and exclude final placement |
| Downloads | Original and transparent PNG preserve canvas and offsets |
| Upload | Invalid MIME, size, dimensions, duration and path are rejected |
| Decode | FFmpeg failure, partial output and cancellation are recoverable |
| Matting | One frame failure blocks publication and records diagnostics |
| Registration | Common pivot and bounds are stable; no independent recentering |
| Packaging | Sequence, atlas, manifest and report share a fingerprint |
| Persistence | Replacement cannot overwrite approved revision prematurely |
| UI | Progress, retry, replace, keyboard, touch and responsive layout work |
| Rendering | Exact frame times, loop, placement and localization pass |
| Determinism | Same video/question selects same slot and revision |
| Parity | Step 4, HyperFrames and production show identical frames |

Visual changes require real preview and production inspection, not compile-only evidence.
