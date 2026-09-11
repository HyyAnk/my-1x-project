# Layout Image Sizing Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans, if available, to implement this plan task-by-task. Steps use checkbox syntax. The owner chose execution in Antigravity; do not spawn other tasks or agents unless separately authorized. If the skill is unavailable there, follow the same checkpoint and verification sequence directly.

**Goal:** Make actual layout image slots drive Sandbox specimens, Episode requirements, provider requests, and render preparation.

**Architecture:** Pure shared geometry and sizing policy feed thin compatibility adapters and rendering styles. Episode workflow checks persisted sizing, validates actual media through one boundary, and distinguishes source-generation identity from render-output identity.

**Tech Stack:** Existing TypeScript, Zod, Vitest/node:test, Playwright, Sharp, React, HyperFrames, pnpm, Windows PowerShell.

**Spec:** [Design contract](01-design-contract.md) and [sizing contract](02-sizing-contract.md). Read both first.

## Global constraints

- Preserve existing outer frame/arena positions, card sizes, badges, question text, answer order, semantic correctness, timing, and reveal effects. This is not a layout redesign.
- Use the current TypeScript, Zod, Vitest, Playwright, Sharp, and HyperFrames installation. No dependency upgrades in this work.
- All repository artifacts and visible application copy must be English. Owner-facing chat may be Vietnamese.
- Do not run paid APIs or mass-replan existing Episodes merely to test the implementation. Use temporary repository fixtures and intercepted HTTP requests.
- Existing unrelated changes remain untouched. No broad staging, reset, cleanup, or commit. Review each task's diff checkpoint without committing unless separately requested.
- Do not build a generic browser measurement service or duplicate renderer. Browser geometry checks run in tests, not in normal asset planning.

## Task 1: Characterize actual slots and lock the defect

**Files**

- Create: `apps/server/test/quizImageSlotSizing.browser.test.ts`
- Create: `apps/server/test/helpers/imageSlotMeasurement.ts`
- Read/reuse: `apps/server/test/quizLayoutContent.browser.test.ts`, `quizFrameAnchors.browser.test.ts`, `quizScenePipeline.test.ts`, `quizPreviewProductionStyleParity.test.ts`
- Evidence: `docs/antigravity-image-sizing/evidence/before/`

**Interfaces**

Produce a test helper returning image-element content dimensions, untransformed media border box, computed `objectFit`, source natural dimensions, layer identity, and current declared recommendation. No production imports from this test helper.

- [ ] Record `git status --short` and a targeted baseline diff before touching any overlapping renderer/provider file. Save the evidence outside production data. Re-check whether another task is editing the same files.
- [ ] Render all eight layouts with all supported choice counts using existing composition fixtures. Inline installed fonts and wait for font readiness. Freeze animations for geometry, without changing width/height/border/fit. Use default built-in skins first and record every hero layer.
- [ ] In the test helper, measure image content excluding borders and padding, not the parent card. For CSS transforms, use untransformed computed box dimensions or a geometry-only test mode; keep production transforms untouched.
- [ ] Add a failing policy-parity regression based on the live DOM, not copied catalog values. After Task 2 it uses the public recommendation function. The initial failure must identify Visual Card/Split mismatch, not a missing dependency.

```typescript
// The measurement fixture creates these from actual DOM, not the catalog.
expect(visualCard.imageViewport).toEqual({ width: 432, height: 336 });
expect(splitVersus.imageViewport).toEqual({ width: 622, height: 342 });
expect(visualCard.currentPlannedRatio).toBe("4:3"); // Fails before correction.
expect(splitVersus.currentPlannedRatio).toBe("16:9"); // Fails before correction.
```

- [ ] Run `pnpm --filter @studio/server exec vitest run test/quizImageSlotSizing.browser.test.ts`. Record the intended red assertions. Preserve the passing geometry characterization when implementation proceeds.
- [ ] Review baseline against `baseline-measurements.json`. Inspect screenshot differences before accepting a changed measured dimension. Do not loosen geometry tolerances to hide a shifted layout.

**Gate:** Before screenshots/measurements exist and the defect is reproduced with font-ready HTML. All eight active layouts have media-role inventory; Full Stack/text-only paths show no images.

## Task 2: Implement the pure sizing contract

**Files**

- Create: `packages/shared/src/quizImageSizing/types.ts`, `geometry.ts`, `policy.ts`, `index.ts`
- Create: `packages/shared/test/quizImageSizing.test.ts`
- Modify: `packages/shared/src/index.ts`, `quizLayouts.catalog.ts`
- Test: `packages/shared/test/quizLayouts.catalog.test.ts`, `quizLayouts.policy.test.ts`

**Interfaces**

Implement exactly `ImageSlotGeometry`, `ImageSizingRecommendation`, `ImageSizingResult`, `recommendImageSizing`, and `getQuizImageSlotGeometry` from the sizing contract. Existing layout exports remain backward compatible.

- [ ] Write the following pure test cases using `node:test` and `node:assert/strict`, matching this package's existing test convention. The factory in the test constructs a valid `ImageSlotGeometry` with one supplied viewport and a constant 1920 x 1080 canvas.

```typescript
const cases = [
  [432, 336, "4:3", 672, 504],
  [432, 484, "1:1", 728, 728],
  [622, 342, "16:9", 1024, 576],
  [450, 600, "3:4", 696, 928],
] as const;
for (const [width, height, ratio, rw, rh] of cases) {
  const result = recommendImageSizing(makeGeometry(width, height, "cover"));
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.code);
  assert.equal(result.value.aspectRatio, ratio);
  assert.deepEqual(result.value.recommended, { width: rw, height: rh });
}
```

- [ ] Add explicit tests for no slot, two reveal viewports, `contain` crop=0, maximum mismatch ranking, candidate-order-independent tie handling, nonfinite/nonpositive dimensions, empty candidates, and no browser zoom/DPR dependency. Test unsupported runtime values through the boundary parser rather than unchecked production casts.
- [ ] Run `pnpm --filter @studio/shared exec node --import tsx --test test/quizImageSizing.test.ts`; verify red before implementation.
- [ ] Implement ratio selection and aligned dimensions using the exact formulas in the sizing contract. Keep `gcd`, `lcm`, ratio parsing, and candidate ranking private pure helpers. Reject invalid values with the specified result codes.
- [ ] Populate geometry from the Task 1 source/CSS audit. Role existence depends on resolved layout and presentation, not just whether catalog.media.supported mentions it. Deduplicate equal-sized choice viewports for planning, but measure all choices in browser tests.
- [ ] Replace known-active-slot static catalog metrics with derived adapters. Do not leave a second mutable ratio table or broaden capability/format compatibility incidentally. Legacy calls for absent/unknown roles keep their documented compatibility behavior; active pipeline paths never use it.
- [ ] Run the new pure tests plus `pnpm --filter @studio/shared test`. Fix intentional old square expectations with evidence, not snapshot auto-acceptance. Review dependency direction and exports.

**Gate:** All formula cases pass, including genuinely portrait geometry selecting 3:4. Policy does not import DOM/server/providers. Geometry comes from source rules, not a hardcoded expected-ratio map.

## Task 3: Wire renderer geometry and truthful Sandbox samples

**Files**

- Create: `apps/server/src/quiz/render/layouts/imageSlotStyles.ts`
- Modify: the seven image-bearing layout/CSS files listed in `03-source-map.md`, plus `layoutContentGeometry.ts` only for the relevant extraction
- Modify: `packages/shared/src/sampleImages.ts`, `apps/server/src/quiz/render/scene/sandboxSceneAdapter.ts`
- Create: `apps/web/src/features/sandbox/components/design/SandboxImageRequirements.tsx` and its adjacent `.test.tsx`
- Modify: `apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.tsx`, `hooks/useSandboxPreviewRenderer.ts` only as required
- Test: `packages/shared/test/sampleImages.test.ts`, `apps/server/test/sandboxComposition.test.ts`, Task 1 browser tests, existing Sandbox selector/preview hook tests

**Interfaces**

Consume shared recommendation and geometry. The new requirements component receives a recommendation or explicit no-media state, plus optional provider/actual metadata; it does not fetch or calculate layout geometry. Do not add a global state store.

- [ ] Add red tests that generated specimen natural dimensions match its label and the recommendation, and changing layout changes both sample and UI summary.

```typescript
expect(specimen.width).toBe(recommendation.recommended.width);
expect(specimen.height).toBe(recommendation.recommended.height);
expect(specimen.aspectRatio).toBe(recommendation.aspectRatio);
expect(sampleSvg).toContain(`width="${specimen.width}"`);
expect(sampleSvg).toContain(`height="${specimen.height}"`);
```

- [ ] Generate CSS size/border/inset values from canonical geometry using the new focused renderer helper. Delete superseded numeric declarations in the modified slot rules so CSS precedence cannot keep an older value active. Keep animation and skin rules unchanged.
- [ ] Have `adaptSandboxQuizScene` request active-role recommendations and build a specimen with its exact recommended dimensions. Preserve the general ratio sample catalog for other features. Do not fabricate unused hero/choice requirements in the visible inspector.
- [ ] Extract the existing inline media-spec block from the oversized selector into `SandboxImageRequirements`. Show compact ratio summary and accessible expanded details; provider request and actual dimensions appear only when known.
- [ ] Pair pending preview diagnostics with the same request ID as pending HTML. On rapid layout A-B-C changes, late A/B HTTP success, font readiness, and error cannot overwrite C. Retain timeline time, phase, and current selection on retry.
- [ ] Run targeted shared/server/web tests. Example web command: `pnpm --filter @studio/web exec vitest run src/features/sandbox/components/design/SandboxImageRequirements.test.tsx src/features/sandbox/components/design/SandboxLayoutSelector.test.tsx src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx`.
- [ ] Re-run Task 1 geometry tests. Card/frame coordinates must remain within 1 logical pixel, while specimens change ratio and dimensions intentionally.

**Gate:** No stale static 640 x 640 claim for the changed layouts. Pure Visual may remain square, but its new computed recommendation is 728 x 728 under the preserved baseline. This is intentional, not a missed migration.

## Task 4: Plan current Episode assets and frame prompts consistently

**Files**

- Modify: `packages/shared/src/schemas/quiz/quizAssets.ts`
- Modify: `apps/server/src/quiz/assets/assetPlanner.ts`, `promptCompiler.ts`, `promptFramingRules.ts`
- Create: `apps/server/src/quiz/assets/reconcileQuizAssetSizing.ts`
- Create: `apps/server/test/quizAssetSizingReconciliation.test.ts`
- Test: `apps/server/test/quizAssetPlannerDynamicResolution.test.ts`, `quizLayoutAssetAspectRatioE2E.test.ts`

**Interfaces**

Persist `sizing` as defined in the sizing contract. Export the following from the reconciliation module, with `QuizV2`, `DirectorPlan`, and `QuizAssetPlan` imported from shared:

```typescript
export type SizingChange = {
  assetId: string;
  kind: "metadata_only" | "render_only" | "generation_affecting";
  previousRatio: string;
  currentRatio: string;
};
export type AssetSizingReconciliation = {
  plan: QuizAssetPlan;
  changes: SizingChange[];
};
export function reconcileQuizAssetSizing(quiz: QuizV2, director: DirectorPlan, plan: QuizAssetPlan): AssetSizingReconciliation;
```

The reconciler is pure and classifies requirement changes only. Actual-source quality and explicit selection are evaluated by Tasks 5-6. Invalid layout/role input raises the project's structured domain/repository error at the application boundary, with question/asset context.

- [ ] Add red planner tests for explicit and auto-resolved layouts, both Split Versus presentations, all hero layouts, and no images in Full Stack. Ensure asset intents conflicting with an active layout produce a contextual validation issue, not invisible billable media.

```typescript
expect(plan.assets.filter((a) => a.purpose === "answer_option").map((a) => a.aspect_ratio)).toEqual(["4:3", "4:3", "4:3"]);
expect(compiled.prompt).toContain("Output framing: 4:3.");
expect(compiled.prompt).not.toContain("square frame");
expect(updatedPlan.assets[0].subject).toBe(originalPlan.assets[0].subject);
expect(reconcileQuizAssetSizing(quiz, director, updatedPlan).changes).toEqual([]);
```

- [ ] Add schema tests proving old schema-v2 plans parse without sizing metadata and new plans round-trip it. Test invalid dimensions/keys and retain old enum support.
- [ ] Implement effective-layout resolution before `planQuizAssets` constructs requests. Use the same resolution inputs as production rendering; never pass raw `auto` to a ratio lookup.
- [ ] Derive prompt framing and consistency-group subject_scale from visible-source safe bounds. Remove the unconditional `68 percent of the square frame` wording. Keep lighting/style/fairness identical across choices.
- [ ] Implement pure reconciliation preserving user-editable subject/content and semantic keys. Distinguish ratio/framing changes from raster-bound-only changes. Reconciliation twice is a no-op; no timestamps enter equality/identity.
- [ ] Run `pnpm --filter @studio/server exec vitest run test/quizAssetSizingReconciliation.test.ts test/quizAssetPlannerDynamicResolution.test.ts test/quizLayoutAssetAspectRatioE2E.test.ts` and shared schema tests.

**Gate:** New Episode plans and Sandbox agree by resolved slot, including non-choice layouts. Persisted plan updates do not erase manual content.

## Task 5: Verify provider payload and actual output at one boundary

**Files**

- Create: `apps/server/src/quiz/assets/imageMetadataValidator.ts`
- Modify: `assetValidator.ts`, `resolveQuizAssets.ts`, `validateAssets.ts`, `resolvers/providerAssetResolver.ts` in the same assets directory
- Modify only required adapter seams from `03-source-map.md`
- Create: `apps/server/test/quizImageSizingProviderContract.test.ts`
- Create: `apps/server/test/quizImageMetadataValidation.test.ts`
- Test: `apps/server/test/gpti2Image.test.ts`, `imgstudioClient.test.ts`, `shopAiKeyImage.test.ts`, `imageProviderFallback.test.ts`

**Interfaces**

The new metadata boundary takes actual bytes plus recommendation and provenance, never trusts the provider's ratio label:

```typescript
export type ImageMetadataValidation = {
  actual: { width: number; height: number } | null;
  issues: Array<{
    code: "image_undecodable" | "image_output_aspect_mismatch" | "image_resolution_insufficient" | "image_resolution_below_recommendation";
    severity: "warning" | "blocker";
  }>;
};
export function validateQuizImageBytes(input: {
  bytes: Uint8Array;
  recommendation: ImageSizingRecommendation;
  provenance: "generated" | "explicit";
  required: boolean;
}): Promise<ImageMetadataValidation>;
```

Repository path access, read errors, and mapping to `QuizIssue` stay in the existing data-access/application callers. All three call paths use this same dimensional policy; do not require filesystem access inside shared code.

- [ ] Intercept actual HTTP request construction, not only the dimension helper. Use fake credentials and fixtures; block unmatched network calls. Test 4:3 GPTI2 size=1024x768, 16:9 GPTI2 size=1280x720, ImgStudio ratio plus configured preset, and ShopAiKey/custom size precedence.
- [ ] Write real fixture bytes with Sharp at 1024x768, 1024x1024, 1280x720, 320x180, and an invalid payload in a temporary test root. Return the wrong square bytes for a requested 16:9 image to force a red boundary test.

```typescript
expect(outboundBody.aspect_ratio).toBe("16:9"); // Ratio-field adapter case.
expect(validation.issues).toContainEqual({
  code: "image_output_aspect_mismatch",
  severity: "blocker",
});
expect(resolution.assets).not.toContainEqual(
  expect.objectContaining({
    asset_id: rejectedAssetId,
  }),
);
```

- [ ] Implement the <=2% generated ratio check and 1.0x/1.5x quality policy from the sizing contract. Decode actual supported raster formats with Sharp and honor orientation. Do not blanket-assume PNG because current generated fixtures use PNG.
- [ ] Store optional actual_dimensions only after successful decode. Apply validation before registering a generated result, before cache reuse, during completeness checks, and before render preparation. Explicit sources retain identity and produce warnings under the specified policy.
- [ ] Forward full provider configuration consistently, including direct render asset preparation. Reject conflicting size overrides deterministically, preserve model/quality/resolution preferences, and test configured fallback preserving ratio.
- [ ] Test cancellation during an outstanding mock request; it must not register ready media or start another retry. Verify retry limits do not multiply when metadata validation rejects output.
- [ ] Run provider and metadata suites. Confirm every test uses intercepted HTTP or local fixtures and none reads live secrets.

**Gate:** A provider can no longer return a square image for a landscape requirement and have it marked ready based only on copied metadata. No additional paid call was made in testing.

## Task 6: Reconcile stale Episodes safely and synchronize status

**Files**

- Create: `apps/server/src/quiz/assets/ensureQuizAssetSizing.ts`
- Modify: `apps/server/src/quiz/pipeline/stages/assetsVoiceStages.ts`, `apps/server/src/tasks/pipeline/quizV2PipelineRunner.ts`, `apps/server/src/tasks/video/videoCompositionPreparer.ts`, `videoAssetPreparation.ts`
- Modify: existing Episode task/action/status/assessment seams from `03-source-map.md` only as needed
- Create: `apps/server/test/quizAssetSizingLifecycle.test.ts`
- Test: `apps/server/test/quizProductionPipelineFastPath.test.ts`, `quizParallelAssetsVoice.test.ts`, `apps/web/src/features/episode/utils/quizRailCalculations.test.ts`

**Interfaces**

`ensureQuizAssetSizing` is a focused application workflow over existing repository/task facilities. It receives current artifacts, action intent (`inspect`, `generate`, or `render`), explicit replacement confirmation state, and a current source-identity token. It returns current reconciled artifacts plus `current`, `stale`, or `confirmation_required` and affected asset IDs. Define strict input/result types in that module before implementation, using existing repository/action contracts; do not invent a new generic task API.

- [ ] Add red integration tests with a saved square plan for Visual Card/Split, an old compatible Pure Visual plan, a manual source, and a partial resolution. Opening/inspecting must not write anything or call a provider.

```typescript
expect(provider.generateAsset).not.toHaveBeenCalled();
expect(repository.writeAssetPlan).not.toHaveBeenCalled(); // Inspect intent.
expect(result.status).toBe("stale");
expect(result.affectedAssetIds).toEqual(expectedAffectedIds);
```

- [ ] Change pipeline readiness from `asset_plan exists` to a current-sizing comparison. Perform it before the asset/voice parallel section so a stale image plan is not considered complete. Preserve existing successful voice artifacts and timing semantics.
- [ ] Wire the same guard into direct render/preparation, not only the full build runner. No updated MP4 is declared current using unresolved stale sizing. Preserve previously generated videos as historical files.
- [ ] Implement read-only inspect, metadata/render-only reconciliation, and confirmation-required generation changes. Use existing action/confirmation UI; show the number of affected images and possible generation cost, without claiming an exact price when unknown.
- [ ] Preserve explicit provenance in all reuse/bundle paths. Completeness and resolver agree that warned explicit images are retained; retries do not repeatedly regenerate or replace them.
- [ ] Guard async commits by the captured Episode/director/plan/source identity. If a user changes layout or source during generation, reject stale commit with `asset_sizing_changed_during_generation`, keep the new selection, and surface retry. Use existing repository/task serialization; do not add mutable global locks.
- [ ] Keep partial successes and per-asset counts. Retry only failed/stale eligible assets; repeated task submission/events do not duplicate generation or progress. On mutation success refetch affected Episode state; on reconnect re-read it. Readiness checks must use validated compatibility, not just asset array length.
- [ ] Run server lifecycle/fast-path/concurrency tests and Episode web tests. Include failure and persistence rejection: neither may produce ready/100% status.

**Gate:** Old plans are handled intentionally, no original media is deleted, no surprise billing occurs on read, and all affected views refresh without F5.

## Task 7: Make render optimization parameter-aware

**Files**

- Create: `apps/server/src/tasks/video/renderImageIdentity.ts`
- Modify: `apps/server/src/tasks/video/imageOptimizer.ts`, `videoAssetPreparation.ts`, `apps/server/src/tasks/fingerprints.ts`
- Create: `apps/server/test/renderImageIdentity.test.ts`
- Test: `apps/server/test/imageOptimizer.test.ts`, `renderSourceFingerprint.test.ts`

**Interfaces**

`createRenderImageIdentity(input)` is a pure function producing a stable string key from source content/fingerprint, recommended output bounds, fit, quality, and optimizer version. Define a typed input with those exact fields. Optimizer I/O records/compares this key in a sidecar or identity-derived output filename under the render directory. Never include absolute path alone as source-content identity.

- [ ] Add a red regression: optimize the same unchanged source to two different target bounds using the same logical asset ID and newer output mtime. The second call must not incorrectly report skippedExisting.

```typescript
expect(keyForSmallBounds).not.toBe(keyForLargeBounds);
expect(keyForSameInputs).toBe(keyForSmallBounds);
expect(secondResult.skippedExisting).toBe(false);
expect(thirdIdenticalResult.skippedExisting).toBe(true);
```

- [ ] Have `getOptimalAssetDimensions` delegate to the new recommendation for resolved active slots. Carry full geometry context from preparation instead of forcing every choice into the default bounds.
- [ ] Keep resizing non-destructive: optimize copies under renderRoot, preserve source aspect ratio with `fit: inside`, do not stretch, upscale, or crop source masters. The CSS fit contract owns display fitting. Supplied bounds must preserve enough source pixels for that fit.
- [ ] Include the new optimization identity in prepared asset/render dependency identity. Geometry-only changes invalidate optimized copies and MP4 checkpoints without forcing paid source regeneration.
- [ ] Treat unreadable required images as actionable failures rather than silently omitting them from the render. Preserve existing handling for unrelated optional media.
- [ ] Run identity/optimizer/fingerprint tests. Verify a no-change second render can reuse outputs and a changed-sizing render cannot use the old checkpoint.

**Gate:** New sizing reaches actual optimized files and render caches, not merely metadata. Original assets remain byte-identical.

## Task 8: Verify integrated parity and hand off evidence

**Files**

- Extend: `apps/server/test/quizImageSlotSizing.browser.test.ts`
- Create: `apps/server/test/quizImageSizingProductionParity.test.ts`
- Evidence: `docs/antigravity-image-sizing/evidence/after/`, `evidence/production/`
- Report: `docs/antigravity-image-sizing/evidence/implementation-report.md`

- [ ] Run the acceptance matrix in `05-acceptance.md`, recording command, exit code, scope, and evidence paths.
- [ ] Generate local diagnostic fixture images at requested aspect ratios, with center subject, edge markers, and circle/grid distortion cues. Do not use image-generation APIs. Use existing SVG/Sharp utilities, not new dependencies.
- [ ] Feed those assets through an isolated Episode fixture and the real production composition builder. Compare media geometry/fit/recommendations with Sandbox at equivalent phases. Stub only external provider/audio I/O, not the layout resolver, asset planner, optimizer, or production HTML builder.
- [ ] Render a real MP4 containing the three reported layouts and at least one contain-based hero layout through the installed HyperFrames workflow. Read the available HyperFrames skill/CLI documentation at execution time; inspect local command help before running. Do not guess CLI flags or upgrade its pinned version.
- [ ] Inspect extracted frames at choices, thinking, reveal, and explain. Keep sources centered and undistorted, labels/circle markers readable, and correct-answer state identical. Record separate expected cover cropping and contain unused space.
- [ ] Restart/rebuild affected app processes using existing project commands. Verify the actual latest Sandbox UI at desktop 1440 x 900 and mobile 390 x 844; test keyboard/touch disclosure, rapid layout changes, error/retry, and automatic Episode refresh.
- [ ] Review the final diff for circular imports, stale duplicate literals, dead validators, new responsibilities in oversized files, broad provider changes, and unintentional production-data edits. Verify originals remain untouched.
- [ ] Deliver the report with before/after table, payload captures, actual metadata, tests, screenshots, MP4 path, and any blocked checks. Explicitly state that live paid-provider generation was not tested unless separately authorized and actually performed.

**Gate:** Every R1-R11 requirement has implementation and verification evidence. Do not mark complete while the production render or live UI check is unperformed; report a concrete blocker if local prerequisites prevent it.
