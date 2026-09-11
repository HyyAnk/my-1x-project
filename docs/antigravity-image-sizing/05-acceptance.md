# Acceptance and Verification

## Requirement traceability

| Requirement                                        | Implementation tasks | Required evidence                                                  |
| -------------------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| R1 Preserve visual layout and timing               | 1, 3, 8              | Before/after fixed-frame/card bounds, phase screenshots, local MP4 |
| R2 Shared inner-slot geometry                      | 1, 2, 3              | CSS uses canonical geometry; DOM test independently agrees         |
| R3 All active roles/layouts                        | 1, 2, 4, 8           | Eight-layout matrix including no-media cases                       |
| R4 Distinct slot/source/provider/actual dimensions | 2, 3, 5, 7           | Recommendation unit tests, sample labels, actual metadata          |
| R5 Effective layout resolution                     | 4, 6                 | Explicit/auto/presentation tests and direct-render guard           |
| R6 Ratio-aware prompts and answer fairness         | 4, 8                 | Prompt assertions, side-by-side choices with same framing          |
| R7 Provider size constraints and config            | 5, 6                 | Intercepted actual payloads, fallback/override tests               |
| R8 Stale plans/assets/render outputs               | 4, 6, 7              | Reconciliation/idempotency/cache lifecycle tests                   |
| R9 Actual metadata validation                      | 5, 6, 7              | Wrong-ratio bytes rejected at all live gates                       |
| R10 Responsive UI and async synchronization        | 3, 6, 8              | UI tests plus desktop/mobile live smoke                            |
| R11 Production parity and real render              | 8                    | Production HTML parity, inspected MP4 and frames                   |

## Required test matrix

### Pure geometry and policy

| Input                               | Expected behavior                                             |
| ----------------------------------- | ------------------------------------------------------------- |
| cover 432 x 336                     | 4:3; recommended 672 x 504; crop loss about 0.035714          |
| cover 432 x 484                     | 1:1; recommended 728 x 728; crop loss about 0.107438          |
| cover 622 x 342                     | 16:9; recommended 1024 x 576; crop loss about 0.022508        |
| cover 450 x 600                     | 3:4; recommended 696 x 928; crop loss zero                    |
| contain viewport                    | crop loss zero; unused area reported separately               |
| Several stable viewports per source | Minimax selection; size sufficient for every painted viewport |
| Candidate list reordered            | Identical ratio and raster recommendation                     |
| Exact tie                           | Documented mean-loss then fixed-order tiebreak                |
| Zero, negative, NaN, infinity       | invalid_geometry, no successful recommendation                |
| Empty/unsupported candidate set     | unsupported_ratio_set, no silent square fallback              |
| Full Stack or Split text choices    | No image requirement, no provider call                        |
| Desktop/mobile/iframe zoom changes  | Same logical 1920 x 1080 requirement                          |

Do not derive expected ratio exclusively by calling the same helper under test. The numerical cases above are independent assertions. Add a deliberate test-only geometry mutation and confirm recommendation/render CSS change together; modifying the CSS alone must make the DOM parity test fail.

### Browser and production parity

Test all supported choice counts and both Split Versus presentations. Use local fonts, no remote assets, and disable only animation/transition during untransformed geometry measurements.

- Compare every active image's content viewport with declared geometry: tolerance <=1 logical pixel, allowing normal browser subpixel rounding.
- All equal-layout choices agree in source ratio, framing, and natural specimen dimensions.
- For Mystery Reveal, identify both image layers; compare unmasked stable viewport dimensions, not the animated zero-width clip wrapper. A hidden layer is not a reason to omit coverage.
- Preserve existing fixed shell/arena/card coordinate assertions. Do not use newly changed catalog metrics as their only oracle.
- For motion screenshots, restore animations and seek both paths to equivalent choices/thinking/reveal/explain phases. Shared image fit and semantic answer state must agree even when wrappers differ.
- Production HTML must come from `prepareQuizVideoRender` / `HyperframesRenderer.prepare` (Candy Arcade V2 composition bundle), not another Sandbox snapshot relabeled as production.
- Include all built-in answer-card skins and representative mascot on/off cases. Geometry must stay contract-controlled; imported custom styles must not silently redefine its box model.

### Provider boundary

Intercept requests at the real adapter HTTP boundary. Disable unmatched network requests and use fake credentials. Test:

1. Explicit per-asset 4:3 request reaches GPTI2 as its existing supported 1024 x 768 size.
2. Explicit per-asset 16:9 reaches GPTI2 as 1280 x 720.
3. ImgStudio retains ratio and configured preset/quality; existing 1K-only model behavior remains valid.
4. ShopAiKey/custom size expresses the requested ratio; a conflicting environment/explicit size follows the conflict policy.
5. Primary-provider failure and configured fallback keep the same aspect/framing requirement.
6. A square payload returned for a 16:9 request is not registered as ready.
7. Request metadata and actual byte metadata remain distinct; `2K` is never shown as a fabricated exact width/height.
8. Sufficient source resolution passes; 1.0x-1.5x warning does not trigger automatic expensive upgrades; below-1.0x required generated image blocks.
9. Decode failure, transport timeout, cancellation, and unsupported capability all stop loaders and have bounded retries.
10. Validation/persistence failure cannot increment confirmed progress to ready/100%.

### Stale data and concurrency

Use an isolated temporary repository fixture, not real channels:

1. Existing schema-v2 plan without sizing metadata still parses.
2. Opening/inspecting stale data makes no repository writes and no provider calls.
3. Old square Visual Card/Split plan is detected before full-build and direct-render paths.
4. Compatible source with metadata-only change is reused without generation.
5. Geometry-only change invalidates optimized output/render identity without changing source generation identity.
6. Ratio/framing change invalidates generated source identity; confirmation is required if migration would incur new replacement generation.
7. Explicit user selection survives mismatch and stays warned rather than repeatedly regenerated.
8. One failed choice leaves the other successful choices reusable; retry processes failed eligible assets only.
9. Concurrent source/layout edit while old generation is outstanding rejects old commit and preserves latest data.
10. Duplicate task submission/events do not create duplicate paid side effects or backwards progress.
11. Repeated reconciliation is a no-op and repeated unchanged render reuses outputs.
12. Same logical asset ID/source mtime but changed optimizer parameters must produce new output identity.
13. A missing/corrupt required local source cannot be silently omitted from the completed MP4.

### UI state and responsive behavior

At minimum test desktop 1440 x 900 and mobile 390 x 844:

- Fast success, slow response, error, retry, no-media layout, stale result, reconnect, and concurrent update.
- A-B-C layout switching: A and B late completions/font readiness/errors cannot replace C or stop C's loader.
- Previous preview remains clearly stale while new one is pending; no new labels are overlaid as though old HTML is current.
- No accidental image API call from layout selection or an Episode GET/read.
- Success refreshes affected plan/resolution/assessment/readiness automatically; reconnect refetches state.
- No duplicate CTAs or per-title explanatory paragraphs; title labels have no trailing periods.
- Details disclosure works with keyboard, focus, and touch; critical warnings are not tooltip-only.
- No page-level horizontal overflow; keep logical video sizing independent of display zoom.
- Reduced-motion mode still communicates pending/success/error state as text.
- Existing application footer is preserved; no website credit is inserted into video frames.

## Commands

Run from the repository root in PowerShell. Do not install/upgrade packages to make an unrelated baseline failure disappear. Record baseline failures separately with exact output and verify whether the change introduced them.

Current baseline suites:

```powershell
pnpm --filter @studio/shared test
pnpm --filter @studio/server exec vitest run test/quizLayoutAssetAspectRatioE2E.test.ts test/quizAssetPlannerDynamicResolution.test.ts test/imageOptimizer.test.ts test/imgstudioClient.test.ts test/gpti2Image.test.ts test/shopAiKeyImage.test.ts test/quizScenePipeline.test.ts test/quizProductionPipelineFastPath.test.ts
```

New targeted suites, after those files exist:

```powershell
pnpm --filter @studio/shared exec node --import tsx --test test/quizImageSizing.test.ts
pnpm --filter @studio/server exec vitest run test/quizImageSlotSizing.browser.test.ts test/quizAssetSizingReconciliation.test.ts test/quizImageSizingProviderContract.test.ts test/quizImageMetadataValidation.test.ts test/quizAssetSizingLifecycle.test.ts test/renderImageIdentity.test.ts test/quizImageSizingProductionParity.test.ts
pnpm --filter @studio/web exec vitest run src/features/sandbox/components/design/SandboxImageRequirements.test.tsx src/features/sandbox/components/design/SandboxLayoutSelector.test.tsx src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx src/features/episode/utils/quizRailCalculations.test.ts
```

Integration gates:

```powershell
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
git diff --check
```

Run formatter only against files changed by this task. Do not format the whole dirty repository. If full tests are blocked by unrelated failures, report exact failures and run all impacted suites; do not claim the entire repository passes.

Use the installed renderer and the repository's existing render/test harness for the MP4 smoke. Read `apps/server/package.json`, `apps/server/test/helpers/visualSnapshotHarness.ts`, `apps/server/test/videoRenderExecution.test.ts`, and local CLI `--help` to construct the supported command. Record the exact successful command in the implementation report. Keep cloud rendering and paid generation disabled. Do not substitute `pnpm build` for an actual video render.

Use existing `pnpm dev`/project launcher as appropriate after rebuilding; do not kill every Node process on the machine. Identify only the affected application processes. Background helpers on Windows must launch hidden and must not take over mouse/keyboard/clipboard/focus.

## Evidence delivery

Deliver `evidence/implementation-report.md` containing:

1. Exact changed-file list and brief architectural boundary summary.
2. Before/after per-layout table: slot dimensions, fit, source ratio, recommended size, provider payload/preset, actual dimensions, crop/unused-space metrics.
3. Explicit layout, auto layout, no-media, legacy plan, cache, explicit selection, and concurrent-change results.
4. Commands with exit codes and test counts; distinguish baseline failures and unperformed checks.
5. Before/after Sandbox screenshots and production frame screenshots with phase/skin/canvas labels.
6. Actual local MP4 path, frame timestamps inspected, render duration, and renderer version.
7. Confirmation that no originals or production data were deleted, no unrelated changes were reverted, and no unapproved paid provider calls occurred.
8. Any remaining limitation, including no live paid-provider smoke test if that was not separately authorized.

Completion is not allowed if only the square catalog constants, specimen labels, or snapshot expectations changed. A fake/mocked provider response proves request plumbing, not external service compliance; clearly distinguish that from local render verification.
