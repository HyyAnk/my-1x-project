# Transition Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. If the execution environment does not provide that skill, follow the same checked steps and review gates explicitly. Steps use checkbox syntax for tracking. Do not delegate or create additional tasks unless separately authorized.

**Goal:** Make Transition review show actual production-rendered artifacts, with exact paused-frame inspection and a single extensible implementation for every effect.

**Architecture:** Canonical pure definitions feed one resolved production timing/composition path. A bounded server preview service renders immutable sample artifacts or references actual episode output. One frontend player displays the video and frames decoded from that same artifact.

**Tech Stack:** Existing TypeScript, React, Fastify, Zod, Vitest, Playwright, HyperFrames, FFmpeg, and repository task/render infrastructure; no new production dependency by default.

**Spec:** [Design contract](01-design-contract.md), [architecture](02-architecture.md), [interaction](03-interaction-and-sync.md), and [acceptance](05-acceptance.md).

## Global constraints

- One review player, showing a server-rendered video artifact. React never simulates transition pixels.
- Existing unrelated working-tree changes must remain untouched.
- All new files, comments, fixtures, and visible text are English.
- No OS mouse, keyboard, clipboard, or focus automation.
- Do not upgrade dependencies, broadly refactor layouts, regenerate assets, or shift narration pacing.
- Do not commit, stage, push, or publish without a separate request. Record logical checkpoint summaries for owner review instead.
- A passing build, matching class names, or two sandbox snapshots is not evidence of production parity.
- Every changed runnable boundary must be rebuilt/restarted as needed and exercised before delivery.

## Execution order and review gates

Execute Tasks 0-3 before any frontend replacement. Complete Tasks 4-6 before routing a user to the new player. Complete Tasks 7-9 before deleting the old preview. Task 10 is a mandatory release gate, not optional polish.

Each task follows red test -> observed failure -> narrow implementation -> passing test -> diff review. The code excerpts below lock down interfaces and representative tests; they are not production-ready replacements for whole files. Implement all stated acceptance cases, not only the excerpts.

### Task 0: Establish independent evidence and feasibility

**Files:** Create `apps/server/test/helpers/transitionFixtures.ts`, `apps/server/test/helpers/transitionParityHarness.ts`, and `apps/server/test/transitionProductionParity.test.ts`. Record output under `docs/antigravity-transition-unification/evidence/` when executing; no evidence files exist yet.

**Interfaces:** `createTransitionFixture(id, aspectRatio)` returns validated production `QuizV2`, director, timeline, style context, assets, and boundary identity. `captureProductionBoundary(fixture, frameIndex)` prepares through `HyperframesRenderer.prepare` and captures at the absolute frame time through the installed engine. The helper must not call `buildSandboxComposition`.

- [ ] Capture the current `git status`, exact installed tool/browser versions, production invocation flags, render configuration, and current transition routes. Record existing failures separately.
- [ ] Create local deterministic two-question fixtures using existing production test helpers and bundled fonts/assets. Include an intro-video fixture generated locally through FFmpeg; do not use paid providers or actual private episode material.
- [ ] Write a failing parity test exposing the current brush markup and crossfade mismatch. Use independent production preparation and legacy frontend DOM inspection only for the initial characterization.

```typescript
it("production brush_wave has brush geometry, not bubble geometry", () => {
  const fixture = createTransitionFixture("brush_wave", "16:9");
  const html = transitionClip(fixture.transitionClipInput);
  expect(html).toContain('class="brush brush-one"');
  expect(html).not.toContain('class="splash-bed"');
});
```

- [ ] Run `pnpm --filter @studio/server exec vitest run test/transitionProductionParity.test.ts`; preserve the expected failure and current rendered-frame artifacts.
- [ ] Render a short specimen using `getHyperframesInvocation`/`runHyperframesProcess` with the same production flags; verify MP4 duration, FPS, frame count, and decode one exact frame. Measure cold/cache costs.
- [ ] Prove a review can reuse an actual artifact without re-encoding and access exact display-order frames. Inspect the installed CLI capabilities; do not invent range-render flags or patch bundled engine code.
- [ ] Gate: if render-backed samples cannot run with the current production adapter, report the concrete blocker. Do not substitute a live React animation. This gate determines integration details, not permission to weaken accuracy.

### Task 1: Define catalog, selection, and resolved timing contracts

**Files:** Create shared `transition.types.ts`, `transition.schemas.ts`, `transitionTiming.ts`, `resolveTransition.ts`, `transitionSettings.ts`, and their tests. Modify shared compatibility exports and `api/transitionPreview.ts`.

**Interfaces:** Adopt the contracts in architecture Sections 3 and 6. Implement `resolveTransitionInstance(selection, context)` and `resolveTransitionSettings(sources)`; `sources` is a typed object with draft, explicit, preset, channel, and default selections per placement, not a generic dictionary.

- [ ] Write timing tests covering zero cut, invalid values, rational FPS, window fitting, and unchanged boundary positions.

```typescript
it("does not move the production source handoff", () => {
  const instance = resolveTransitionInstance(
    { id: "stinger_swipe", durationSeconds: 0.5 },
    transitionContext({ placement: "intro", boundaryFrame: 45, startFrame: 30, availableEndFrameExclusive: 60 }),
  );
  expect(instance.boundaryFrame).toBe(45);
  expect(instance.startFrame).toBeGreaterThanOrEqual(30);
  expect(instance.endFrameExclusive).toBeLessThanOrEqual(60);
  expect(instance.endFrameExclusive - instance.startFrame).toBe(instance.durationFrames);
});
```

`transitionContext(overrides)` is a test helper in `packages/shared/test/helpers/transitionContext.ts`; defaults are 1920 x 1080, 30/1 FPS, scene placement, stable instance ID, and explicit palette values. The stinger case explicitly uses intro placement.

- [ ] Run `pnpm --filter @studio/shared exec vitest run test/transitionTiming.test.ts test/transitionSettings.test.ts` and confirm tests fail for missing contracts/behavior.
- [ ] Implement immutable resolution, exact integer window fitting, cut semantics, placement validation, and paired ID/duration precedence. Preserve IDs and existing absence/default behavior.

```typescript
const requestedFrames = Math.round((seconds * fps.numerator) / fps.denominator);
for (let frames = requestedFrames; frames >= 1; frames -= 1) {
  const start = context.boundaryFrame - Math.round(frames * handoffProgress);
  if (start >= context.startFrame && start + frames <= context.availableEndFrameExclusive) {
    return { startFrame: start, durationFrames: frames, endFrameExclusive: start + frames };
  }
}
throw invalidTiming("The transition does not fit this source boundary");
```

The loop operates only after finite duration/FPS validation and registry bounds; it does not accept unbounded client counts. `invalidTiming` is a local typed domain-error constructor in `transition.schemas.ts`, mapped at the server boundary.

- [ ] Add strict Zod validation, catalog DTO projection excluding functions, and a single compatibility adapter for legacy selection fields and `auto`.
- [ ] Re-run focused tests and shared build. Gate: no duplicate active-effect enum list introduced and no consumer re-resolves the same instance.

### Task 2: Extract canonical effect modules

**Files:** Create shared `catalog.ts`, six definition files, `primitives/brushMarkup.ts`, and `primitives/escapeTransitionMarkup.ts`. Modify `transitionRegistry.ts`, `styles.ts`, `index.ts`, `packages/shared/src/index.ts`, and `packages/shared/test/transitionDefinitions.test.ts`.

**Interfaces:** `listTransitionDefinitions(): readonly TransitionImplementation[]` returns immutable canonical definitions; `getTransitionDefinition(id): TransitionImplementation` returns a definition or throws a typed unknown-ID error. Existing `getTransition/listTransitions` remain metadata facades during migration.

- [ ] Write parameterized catalog tests for unique IDs, supported placements, nonempty revisions, valid bounds, registered renderer availability, escaped context text, and deterministic markup/styles.

```typescript
for (const definition of listTransitionDefinitions()) {
  it(`${definition.id} renders deterministically`, () => {
    const context = contextForDefinition(definition);
    expect(definition.renderMarkup(context)).toBe(definition.renderMarkup(context));
    expect(definition.styles).not.toMatch(/Math\.random|Date\.now/);
  });
}
```

`contextForDefinition` extends the Task 1 test helper with the definition's first supported placement. Add behavioral style/markup assertions; the string scan alone is not determinism proof.

- [ ] Confirm failing tests, then move existing effect markup/CSS to its definition without changing motion first. `styles.ts` aggregates definition styles rather than retaining copied keyframes.
- [ ] Replace production hardcoded markup switches with a delegate to the catalog. Correct Brush Wave dispatch in a separate reviewed diff after extraction passes characterization.
- [ ] Implement normalized timing and explicit handoff fractions; verify the source is covered at the boundary, trailing particles clear before removal, and cut does not require an overlay.
- [ ] Apply the visual migration policy: keep fade-to-black semantics under stable `crossfade` ID and update the label; preserve the production lightning mark.
- [ ] Run shared tests and the Task 0 brush regression; compare before/after captures for every deliberate motion correction. Gate: owner visual approval is required before these corrections become release defaults.

### Task 3: Wire one resolved instance through production

**Files:** Create server `render/transitions/renderTransitionClip.ts`, `transitionSourceLayers.ts`. Modify `candyArcadeClips.ts`, `customVideoClips.ts`, `candyArcadeComposition.ts`, `visual/candyArcade.ts`, `quizRenderStyleContext.ts`, `timeline/compilers/questionCompiler.ts`, and the narrow caller that resolves director/style before timeline compilation. Extend typed timeline contracts where needed.

**Interfaces:** `renderResolvedTransitionClip(instance, context)` consumes an already-resolved instance. `applyTransitionSourceHandoff(instance, sourceLayers)` applies source visibility to named inner wrappers without taking ownership of HyperFrames clip display. A typed transition instance map is keyed by stable instance ID.

- [ ] Add production contract tests that inspect the same ID/revision/start/end/boundary in timeline data, overlay attributes, source layers, and manifest input.

```typescript
expect(result.transitionInstances[boundaryId]).toEqual(resolvedInstance);
expect(result.html).toContain(`data-transition-instance="${boundaryId}"`);
const narrationBefore = before.timeline.events.filter((event) => event.type === "narration.segment");
expect(narrationBefore.length).toBeGreaterThan(0);
expect(result.timeline.events.filter((event) => event.type === "narration.segment")).toEqual(narrationBefore);
```

`narration.segment` is the current event emitted by `timelineContext.ts`. Also compare all source-media timing records and total duration; a nonempty narration comparison alone does not protect every media track.

- [ ] Observe failures, then move selection resolution before event construction and thread the resolved instance through rendering and SFX timing. Legacy timeline adaptation happens once with an explicit mapping report.
- [ ] Preserve question-enter times, media source ranges, narration positions, FPS, root duration, layout geometry, and all unrelated renderer behavior. Do not recompile voice timing simply to fit a transition.
- [ ] Run existing `candyArcadeComposition`, `quizPacing`, and transition production tests. Render an actual two-question production fixture in both aspect ratios.
- [ ] Gate: no second ID/duration/default fallback in render callers; no independently chosen UI scene handoff; source visibility is deterministic when seeking backward.

### Task 4: Share execution configuration and immutable artifact identity

**Files:** Create `tasks/video/renderEngineSnapshot.ts`, `renderInvocationOptions.ts`, `transitionPreviewRunner.ts`, and server preview fingerprint/store modules. Modify `videoRenderExecution.ts`, `videoInvocation.ts`, `renderManifestWriter.ts`; test `transitionRenderArtifacts.test.ts`.

**Interfaces:** `resolveRenderEngineSnapshot(config)` returns a serializable runtime identity. `buildRenderInvocation(snapshot, paths)` is used by production and preview. `fingerprintTransitionPreview(preparedInput)` returns a stable SHA-256. `publishPreviewArtifact(verifiedArtifact)` performs atomic immutable publication.

- [ ] Write tests proving that definition CSS, markup, palette, bundle files, font/media bytes, FPS, quality, browser/runtime, and encoder changes alter the fingerprint; job ID and temporary path changes do not.

```typescript
expect(fingerprintTransitionPreview({ ...input, jobId: "second" })).toBe(fingerprintTransitionPreview(input));
expect(fingerprintTransitionPreview(changeDefinitionCss(input))).not.toBe(fingerprintTransitionPreview(input));
```

Keep `jobId` outside the final fingerprint input contract; the example verifies exclusion by the preparation adapter. Test the public adapter rather than adding ignored properties to a strict domain type.

- [ ] Implement narrow execution-config extraction; preserve production defaults. Both callers receive the same quality/GPU/color/FPS policy. Worker count may differ only after concurrency determinism is verified and is recorded in evidence.
- [ ] Remove unpinned runtime fallback from accuracy-critical invocation. Missing local engine produces `ENGINE_UNAVAILABLE` with an actionable reinstall instruction, not a network install.
- [ ] Add verified frame count/PTS and artifact hash to manifests; make publication atomic and cache hits verify manifest/files. Legacy output manifests remain readable.
- [ ] Test partial files, failed probe, corrupted cache, same-key concurrent publish, runtime change, and unavailable historical revision. Completed production files are never overwritten by preview.
- [ ] Run focused tests and a production render through the updated invocation. Gate: no configuration drift between runner paths and no engine/library upgrade.

### Task 5: Prepare specimens and expose preview jobs

**Files:** Create `prepareTransitionSpecimen.ts`, `buildTransitionSpecimen.ts`, preview service/types/catalog/store modules, and `routes/transitionPreviews.ts`. Integrate route registration and existing render limiter/events. Add `transitionPreviewService.test.ts` and `transitionPreviewRoute.test.ts`.

**Interfaces:** `requestTransitionPreview(request, callerContext)` returns the status union in architecture Section 6. Inject repository/source reader, render runner, artifact store, limiter, and clock into the service composition root. `buildTransitionSpecimen` calls the production builder with validated fixture inputs, never sandbox snapshot HTML.

- [ ] Write service tests before implementation for cache hit/miss, rapid replacement, shared fingerprint leases, cancellation, failed source validation, and immutable job snapshots.

```typescript
const first = await service.request(requestA, callerA);
const second = await service.request(requestA, callerB);
await service.cancel(first.jobId, callerA);
expect(runner.invocationCount).toBe(1);
expect(runner.signal.aborted).toBe(false);
expect((await service.status(second.jobId, callerB)).status).not.toBe("cancelled");
```

Issue one public job ID per caller lease and one internal work ID per shared fingerprint, as specified in the architecture. Test both callers' visible statuses. The injectable fake runner tracks calls/signals explicitly.

- [ ] Build deterministic source fixtures with production scene adapters, current sandbox-relevant style, and 0.75-second pre/post inspection windows where available. Full specimen duration must include source lifetimes; inspection windows must not reset absolute animation clocks.
- [ ] For episode sources, reuse the actual output/manifest. If requested settings differ or no output exists, return `RENDER_REQUIRED` instead of silently rendering a different short clip or launching a full episode.
- [ ] Implement endpoints, authorized artifact lookup, monotonic job revisions, ETags, atomic cache publication, bounded cache eviction, lease cancellation, and measured progress.
- [ ] Use existing subprocess timeout/cancellation/process-tree cleanup and structured logs. Sample job timeout starts at 120 seconds of execution, configurable at the server boundary; queue time is not render timeout.
- [ ] Test malicious paths/IDs, invalid ranges, cross-source access, startup recovery after process interruption, and duplicate requests. Never expose filesystem paths to the browser.
- [ ] Run focused service/route tests and send a real local sample request. Gate: Ready only after valid artifact, no production repository writes from sample requests.

### Task 6: Decode exact frames from the same artifact

**Files:** Create `tasks/video/videoFrameDecoder.ts`, `transitionPreviewFrames.ts`, and `transitionFrameDecode.test.ts`.

**Interfaces:** `decodeArtifactFrame(artifactId, frameIndex, signal)` returns a PNG plus artifact checksum/frame identity. A low-level decoder takes a validated file path, exact frame index, fixed color policy, and AbortSignal; only the artifact service resolves paths.

- [ ] Write a fixture video with distinct numbered/color-coded frames, including B-frame encoding; verify first/last/boundary and nonsequential frame requests.

```typescript
const actual = await decodeArtifactFrame(artifactId, 7, signal);
expect(actual.artifactSha256).toBe(manifest.artifactSha256);
expect(actual.frameIndex).toBe(7);
expect(await rgbaHash(actual.png)).toBe(await referenceDecodedRgbaHash(artifactPath, 7));
```

The reference decoder is an independent test command selecting display-order frame 7, not a call back into the implementation under test. Pixel comparison ignores PNG metadata/compression and compares decoded RGBA buffers.

- [ ] Implement FFmpeg argument-array invocation with display-order selection, fixed RGB conversion, timeout, cancellation, output validation, and safe temporary paths.
- [ ] Cache frame results by artifact hash + decoder snapshot + frame index. Coalesce duplicate requests and prefetch at most two neighbors in each direction when idle.
- [ ] Test out-of-range, aborted, corrupt artifact, expired artifact, failed decoder, concurrent requests, and noninteger FPS. Verify the same artifact bytes are served for playback and download.
- [ ] Run focused decode/artifact tests. Gate: do not use approximate `-ss` keyframe seeking as the exact inspection implementation.

### Task 7: Replace the player and simplify the UI

**Files:** Replace `TransitionPreviewPlayer.tsx` internals; create player components/hooks/API/types/frame mapping files listed in architecture. Modify `VisualSandboxTab.tsx`, `SandboxTransitionTab.tsx`, `useSandboxTransitionState.ts`, and `ModalTransitionPreview.tsx`. Add hook/component tests and `apps/web/test/transitionPreview.spec.ts`.

**Interfaces:** `useTransitionPreview(request)` owns request/lease lifecycle and exposes request state plus current/stale artifact. `useTransitionTransport(artifact)` owns transport intent and authoritative frame requests. API calls live in `transitionPreviewApi.ts`, using the existing request client with AbortSignal support.

- [ ] Write tests that old results cannot replace a newer selection and visible frame identity changes only after image load.

```typescript
chooseTransition("brush_wave");
chooseTransition("bubble_splash");
completePreview("bubble_splash", artifactB);
completePreview("brush_wave", artifactA);
expect(currentArtifact().id).toBe(artifactB.id);
expect(currentSelection()).toBe("bubble_splash");
```

Implement `chooseTransition`, `completePreview`, `currentArtifact`, and `currentSelection` as test-harness controls around the hook and fake API, not production globals.

- [ ] Implement the exact states/debounce/polling/seek coalescing specified in the interaction document. Subscribe to monotonic revision updates and clean up timers/listeners/leases/object URLs on unmount.
- [ ] Use one video element and an artifact-derived paused PNG layer. Never retain legacy visual overlays beneath/above it. Preserve view scale; no live layout reflow of render content.
- [ ] Replace category toggles/cards/duplicate scrubbers with one grouped selector, one transport, and one overflow menu. Keep Timing collapsed and hide it for Cut. Remove preview-only tags and false real-time claims in the channel modal.
- [ ] Implement keyboard/touch/native-size inspection, autoplay-rejection handling, reduced-motion behavior, slow-frame feedback, and retry without losing draft input.
- [ ] Run web unit tests and the new Playwright test against freshly loaded app processes. Gate: both Sandbox and channel preview use the same component/service, no opt-out simulation path.

### Task 8: Close persistence and cross-consumer synchronization

**Files:** Modify shared `api/stylePresets.ts`, `presets.ts` where applicable, server repository/route preset mapping, `quizRenderStyleContext.ts`, sandbox preset service/hooks, channel sync adapter, and their tests.

**Interfaces:** Saved records carry optional `transitions: TransitionSettings`; legacy fields remain readable. New saved revisions are returned by the server and invalidate affected consumers.

- [ ] Write round-trip tests for create, update, load, duplicate, export/import, partial placement update, and a legacy preset without transitions.

```typescript
const saved = await repository.createStylePreset({ ...validPreset, transitions: settings });
const loaded = (await repository.listStylePresets()).find((preset) => preset.id === saved.id)!;
expect(loaded.transitions).toEqual(settings);
const resolved = resolveProductionTransitionSettings({ preset: loaded, director: explicitDirector });
expect(resolved.scene.id).toBe(explicitDirectorTransitionId);
```

Use the existing repository fixture with `createStylePreset/listStylePresets`; assert the saved ID is present before reading its settings in production-quality tests. `resolveProductionTransitionSettings` is the server adapter around shared `resolveTransitionSettings`, not a second precedence implementation.

- [ ] Observe failures, then wire canonical fields through schemas, persistence mappings, web drafts, and production preparation. Verify schema stripping cannot silently discard fields.
- [ ] Preserve dirty drafts on external preset revision changes; show a conflict action instead of overwriting. No completed save before server confirmation. Scene and intro settings stay distinct.
- [ ] Revalidate catalog/preset state on focus/reconnect and bounded visible-tab polling. Test a definition edit automatically replacing the previous artifact fingerprint without a page refresh.
- [ ] Gate: select -> save -> reload -> prepare production -> render retains the same resolved transition configuration; no extra UI save control introduced.

### Task 9: Remove obsolete implementations and enforce extensibility

**Files:** Remove obsolete `transitionOverlayRenderer.tsx`, `TransitionSceneA.tsx`, `TransitionSceneB.tsx`, `TransitionOverlay.tsx`, old playback hooks, and duplicate sandbox controls only after confirming zero remaining consumers. Replace existing extensibility/component tests with artifact-backed contracts. Update authoring documentation.

**Interfaces:** New effect registration happens in one canonical catalog. Frontend discovery uses the catalog endpoint; production and tests enumerate the same registered implementations.

- [ ] Add an isolated test-only registered effect with a unique ID/markup. Prove it is discovered by the API, selectable by the UI, rendered by production/specimen paths, frame-decoded, and included in parameterized tests without consumer changes.
- [ ] Add static architecture checks against importing legacy preview modules, transition-ID switches in consumers, independent frontend visual math, and duplicated effect allowlists. AST/import checks are preferred over brittle text-only scans.
- [ ] Remove the obsolete modules/imports/styles/tests and compatibility shims whose consumers have migrated. Keep only documented persisted-data compatibility adapters.
- [ ] Run `rg -n 'transitionOverlayRenderer|TransitionSceneA|TransitionSceneB' apps/web/src` and expect no active imports/source references. Audit remaining `transitionType ===` branches individually; zero visual dispatch branches outside canonical definitions.
- [ ] Run full shared/server/web tests and typecheck. Gate: adding a new effect changes its definition, one catalog registration, and its tests/evidence only, unless it requires a genuinely new production placement contract.

### Task 10: End-to-end release verification and handoff

**Files:** Add focused script aliases in root/package manifests, wire a required CI transition-parity job, update acceptance evidence and authoring instructions. Do not change unrelated workflow jobs.

**Interfaces:** Define `test:transitions` for focused contracts, `test:transitions:parity` for real production capture/decode comparisons, and `test:transitions:e2e` for the new Playwright workflow. They must fail if required renderer/decoder/browser evidence is unavailable; skipped visual tests are not passing parity.

- [ ] Execute the full acceptance matrix in `05-acceptance.md`, including deliberate stale-result races and at least one real encoded production fixture in each supported aspect ratio.
- [ ] Render each built-in transition at required durations/FPS and inspect the whole clip, not only its midpoint. Compare exact frames at boundary-adjacent positions and normalized landmarks.
- [ ] Measure cold render, cache hit, frame seek, and cancellation on the actual target machine; record median/p95 and maximum observed resource usage. Do not claim a promised latency without measurements.
- [ ] Run formatting, lint, typecheck, tests, build, and newly introduced script aliases. Rebuild shared output and restart affected server/web processes before the final user workflow. Confirm the loaded bundle/catalog revision changed.
- [ ] Review the diff for side effects, oversized mixed modules, unauthorized persistence, missing cancellation, fallback motion, hidden settings, and accidental layout/audio changes.
- [ ] Provide before/after clips, artifact checksums, comparison frames/diffs, manifests, commands/results, cache invalidation evidence, responsive screenshots, known baseline failures, and owner visual approval record.
- [ ] Gate: mark this upgrade complete only when every mandatory acceptance requirement is satisfied. An unresolved engine/codec/parity failure remains a blocker, not a reason to relax thresholds or replace the test reference.
