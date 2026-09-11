# Transition Design Contract

## 1. Product goal

The user must be able to select a transition, observe its actual rendered behavior, inspect exact frames, and decide how to improve it without navigating a complicated editor. Adding or changing a transition must propagate through preview, production, persistence, cache identity, and tests through one deliberate implementation path.

This is an architectural change. The packet is a proposal for execution, not approval of an already-implemented visual result.

## 2. Testable accuracy guarantees

### 2.1 One artifact is the viewing authority

Playback uses a completed server-rendered artifact. Pause, seek, and frame-step images are decoded from that same file and are identified by its SHA-256 and display-order frame index. Downloading the review video returns the same bytes. No React overlay, CSS recreation, opacity approximation, or fabricated Scene A/Scene B is allowed over the video.

For an existing episode, review the existing production MP4 and its manifest. A window around a boundary references the original file and absolute frame indices; do not independently re-encode a short replacement and call it identical.

For a sample or changed draft, use the production composition builder, transition resolver, engine invocation, assets, fonts, canvas, frame rate, and encoding configuration. The result is truthful for those resolved inputs. It is not a claim that a different future episode will have the same pixels.

### 2.2 Source and timing identity

Identical resolved scene inputs, transition revision, composition bundle, asset/font content hashes, frame mapping, engine runtime, and render configuration must produce the same transition scene state at the same production time. The production and review paths must share preparation and render execution rather than merely use similarly named functions.

Use integer output-frame indices at review boundaries. Record the actual output frame rate as numerator/denominator and the decoder's frame-index-to-PTS table. Do not assume `video.currentTime` or a percentage slider selects a particular decoded frame.

### 2.3 What absolute does not mean

Monitor calibration, display scaling, browser color management, GPU drivers, hardware decoders, and independently encoded lossy videos cannot be promised byte-identical. The normal player is a scaled view of a real video. Native-size paused inspection exposes the exact decoded frame image without CSS filters or additional effects.

CI must distinguish three claims:

1. Exact artifact identity: review and download reference the same bytes.
2. Exact frame identity: paused PNG RGBA pixels equal a reference decode of the same artifact/frame under the pinned decoder configuration.
3. Renderer parity: independent production and review preparation reach the same resolved composition state and raw capture in a pinned capture environment. Encoding is verified separately; do not compare compressed output to raw HTML pixels with an arbitrary tolerance and call that exact.

## 3. Approaches considered

| Approach                                                 | Benefit                                             | Limitation                                                                     | Decision                   |
| -------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------- |
| Keep React preview and copy more formulas from CSS       | Small initial patch                                 | Independent motion logic will drift again                                      | Reject                     |
| Share composition HTML in a live iframe                  | Responsive interaction, closer visual parity        | Still depends on client runtime, asset readiness, decoder, and timing behavior | Not the accuracy authority |
| Render-backed player with artifact-derived paused frames | Shows actual output; no duplicated animation engine | Requires asynchronous rendering and caching                                    | Adopt                      |

Do not add a quick/accurate mode selector. If preparation is slow, improve scheduling, reuse, and cache behavior without substituting unverified pixels.

## 4. Findings that implementation must close

| Current source                                                                                           | Observed issue                                                                 | Required outcome                                                                 |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `apps/web/src/features/transitions/utils/transitionOverlayRenderer.tsx`                                  | Disables CSS animations and substitutes linear/sine formulas                   | Remove from active consumers after render-backed replacement                     |
| `apps/web/src/features/transitions/components/TransitionPreviewPlayer.tsx`                               | Uses fabricated scenes and a fixed 50% scene switch                            | Review production scene composition and real boundary timing                     |
| `packages/shared/src/transitions/styles.ts`                                                              | Shared CSS still contains fixed durations/delays                               | One resolved timing plan; proportional internal timing                           |
| `apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts`                                            | Only lightning creates brush markup; brush wave enters bubble markup branch    | Dispatch exact registered implementation, never a generic visual fallback        |
| `apps/server/src/quiz/render/candyArcade/customVideoClips.ts`                                            | Intro timing and markup have separate resolution logic                         | Delegate to shared resolution and effect implementation                          |
| `apps/server/src/quiz/timeline/compilers/questionCompiler.ts`                                            | Transition event duration originates in timing policy                          | Resolve selection and duration before event compilation; consume one result      |
| `apps/web/src/features/sandbox/hooks/useSandboxPresets.ts` and `packages/shared/src/api/stylePresets.ts` | Some transition load hooks exist, but preset save/schema omit transition state | Add a typed, round-trippable optional transition settings field                  |
| `apps/server/test/helpers/visualSnapshotHarness.ts`                                                      | Captures sandbox documents, despite production-oriented test descriptions      | Add independent actual production-builder coverage, not two sandbox renders      |
| `apps/server/src/tasks/video/videoInvocation.ts`                                                         | Missing local engine can fall back to unpinned npx                             | Accuracy-critical execution fails clearly when the pinned local engine is absent |

## 5. Visual semantics and migration policy

Preserve stable IDs. First extract behavior without changing choreography; then make the following explicit corrections with before/after evidence and an implementation revision change:

- `cut`: instantaneous boundary, zero effect duration. The surrounding sample still has positive duration.
- `crossfade`: preserve the existing production fade-to-black behavior for this upgrade; label it `Fade to Black` in the registry. Do not silently turn it into a two-scene dissolve. A true dissolve would require an explicitly approved new behavior/revision and overlap/audio policy.
- `stinger_swipe`: preserve the two-slash/flash visual vocabulary. Move all delays, flash phases, and the scene handoff into the declared duration so the flash cannot accidentally occur outside its visible window.
- `bubble_splash`: preserve bubbles, bed, brand, particles, release, palette inheritance, and intended overshoot. All attack/hold/release delays scale with the effective duration and end cleanly.
- `brush_wave`: actually render brush markup, not bubbles. Keep it distinct from lightning.
- `lightning_brush`: preserve the production brush styling and mark; do not copy the preview-only lightning glyph unless separately approved as a visual change.

The owner approves before/after visual evidence before corrected choreography becomes the release default. Antigravity must not choose new colors, extra flashes, motion motifs, or visual redesigns under the label of parity.

The transition system must not shift narration, trim source media, or shorten an episode to make an effect fit. Keep existing scene boundary positions. Resolve/clamp the effective effect window to the available timeline window, report a timing adjustment, and scale the effect to that window. If an effect requires a different overlap topology, reject that placement until an explicit timeline change is approved.

## 6. Non-negotiable engineering rules

- One module owns each transition's metadata, motion, markup, and supported placement contract.
- No string-derived CSS-class fallback or unknown-ID-to-bubble fallback.
- One resolved transition instance feeds timeline, overlay, source visibility, SFX cue timing, preview, and render manifest.
- A queued/running job uses an immutable snapshot. New edits create a new fingerprint, never mutate a running composition.
- Keep content and timeline business decisions out of React and route handlers.
- Server/API boundaries validate input and return structured errors; preserve selection on failure.
- Do not use the sandbox rehearsal script as proof of production equivalence. It has a separate animation clock and does not represent the whole production renderer.
- No new production dependency unless a concrete need and compatibility/security/license review are recorded. Do not upgrade HyperFrames as part of this change merely because a newer version exists.
- Preserve existing saved IDs and absent fields. Unknown or unavailable revisions must be explicit errors, not silent substitutions.
- No OS mouse, keyboard, clipboard, or focus automation. Browser verification uses headless browser protocols.

## 7. Release scope

Migrate Visual Sandbox Transition and `ModalTransitionPreview` together. Keep non-transition sandbox behavior and quiz layout geometry unchanged. Test current production 16:9 and 9:16; derive exact pixel dimensions and FPS from production configuration. Do not advertise 1:1 support through the current portrait/landscape adapter without a separate verified implementation.

The sample preview is automatic. An explicit episode review source can reuse a current output; if changed episode inputs require an expensive full render, disclose that and require the existing render action. Do not launch full episode renders automatically on every timing edit.
