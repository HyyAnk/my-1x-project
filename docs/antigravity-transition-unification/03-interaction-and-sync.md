# Interaction and Synchronization

## 1. Main surface

The existing Transition tab contains:

- One grouped `Transition` selector, driven by the server catalog. Context-incompatible effects are excluded. In the standalone sample, grouping distinguishes intro and scene specimens without a second category toggle.
- One main rendered-video viewport using the existing sandbox aspect setting.
- One transport row: Play/Pause, previous frame, next frame, scrubber, and one time/frame readout.
- One overflow menu: Replay, Loop, Timing, Inspect at 100%, Download, and diagnostic details. Diagnostics are for troubleshooting, not a second editor.

`Timing` opens a compact panel with one duration value/slider and Reset. Show it only for effects with configurable duration. Display effective duration and a short adjustment message when the source window or frame quantization changes the requested value. Cut has no useless disabled duration slider.

Remove duplicated sidebar/player scrubbers, per-card preview buttons, enable-transition toggles, redundant category toggles, recommendation badges, persistent descriptions, duplicated duration captions, and a separate replay button when Play-at-end already replays.

Do not add an `Accurate`, `Fast`, `Live`, or `Render` mode selector. The artifact-backed player is the only viewing path. Do not add opacity, easing, particle, color, curve, or engine controls in this phase. Developers change the canonical definition; end users select and inspect.

Use existing application footer and identity copy without introducing a second credit. It remains outside the media frame and outside downloadable artifacts. All new labels and documentation are English; do not modify identity text as part of the transition upgrade.

## 2. Source honesty

- A standalone sandbox uses deterministic production sample scenes based on current relevant sandbox content/style. Show `Sample scenes` once near the viewport because this distinction changes what the user can infer.
- A channel modal inherits its real intro asset and channel style where available; do not claim a placeholder is that intro. Missing source media is an explicit source state.
- An existing episode review references its actual output and selected transition boundary. If current draft settings differ, label `Draft differs from render`; do not silently return old video as a preview of the draft.
- `RENDER_REQUIRED` offers the existing episode render action. No automatic full-episode jobs from scrubbing or rapidly changing options.
- A sample effect change prepares the appropriate production sample automatically. A source change must not preserve an incompatible effect or silently switch it; select the placement default visibly and report the replacement once.

Do not introduce a new multi-level episode browser just to satisfy these rules. Accept source context from the host surface; the first upgrade can use samples in standalone Sandbox and actual media context in the channel modal. The service contract supports explicit episode review without requiring a new navigation feature.

## 3. User flows

### Select an effect

1. Update the selector immediately; mark the viewport `Updating` and stop old playback.
2. Coalesce selection changes for 250 ms. Cancel the previous request/lease when superseded.
3. Snapshot the selected effect, catalog revision, source, style, FPS, and resolution server-side.
4. On cache hit, load the artifact and its manifest. Otherwise show queued/preparing/rendering status.
5. After verified ready status and successful media/frame load, atomically replace the viewport and reset to the review-window start.
6. Play once following the selection gesture where browser policy permits. If autoplay is blocked, show the ready first frame with Play; do not pretend playback started.

### Adjust timing

1. Local slider/value changes are visible immediately; do not request a render per pixel movement.
2. Commit on pointer release or Enter, or after 400 ms of keyboard-input inactivity.
3. Reject invalid values adjacent to the field without losing the user's input.
4. Use the same render/update path. Reset means the selected definition's default, not a global 0.5-second constant.
5. Timing changes are local draft state until an explicit existing Save/Apply action confirms persistence.

### Pause, scrub, and step

1. Pause native video immediately. Determine the current frame from the manifest PTS mapping; then request that frame image.
2. Keep the last authoritative image until the requested one has loaded. Show compact pending feedback while waiting; do not advance the visible frame counter early.
3. Scrubbing coalesces requests to at most one every 80 ms with a mandatory final request on release. The latest sequence ID wins; cancel obsolete requests.
4. Previous/next moves exactly one display-order output frame, clamped to the review window. No 5% pseudo-frame step.
5. `Inspect at 100%` exposes native pixels in a keyboard/touch-accessible pan/scroll container. Default view uses fit-to-container scaling only, never layout reflow or CSS filters on the content.
6. Resume playback from the selected PTS. Switch from PNG to video only after a decoded video frame is ready. A video frame callback can assist presentation timing; the authoritative stopped image still comes from the server decoder.

### Replay and loop

Replay returns to the first frame of the review window. Play at end replays. Loop is off by default and lives in the menu. Looping changes transport behavior only, not the rendered composition or fingerprint. Stop at the last visible frame when loop is off.

### Save and reload

Use existing preset Save/Update controls, not another Transition-specific save bar. Save both intro and scene selections when present. Disable the pending save action only. Confirm success after the server returns the saved preset revision, update all affected local/query state, and reconcile normalized settings. On failure keep the draft and show Retry. Loading and duplicating a preset round-trip transition settings.

## 4. State ownership

```text
uninitialized -> loading-catalog -> ready-to-request
ready-to-request -> queued -> preparing -> rendering -> verifying -> loading-media -> ready
ready -> updating [old artifact marked stale] -> ready [new artifact]
any pending state -> failed -> retry
any pending state -> cancelled
ready -> artifact-expired -> rebuild/reload
```

Separate request state, artifact state, playback state, and persistence state. The selector's draft is not proof of the visible artifact. Store the artifact's fingerprint with its image/video and only label it current when it equals the committed request fingerprint.

No independent React animation clock, shared-state percentage feedback loop, iframe rehearsal clock, or CSS animation timer may define transition appearance. Native playback supplies transport time; manifest/frame replies supply paused image identity.

## 5. Synchronization policy

| Change                                                       | Required synchronization                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Effect ID/duration or source/style/palette/media/FPS changes | New resolved snapshot and fingerprint; stop/mark old artifact stale; rebuild or cache hit                |
| Save preset succeeds                                         | Update saved revision and every consuming selector; refetch affected catalog/preset queries where needed |
| Save fails                                                   | Keep draft, no success badge; old saved config remains authoritative                                     |
| Definition code or CSS changes                               | Recompute content-based catalog revision; all preview caches with older fingerprints are stale           |
| Another task changes selected preset/channel                 | Refresh on focus and bounded background checks; preserve dirty draft and surface conflict                |
| Runtime/browser/encoder version changes                      | New engine snapshot and fingerprint; cached certification does not carry forward                         |
| Render finishes after a newer selection                      | Ignore for current display; may retain completed immutable cache entry                                   |
| Catalog changes during a job                                 | Running snapshot remains immutable; UI requests the new revision separately                              |

Catalog refresh: ETag revalidation on mount/focus/reconnect and every 15 seconds while the tab is visible. Reuse existing revision/event channels when available; do not introduce a second WebSocket system.

Job observation: use the existing task event stream if integration is straightforward; otherwise bounded polling at 500 ms, then 1 second after 5 seconds, then 2 seconds after 20 seconds. At 120 seconds without terminal progress, stop automatic observation and show `Still rendering` with Check/Cancel; do not declare failure solely because polling ended. A server timeout is a separate terminal failure. Resume from the last job revision after reconnect. Drop duplicate and older revisions.

Sample job resource limits: one active sample render per requesting view, at most one pending replacement; use the shared global video render limiter. A view leaving releases its lease. Deduplicated work continues only if another consumer still needs it. Do not interrupt an unrelated production render. Disk cache starts at a 2 GiB soft cap and 24-hour retention for unleased sample artifacts; eviction is least-recently-used, skips active leases, and never touches production outputs. If insufficient safe space remains, return a recoverable capacity error through `RENDER_FAILED` with a specific next action rather than deleting user media.

## 6. Immediate feedback and recovery

- Skeleton only on first load without a usable artifact.
- An old artifact may stay visible during update, but is visibly stale and not playing under the new selection label.
- Capture progress uses measured completed/total frames. Queue/preparation/encoding/verification use phase labels when exact work is unknown. Never invent percentage progress or announce Ready before verification.
- Retry creates or reuses a safe request for the same fingerprint. Retry is not a duplicate production side effect.
- Missing fonts/assets/engine: explicit failure, no fallback transition or default font masquerading as correct output.
- An expired artifact returns a typed error and safely rebuilds the sample from the current snapshot; never resolves a different file under the same artifact ID.
- Playback rejection, decode error, network failure, and render failure have distinct recovery copy.
- Use one concise `aria-live` status region, not announcements for every captured frame.

## 7. Responsive and accessibility behavior

Desktop/tablet: compact selector/inspector alongside the largest useful viewport; transport directly beneath the viewport. Mobile: selector, viewport, transport vertically stacked; secondary actions in one menu. The underlying render canvas never changes because the dashboard viewport resized.

Audit at 1440 x 900, 1024 x 768, 390 x 844, and 320 x 568. Keep controls touch-friendly (target at least 44 x 44 CSS pixels), no horizontal page overflow, keyboard-operable slider/menu/native-size inspector, visible focus, and accessible icon names. Space toggles playback only while player controls are focused; Left/Right steps frames only in the player, not inside other inputs.

Honor reduced motion in dashboard transitions and disable automatic review playback when requested. Do not alter the video effect itself under `prefers-reduced-motion`, because that would show a different render. User-initiated playback remains available. No flashing transition autoplays for reduced-motion users.
