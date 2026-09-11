# Acceptance and Verification

## 1. Evidence rules

No visual certification exists yet. Antigravity must produce new evidence from the final running code. Store a machine-readable run manifest and human-readable result report under this packet's `evidence/` folder, or link to retained CI artifacts when large binaries should not enter Git.

Each run records repository revision plus relevant dirty-file hashes, definition revisions, catalog revision, composition/input fingerprint, asset/font hashes, installed HyperFrames/runtime hash, browser binary/version, GPU mode, FFmpeg version/flags, dimensions, FPS, quality, color metadata, source context, and exact commands.

Never regenerate a baseline merely to turn a failure green. Every intentional visual change needs before/after evidence, an explanation, a definition revision change, and owner approval. The current React simulation is not a visual baseline.

## 2. Required test layers

| ID  | Gate                      | Pass condition                                                                                                          |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| A1  | Canonical catalog         | Unique IDs, deterministic immutable definitions, valid placement/timing, one active registration list                   |
| A2  | Resolution                | Same selection sources give the same resolved instance everywhere; invalid inputs fail explicitly                       |
| A3  | Production integration    | Actual production builders consume the resolved instance; no duplicate dispatch or timing                               |
| A4  | Pixel source              | Visible playback/download refer to the same MP4 SHA-256; paused PNG comes from that artifact                            |
| A5  | Exact frames              | Zero differing RGBA pixels against reference decode of the same artifact/frame and pinned decoder                       |
| A6  | Render parity             | Independently prepared production/review inputs reach identical transition state and raw captures in pinned environment |
| A7  | Persistence               | Create/update/load/duplicate/export/import preserve intro/scene configuration and precedence                            |
| A8  | Synchronization           | Source, style, definition, engine, or timing change invalidates old fingerprint without manual refresh                  |
| A9  | Async recovery            | Race, cancellation, timeout, retry, expiry, reconnect, and duplicate requests behave correctly                          |
| A10 | UX/accessibility          | One selector/transport, no simulation switch, keyboard/touch/resize/reduced-motion behavior passes                      |
| A11 | Extensibility             | New test effect appears and renders without changing UI/route/composition branches                                      |
| A12 | Regression and operations | No unintended layout/audio/source-duration changes; updated artifacts rerun; resource use bounded                       |

Map failures to these IDs in the delivery report. A skipped engine/decode test cannot satisfy A4-A6 or A12.

## 3. Transition matrix

Enumerate current definitions from the catalog, not a duplicated hardcoded test ID list. At minimum, all six currently registered effects must be covered; adding a seventh automatically expands the matrix.

- **Aspect ratios:** 16:9 and 9:16 using production-configured pixel dimensions. Exercise mobile dashboard widths independently from video dimensions.
- **FPS:** each production-supported value used by the application; include 24, 30, and 60 where configuration supports them. Pure frame arithmetic also covers 30000/1001; do not expose unsupported fractional FPS as a new UI option.
- **Durations:** default, minimum, maximum, a non-frame-aligned request, and a source-window-limited request. Cut always has zero effect frames but a positive-length sample.
- **Palettes:** two substantially different production palettes, including one high-contrast pair. Verify outgoing/incoming palette selection, not frontend default orange/red.
- **Sources:** real production-shaped quiz scenes; local intro video; repeated transition instances; source with no valid transition window; actual existing artifact reuse.
- **Timing positions:** time zero and a nonzero absolute boundary, including a later episode boundary. A crop/review window must not reset background or source motion time.
- **Seek order:** forward, backward, repeated same frame, and shuffled order. Same requested frame must not depend on previous seeks.

Frame landmarks per resolved instance: one frame before start (when valid), start, rounded 10/25/50/75/90% frames, the handoff frame and its neighbors, last active frame, exclusive end, and one frame after end (when valid). Deduplicate coincident indices for short durations. Inspect every frame around the handoff, not only its midpoint.

Use a tractable required CI matrix: all effects x two aspects at default duration/30 FPS, plus all effects at min/max durations in 16:9, plus one wipe and bubble at 24/60 FPS. Run the full supported matrix before release and after engine/runtime changes. This is a cost split, not permission to omit a new effect from default CI coverage.

## 4. Pixel and temporal comparisons

### Same-artifact exactness

1. Hash the immutable video returned by the API and its download endpoint; require equality.
2. Decode frame `n` independently with the pinned FFmpeg policy and compare its RGBA buffer to the frame endpoint PNG decoded to RGBA.
3. Require zero differing pixels. Do not compare PNG file bytes because metadata/compression may differ.
4. In Playwright, confirm the image URL/headers/frame counter refer to this artifact/frame only after `img.decode()` succeeds. Browser-scaled screenshots test presentation, not byte-exact native-frame decoding.
5. For a native-size screenshot in the pinned browser, disable page overlays, set DPR/zoom explicitly, compare the media region only, and record any browser color conversion separately. A screenshot tolerance must never stand in for the exact decoded-frame gate.

### Independent production parity

Construct equivalent resolved inputs through two actual entry points: normal `prepareQuizVideoRender`/`HyperframesRenderer.prepare` and specimen preparation. Compare canonical input snapshots and actual transition subtrees/timing, then capture identical absolute frames with the same production runtime/configuration. Test helpers must not call one fake render twice or import expected pixels from the implementation under test.

Zero raw-pixel differences is the target in the pinned capture environment. If rendering is nondeterministic, isolate fonts, media decoding, GPU paths, worker scheduling, or clocks. Do not silently increase a mismatch threshold. Fix the cause, establish a deterministic capture profile used by both paths, or report an unsatisfied parity gate.

The installed snapshot command is not automatically equivalent to final frame capture. Task 0 must verify the same media injection/time behavior or use the actual production capture boundary exposed by the installed runtime. Do not certify parity from screenshots of `buildSandboxComposition`.

### Actual encoded output

Render MP4s through the real production path, probe stream/frame count/FPS/dimensions/color metadata, decode the selected frames, and play the complete transition windows. A zero-pixel raw comparison does not verify the encoded output. Independent MP4 encodes may differ because of GOP/reference-frame context; the exact episode review therefore reuses the actual file. Never describe a separately encoded specimen as the identical final episode output.

## 5. Async and synchronization scenarios

| Scenario                                        | Expected observation                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| Select A, then B; A finishes last               | B remains selected/current; A cannot replace its artifact                     |
| Seek 10, 20, 5; 20 arrives last                 | Frame 5 remains visible and labeled 5                                         |
| Type duration, then change effect before commit | Old timing request cannot overwrite new effect defaults                       |
| Save pending, unrelated selector used           | Only Save is pending/disabled; unrelated interaction remains available        |
| Preset save fails                               | Draft preserved, saved revision unchanged, clear Retry                        |
| Browser offline during render                   | Artifact not falsely Ready; reconnect fetches latest job revision             |
| Catalog revision changes mid-job                | Old job retains immutable input; UI marks it stale and requests new revision  |
| Same fingerprint requested from two views       | One render, two leases; closing one view does not cancel the other            |
| Route unmount/re-entry                          | Listeners/timers released; no zombie job or stale update                      |
| Render exits unsuccessfully                     | No ready manifest/file published; retry safe; contextual error                |
| Encoder finishes, verification fails            | Still not Ready; output retained only as failed diagnostic artifact           |
| Cache manifest exists but MP4 missing/corrupt   | Cache hit rejected, current state recoverable, no old ID reused for new bytes |
| Previous artifact expires while visible         | Explicit expired/stale state; rebuild sample or reopen actual output safely   |
| Service restart interrupts job                  | Interrupted jobs become failed/retryable; no permanent phantom Running        |
| User pauses while new artifact loads            | New artifact does not unexpectedly start playback                             |
| Autoplay is blocked                             | Ready first frame and Play remain available; no false Playing state           |
| Existing episode draft differs from output      | Actual render remains identified; render-required action shown                |

For duplicate/out-of-order events use controlled fakes; for actual network/render failures use the integration environment. Do not corrupt user production assets to produce these failures.

## 6. UX audit

Run at 1440 x 900, 1024 x 768, 390 x 844, and 320 x 568:

- Exactly one active effect selector and one transport. There is no sidebar/player duplication.
- No title ends with a period. Supporting text has a specific decision/recovery purpose.
- Timing/Loop/Replay/Download/native-size inspection live in the documented secondary surface.
- Cut has no adjustable timing; frame stepping is one actual frame, not 5%.
- Main viewport uses the configured production aspect and scales the finished artifact only.
- Keyboard focus is visible, all actions have accessible names, menus/sliders work by keyboard and touch, targets are at least 44 x 44 CSS pixels.
- Required source/stale/error state remains visible without hover.
- Reduced motion suppresses auto-play and UI animation, not the content of a user-started video.
- Existing responsive application footer remains present exactly once, outside video pixels.

## 7. Performance and resource evidence

Measure on the user's target environment with a representative local specimen. Report at least ten requests for warm operations and five cold renders, including median/p95 and cache status.

Targets, not claims of measured performance:

- Selection/pending acknowledgement within 100 ms.
- Warm artifact metadata hit within 300 ms, excluding video network/decode time.
- Warm cached paused frame visible within 150 ms on local networking; uncached seek should provide pending feedback immediately.
- Only one active sample render and one pending replacement per view; global concurrency obeys the existing limiter.
- Cancellation releases the sample subprocess/slot promptly; target two seconds after the last lease ends, with a measured timeout escalation path.

Record cold full-resolution preview latency honestly. If cold rendering is too slow for useful iteration, optimize content-addressed reuse, process startup, assets, and supported batch/range capture without changing source time or production render policy. Do not lower resolution/quality or add an approximate preview secretly. An unavoidable tradeoff requires the owner's decision.

Test cache eviction, disk-full behavior, frame-decode coalescing, and memory after repeated tab open/close. Only generated unleased sample artifacts can be evicted.

## 8. Commands and final report

Run from the repository root after implementation creates the new script aliases:

```powershell
pnpm --filter @studio/shared build
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:transitions
pnpm test:transitions:parity
pnpm test:transitions:e2e
pnpm test
pnpm build
pnpm run audit
```

The new aliases do not exist at planning time. Task 10 must define their exact targets in package scripts and CI. Existing scripts are read from the current root package; execute after reconciling concurrent changes.

Restart affected server/web processes so final workflow checks use the new code and shared bundle. The current development endpoints are web `http://127.0.0.1:2244` and server health `http://127.0.0.1:4310/api/health`; verify current configuration rather than assuming they remained unchanged.

The final report contains A1-A12 results, exact command outcomes, baseline failures, reviewed visual changes, artifact/frame checksums, evidence links, performance measurements, and unresolved limitations. Do not claim completion with required parity/async/persistence gates unexecuted.
