# Architecture and Contracts

## 1. Dependency flow

```text
Canonical effect definitions + saved configuration + immutable scene inputs
                                  |
                         resolveTransitionInstance
                                  |
                   production timeline and composition builder
                                  |
                 existing HyperFrames execution adapter
                                  |
              immutable video artifact + revisioned manifest
                          /                  \
                  video playback        frame decode adapter
                                             |
                                      paused exact-frame PNG
```

React owns selection, pending state, and transport intent, not animation pixels. Definitions are pure and contain no React, filesystem, HTTP, mutable application state, or environment reads. Server orchestration owns I/O and immutable artifact creation. A media adapter owns FFmpeg decoding and subprocess lifecycle.

## 2. Proposed source structure

These are implementation targets, not files already created by this packet. Retain sound existing conventions. Split a listed module further only when it has distinct responsibilities; do not create empty layers.

```text
packages/shared/src/transitions/
  types.ts                       # Existing compatibility type exports
  transition.types.ts            # Selection, definition, instance contracts
  transition.schemas.ts          # Boundary validation
  transitionRegistry.ts          # Existing API delegates to canonical catalog
  catalog.ts                     # Exactly one built-in registration list
  resolveTransition.ts            # Pure selection and timing resolution
  transitionTiming.ts            # Frame quantization and normalized timing
  transitionSettings.ts          # Legacy-field adapter and precedence
  styles.ts                      # Compatibility aggregation, no effect source
  definitions/
    cut.ts
    crossfade.ts
    stingerSwipe.ts
    bubbleSplash.ts
    brushWave.ts
    lightningBrush.ts
  primitives/
    brushMarkup.ts               # Shared only by the two brush effects
    escapeTransitionMarkup.ts    # Escaping at markup boundary
  index.ts
packages/shared/src/api/
  transitionPreview.ts           # Catalog/job/manifest/frame contracts
  stylePresets.ts                # Add optional transition settings

apps/server/src/quiz/render/transitions/
  renderTransitionClip.ts        # Emits timed clip from resolved instance
  transitionSourceLayers.ts      # Applies canonical handoff to inner layers
  prepareTransitionSpecimen.ts   # Production-shaped two-scene fixture input
  buildTransitionSpecimen.ts     # Calls actual production composition builder
apps/server/src/quiz/transitionPreview/
  transitionPreviewService.ts    # Request, snapshot, deduplication, lifecycle
  transitionPreview.types.ts     # Injected ports and server-only job state
  transitionPreviewStore.ts      # Atomic manifests and immutable artifact cache
  transitionPreviewFingerprint.ts
  transitionPreviewFrames.ts     # Validated frame-index lookup and frame cache
  transitionPreviewCatalog.ts    # Serializable catalog with content revision
apps/server/src/tasks/video/
  renderEngineSnapshot.ts        # Exact engine/browser/encoder/config identity
  renderInvocationOptions.ts     # Shared production invocation arguments
  transitionPreviewRunner.ts     # Uses existing limiter/process/QA adapters
  videoFrameDecoder.ts           # FFmpeg/ffprobe adapter, no shell interpolation
apps/server/src/routes/
  transitionPreviews.ts          # Thin Fastify routes

apps/web/src/features/transitions/
  components/
    TransitionPreviewPlayer.tsx  # Replace internals; one real-artifact player
    TransitionSelector.tsx       # One grouped selector
    TransitionTransport.tsx      # One playback/frame transport
    TransitionTimingPanel.tsx    # Collapsed secondary timing controls
    TransitionPreviewStatus.tsx  # Loading, stale, error, retry
  hooks/
    useTransitionPreview.ts      # Debounce, job polling, revision guards
    useTransitionTransport.ts    # Video intent and authoritative frame loading
    useTransitionCatalog.ts      # Revision refresh and selection validation
  services/
    transitionPreviewApi.ts      # Uses existing request client and AbortSignal
  types/
    transitionPlayer.types.ts    # View-only discriminated state
  utils/
    transitionFramePosition.ts  # Pure index/PTS/visible-time mapping

apps/server/test/
  transitionProductionParity.test.ts
  transitionPreviewService.test.ts
  transitionPreviewRoute.test.ts
  transitionRenderArtifacts.test.ts
  transitionFrameDecode.test.ts
  helpers/transitionParityHarness.ts
  helpers/transitionFixtures.ts
packages/shared/test/
  transitionDefinitions.test.ts
  transitionTiming.test.ts
  transitionSettings.test.ts
apps/web/test/transitionPreview.spec.ts
```

Existing integration points to modify with small delegations:

- `apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts`, `customVideoClips.ts`, and `candyArcadeComposition.ts`.
- `apps/server/src/quiz/visual/candyArcade.ts`, `quizRenderStyleContext.ts`, `timeline/compilers/questionCompiler.ts`, and the timeline preparation caller.
- `apps/server/src/tasks/video/videoRenderExecution.ts`, `videoInvocation.ts`, `renderManifestWriter.ts`, and the render-service composition root.
- `apps/server/src/repository/stylePresets.ts`, `routes/stylePresets.ts`, shared preset schemas and existing intro/outro schema adapters.
- `apps/web/src/features/sandbox/VisualSandboxTab.tsx`, `hooks/useSandboxTransitionState.ts`, `hooks/useSandboxChannelSync.ts`, `hooks/useSandboxPresets.ts`, and `services/sandboxPresetService.ts`.
- `apps/web/src/features/channel/components/introOutro/ModalTransitionPreview.tsx` and existing channel transition selectors.
- Shared director transition schemas in `enums/quiz/pipelineEnums.ts` and `schemas/quiz/quizDirector.ts`: keep compatibility exports but remove duplicate active-effect allowlists.
- Server route registration, existing task/event wiring, and CI/package scripts.

Do not extend already-large entry points with orchestration. Extract only the relevant boundary before connecting the new feature.

## 3. Canonical domain API

```typescript
export type TransitionPlacement = "intro" | "scene";
export type FrameRate = Readonly<{ numerator: number; denominator: number }>;
export type TransitionSelection = Readonly<{
  id: string;
  durationSeconds?: number;
}>;
export type TransitionSettings = Readonly<{
  intro?: TransitionSelection;
  scene?: TransitionSelection;
}>;
export type TransitionContext = Readonly<{
  instanceId: string;
  placement: TransitionPlacement;
  fps: FrameRate;
  startFrame: number;
  boundaryFrame: number;
  availableEndFrameExclusive: number;
  width: number;
  height: number;
  fromColor: string;
  toColor: string;
  inkColor: string;
}>;
export type ResolvedTransitionInstance = Readonly<{
  instanceId: string;
  id: string;
  implementationRevision: string;
  placement: TransitionPlacement;
  startFrame: number;
  boundaryFrame: number;
  endFrameExclusive: number;
  durationFrames: number;
  effectiveDurationSeconds: number;
  fps: FrameRate;
  timingAdjustment: "none" | "frame-rounded" | "window-limited";
}>;
export type TransitionImplementation = Readonly<{
  id: string;
  implementationRevision: string;
  name: string;
  placements: readonly TransitionPlacement[];
  defaultDurationSeconds: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  cssClass: string;
  handoff: { kind: "cut" } | { kind: "cover" | "fade-black"; progress: number };
  renderMarkup: (context: TransitionContext) => string;
  styles: string;
}>;
export function resolveTransitionInstance(selection: TransitionSelection, context: TransitionContext): ResolvedTransitionInstance;
```

Contracts above are proposed. Keep the existing `TransitionDefinition` name for its legacy metadata contract and use `TransitionImplementation` for the richer canonical definition. `getTransition/listTransitions` project metadata from canonical implementations. Do not export two unrelated types with the same name. The public catalog DTO never serializes functions.

All non-cut effects have a positive resolved frame duration. Quantize once with `round(seconds * numerator / denominator)` and clamp to the valid available window; reject NaN, negative timing, inverted windows, unsupported placement, missing ID, and invalid FPS. Cut has zero effect frames and a valid `boundaryFrame`. Scene source lifetimes remain derived from production events, not an invented 50% switch.

`context.startFrame` is the earliest allowed effect start; `context.boundaryFrame` is the immutable production source handoff. For a non-cut definition with handoff fraction `h`, fit a positive frame count `d` such that `start = boundaryFrame - round(d * h)` is not before the allowed start and `start + d` is not after the available exclusive end. Choose the largest valid `d` not exceeding the quantized request, using integer arithmetic; if none exists, return `INVALID_TIMING`. The resolved instance records that actual start/end. A fade-to-black uses `h = 1`; a covering wipe declares its own full-coverage handoff fraction. Verify coverage at the handoff frame, not just that a number fits the window. Definition-specific coverage geometry remains inside the definition; no caller invents a midpoint. A duration constrained below its nominal minimum is accepted only as an explicit window-limited instance with verified visibility; otherwise reject the placement.

Effect CSS uses instance-scoped variables for duration and start. Every internal delay and phase is a normalized fraction of that duration. The final overlay must be cleared by the exclusive end frame. No uncontrolled CSS animation runs in the dashboard. Production HyperFrames owns clip visibility; animate inner source/overlay layers rather than fighting clip visibility.

## 4. Configuration precedence

Two distinct concerns must not be collapsed:

1. **Choice of transition:** explicit transient review draft > explicit saved episode/director selection > selected preset transition setting > existing channel/intro-style resolution > registry default for that placement.
2. **Availability of time:** the existing production timeline supplies the window and boundary. A selected duration cannot move narration or source boundaries implicitly.

For scene resolution, `auto` means continue to the next precedence source; it is not a visual effect. An explicit director choice wins over a preset. For intro resolution, preserve the current channel/default intro-style precedence inside its compatibility adapter. Use existing legacy duration fields when their owning selection is selected. Never combine an ID from one source with an unrelated source's duration.

Resolve the selection before compiling transition events. Attach the resolved instance to a typed transition event payload or a companion instance map referenced by stable event/instance ID. Renderers do not resolve a second time. Legacy timelines are adapted once at preparation with a recorded mapping; no background rewrite of saved timelines.

Preset create/update/load/duplicate/export/import includes `transitions?: TransitionSettings`. A missing field means legacy/default behavior, not reset to a frontend hardcoded default. A partial update changes only supplied placements. Existing scene/intro legacy fields remain readable; new writes use the canonical field where supported, with only required legacy serialization at existing boundaries.

## 5. Render authority and cache identity

Extract invocation/config resolution from `executeHyperframesRender` into a narrow adapter usable by production and preview. Reuse `runHyperframesProcess`, progress parsing, the existing render limiter, and post-render QA. Do not call the episode persistence workflow for samples: it pins/writes episode state, which a preview must not mutate.

Fingerprint a canonical serialization of:

- Schema version, complete resolved transition instances, definition content hashes and revisions.
- Actual composition HTML and every companion bundle file, scene inputs and absolute timeline positions.
- Every asset/font byte hash, layout/style/preset revisions, seed, and media ranges.
- Exact width/height, rational FPS, engine package version, runtime/compiler hash, browser binary/version, GPU mode, encoder version/flags, pixel format, color metadata, and quality.

Exclude timestamps, temporary paths, job IDs, and signed URL tokens. Use stable logical asset paths plus hashes. The engine is currently declared as `hyperframes: 0.8.17`; resolve and record the actual installed version at execution. An unpinned fallback is forbidden for certified previews and production execution after this migration.

Cache publication is atomic only after render, media probe, frame indexing, hash verification, and manifest validation. Use a generated cache directory beneath the repository runtime preview area, never user-provided paths. Content-addressed completed entries are immutable. Cache manifests include artifact checksum, render-input fingerprint, frame PTS table, source kind, absolute boundary mapping, and exact engine snapshot. Missing/corrupt files invalidate a hit and trigger a safe retry, never a success response.

Existing production output manifests gain additive transition/engine fingerprint fields. Old manifests remain readable and are identified as legacy/unverified; an existing MP4 can still be reviewed as an actual output without falsely certifying that it matches current settings.

## 6. API contract

Add a thin `/api/transition-previews` route group, following current API authorization conventions. Do not accept HTML, scripts, filesystem paths, arbitrary URLs, or encoder flags from the client.

```typescript
export type TransitionPreviewSource =
  | { kind: "sample"; sampleRevision: string; sandboxInput: SandboxPreviewRequest }
  | { kind: "episode"; channelId: string; episodeId: string; boundaryId: string };
export type TransitionPreviewRequest = Readonly<{
  clientRequestId: string;
  catalogRevision: string;
  source: TransitionPreviewSource;
  selection: TransitionSelection;
}>;
export type TransitionCatalogResponse = Readonly<{
  revision: string;
  sampleRevision: string;
  entries: readonly Pick<
    TransitionImplementation,
    "id" | "implementationRevision" | "name" | "placements" | "defaultDurationSeconds" | "minDurationSeconds" | "maxDurationSeconds"
  >[];
}>;
export type TransitionPreviewErrorCode =
  | "UNKNOWN_TRANSITION"
  | "UNSUPPORTED_PLACEMENT"
  | "INVALID_TIMING"
  | "CATALOG_CHANGED"
  | "SOURCE_CHANGED"
  | "SOURCE_UNAVAILABLE"
  | "RENDER_REQUIRED"
  | "ENGINE_UNAVAILABLE"
  | "RENDER_FAILED"
  | "RENDER_TIMEOUT"
  | "DECODE_FAILED"
  | "ARTIFACT_EXPIRED";
export type TransitionPreviewStatus =
  | { status: "queued"; jobId: string; requestId: string; fingerprint: string; revision: number }
  | {
      status: "running";
      jobId: string;
      requestId: string;
      fingerprint: string;
      revision: number;
      phase: "prepare" | "capture" | "encode" | "verify";
      completedFrames: number | null;
      totalFrames: number | null;
    }
  | {
      status: "ready";
      jobId: string;
      requestId: string;
      fingerprint: string;
      revision: number;
      artifactId: string;
      manifestUrl: string;
      videoUrl: string;
    }
  | {
      status: "failed";
      jobId: string;
      requestId: string;
      fingerprint: string;
      revision: number;
      error: { code: TransitionPreviewErrorCode; message: string; retryable: boolean };
    }
  | { status: "cancelled"; jobId: string; requestId: string; fingerprint: string; revision: number };
export type TransitionArtifactManifest = Readonly<{
  schemaVersion: 1;
  artifactId: string;
  artifactSha256: string;
  inputFingerprint: string;
  catalogRevision: string;
  engineSnapshotHash: string;
  sourceKind: "sample" | "episode";
  currentness: "matches-request" | "legacy-unverified";
  width: number;
  height: number;
  fps: FrameRate;
  frameCount: number;
  timeBase: { numerator: number; denominator: number };
  frames: readonly { index: number; pts: number }[];
  reviewWindow: { firstFrame: number; lastFrameInclusive: number; boundaryFrame: number };
  instances: readonly ResolvedTransitionInstance[];
}>;
```

Use existing `SandboxPreviewRequest` as imported typed input; only production-relevant fields contribute to the sample, and contrast report/debug/transport values do not alter transition appearance. The source preparation adapter derives placement, canvas/FPS, media, and window from server policy. A sample revision identifies a concrete two-scene production fixture, not invented frontend markup. All manifest frame indices and PTS ticks must be safe integers; validate bounds/order against the probed stream. Sample manifests require complete instances and `matches-request`. A legacy actual episode artifact may have no recoverable instances and `legacy-unverified`; it is still the real output, but the UI must not certify it as matching selected current settings. An explicitly changed episode draft returns `RENDER_REQUIRED` instead of a `matches-request` artifact.

| Endpoint                                                   | Behavior                                                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `GET /api/transition-previews/catalog`                     | Serializable available definitions, catalog revision and supported placements; ETag |
| `POST /api/transition-previews`                            | Validate and resolve snapshot; 200 for complete cache hit, 202 for a job            |
| `GET /api/transition-previews/jobs/:id`                    | Monotonic revisioned job status; existing event stream may provide same payload     |
| `DELETE /api/transition-previews/jobs/:id`                 | Cancel caller's lease; stop subprocess only when no consumers remain                |
| `GET /api/transition-previews/artifacts/:id/manifest`      | Validated immutable manifest                                                        |
| `GET /api/transition-previews/artifacts/:id/video`         | Original artifact bytes, Range support, correct MIME and immutable ETag             |
| `GET /api/transition-previews/artifacts/:id/frames/:index` | Lossless PNG decoded at exact display-order frame index; artifact checksum header   |

Validation failures before a job exists use `{ error: { code, message, retryable }, requestId }`; they do not fabricate a job ID/fingerprint. Non-ready job states do not expose a usable current artifact. An old visible artifact belongs to a separate stale view state.

Resolve authorization from source ownership and existing request context, even if the deployment is local. Deduplicate render work by fingerprint, but maintain per-caller request/lease identity so one consumer cannot cancel another. Frame access validates manifest bounds and artifact ownership; prevent traversal and raw path disclosure.

Use one public job ID per caller lease and an internal work ID keyed by fingerprint. The `requestId` echoed in status is the client's `clientRequestId`. Cancelling a public job changes only that lease's status; the internal work is stopped only after its final lease ends. This locks the cancellation contract without exposing internal worker IDs to clients.

## 7. Media adapter

`decodeArtifactFrame(artifactId, frameIndex, signal)` resolves an authorized immutable path, verifies the manifest, and selects the decoded display-order frame using FFmpeg through an argument array. Use the artifact PTS table, not nearest-keyframe seeking. Decode once per cached frame; coalesce identical concurrent requests and cancel unused work. Batch decoding neighboring frames is an optimization, not a semantic change.

Do not launch a decoder subprocess for every pointer move. The frontend coalesces seeks; the server caches requested and adjacent frames. Output RGB conversion, matrix/range, pixel format, and FFmpeg version are fixed in the decode contract. Missing/invalid color metadata produces an explicit recorded policy, never an invisible switch between paths.

Browser video playback may use native decoding. On pause, replace it only after the authoritative PNG is decoded and ready. The frame number shown must describe the visible PNG, not a requested frame that has not arrived yet.
