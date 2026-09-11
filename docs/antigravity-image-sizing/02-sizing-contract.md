# Geometry, Sizing, and Persistence Contracts

## Canonical geometry

Create a pure shared image-slot geometry module. It must not import the server renderer, DOM, repository, or provider clients. Move the relevant constants/formulas from the existing layout CSS into it, and generate the affected CSS dimensions/insets from those constants. Merely copying measured numbers into a second catalog leaves the original problem intact.

Reuse `LAYOUT_CONTENT_GEOMETRY` outer rectangles where possible by moving the required pure geometry into shared code and leaving a server re-export. Do not relocate unrelated frame/timing code. Keep layout capability catalog and geometry independent to avoid circular imports: geometry imports IDs/types only; the catalog may consume sizing output.

For the reported layouts, preserve these unanimated values:

| Layout                        | Card border box | Image border box | Border each side | Image content viewport |
| ----------------------------- | --------------- | ---------------- | ---------------- | ---------------------- |
| visual_choices_three          | 452 x 504       | 452 x 356        | 10               | 432 x 336              |
| visual_choices_three_pure     | 452 x 504       | 452 x 504        | 10               | 432 x 484              |
| split_versus_two, visual mode | 646 x 504       | 646 x 366        | 12               | 622 x 342              |

For hero layouts, extract the actual nested sizing rules, including border-box behavior, percentage max-width/max-height, and reveal layers. The outer mystery stage is NOT its image viewport. Inspect every image-bearing layer. Preserve decorative masks, clip windows, and animation transforms; transient mask widths must not become image-generation ratios.

Measure untransformed content geometry separately from motion/clipping. A production reveal layer and hidden layer can have different stable image boxes; include all such viewports in one requirement. Do not assert exact fractional values from the exploratory JSON without re-measuring with fonts ready. Stable layer box discrepancies are baseline evidence, not automatic permission to redesign them.

## Public pure contracts

Proposed files under `packages/shared/src/quizImageSizing/`: `types.ts`, `geometry.ts`, `policy.ts`, `index.ts`. If any new file grows past roughly 200 lines, split by responsibility. Names below are the cross-task contract; change them only consistently across this packet's consumers and tests.

```typescript
export type ImageSlotPurpose = "hero_question_image" | "answer_option";
export type ImageFit = "cover" | "contain";
export type ImageSize = Readonly<{ width: number; height: number }>;
export type ImageSlotViewport = ImageSize & Readonly<{ fit: ImageFit }>;
export type ImageSlotGeometry = Readonly<{
  layoutId: ResolvedQuizLayoutId;
  purpose: ImageSlotPurpose;
  canvas: ImageSize;
  viewports: readonly ImageSlotViewport[];
  geometryKey: string;
}>;
export type ImageSizingRecommendation = Readonly<{
  policyVersion: 1;
  geometry: ImageSlotGeometry;
  aspectRatio: QuizLayoutAssetAspectRatio;
  recommended: ImageSize;
  maxCropLoss: number;
  maxUnusedArea: number;
}>;
export type ImageSizingResult =
  { ok: true; value: ImageSizingRecommendation } | { ok: false; code: "invalid_geometry" | "unsupported_ratio_set" };

export function recommendImageSizing(
  geometry: ImageSlotGeometry,
  supportedRatios?: readonly QuizLayoutAssetAspectRatio[],
): ImageSizingResult;

export function getQuizImageSlotGeometry(input: {
  layoutId: ResolvedQuizLayoutId;
  purpose: ImageSlotPurpose;
  presentation: QuizChoicePresentation;
  choiceCount: number;
  canvasAspectRatio: "16:9";
}): ImageSlotGeometry | null;
```

Import `ResolvedQuizLayoutId`, `QuizLayoutAssetAspectRatio`, and `QuizChoicePresentation` from their existing definitions. Use type-only imports. `null` means that role is genuinely absent; it does not mean an invalid explicit layout is acceptable. Call `resolveQuizLayout` first for production inputs. A known active role with invalid dimensions is a structured failure, never a silent `1:1` fallback.

Supported standard ratios for this landscape policy: `1:1`, `4:3`, `3:4`, `16:9`. Keep other provider/portrait ratio types intact; do not shrink their enums. Current primary adapters support these four according to local code, but provider capabilities must still be validated at request construction.

## Deterministic ratio selection

For each candidate source ratio `s = numerator / denominator` and each viewport ratio `r = width / height`:

```typescript
const utilization = Math.min(s / r, r / s);
const mismatchLoss = 1 - utilization;
const cropLoss = viewport.fit === "cover" ? mismatchLoss : 0;
const unusedArea = viewport.fit === "contain" ? mismatchLoss : 0;
```

Minimize the maximum mismatchLoss across all viewports of the asset; ties within `1e-9` prefer lower mean mismatchLoss, then fixed order `1:1`, `4:3`, `3:4`, `16:9`. This makes results independent of caller candidate ordering. Reject empty viewport arrays, empty supported sets, NaN/infinite/zero/negative dimensions, and unsupported ratio values.

This is a geometric recommendation, not AI analysis of the subject. Subject/face/object saliency and automatic focal-point detection are out of scope. An intentional contain slot may have substantial unused area; do not change it to cover merely to fill space.

Expected baseline decisions:

| Layout/role                | Selected ratio | Geometric reason                                            |
| -------------------------- | -------------- | ----------------------------------------------------------- |
| Media Left hero            | 4:3            | Best among four supported ratios for 696 x 486              |
| Visual Card choice         | 4:3            | About 3.57% crop instead of 22.22% with square              |
| Pure Visual choice         | 1:1            | About 10.74% crop, versus about 15.97% for 3:4              |
| Split Versus visual choice | 16:9           | About 2.25% crop instead of 45.02% with square              |
| Verdict hero               | 16:9           | Best for 800 x 490; current 4:3 is not optimal              |
| Full Stack                 | No slot        | No image in its rendered presentation                       |
| Mystery hero               | 16:9           | Best standard ratio for its wide contain viewports; no crop |
| Clue hero                  | 16:9           | Best standard ratio for its wide contain viewport; no crop  |

These expectations follow observed current geometry. If fresh baseline measurements change a decision, record exact dimensions and policy output before editing. Small rounding drift is fine; a layout-shape change requires owner review, not silently rewriting expected tests.

## Recommended raster size, not provider payload size

Policy constants: sharpness multiplier `1.5`, pixel alignment `8`, no devicePixelRatio or Sandbox zoom multiplier.

For ratio pair `(n, d)`, obtain the source scale needed per viewport:

```typescript
const scale =
  viewport.fit === "cover" ? Math.max(viewport.width / n, viewport.height / d) : Math.min(viewport.width / n, viewport.height / d);
const requiredScale = 1.5 * Math.max(...perViewportScales);
const quantum = lcm(8 / gcd(8, n), 8 / gcd(8, d));
const alignedScale = Math.ceil(requiredScale / quantum) * quantum;
const recommended = { width: n * alignedScale, height: d * alignedScale };
```

Validate integer arithmetic overflow before returning dimensions. Do not silently cap to a too-small image. A downstream provider may use a supported larger bucket; a smaller result is evaluated under the actual-metadata policy below.

The three choice expectations are exactly `672 x 504`, `728 x 728`, and `1024 x 576`. These are recommended raster sizes for the current geometry, NOT arbitrary sizes sent to APIs.

Keep the legacy `getOptimalAssetDimensions()` and `resolveQuizLayoutAssetAspectRatio()` exports as compatibility adapters. For known active quiz slots they delegate to the new policy; they must not contain an independent per-layout ratio table. Existing callers lacking context can retain documented compatibility defaults, but Episode/Sandbox production paths must provide resolved layout/presentation/count and must not use those defaults. Mark those defaults in comments as compatibility behavior, not automatic sizing.

## Sample images and diagnostics

Build a sample specification from the recommendation's ratio and dimensions. Reuse `generateSampleImageSvg`/`generateSampleImageDataUri` for rendering, not the fixed ratio-to-size table as the authoritative source. Keep the general sample-image catalog for unrelated consumers.

Expose machine-readable sizing metadata on media wrappers or preview response diagnostics so tests can compare slot geometry, source ratio, and recommendation. Do not add every field as visible video text. A sample image must have natural dimensions matching its displayed dimension label. The inset safe-area outline must describe its actual bounds; correct existing inaccurate percent labels only in this generated specimen path.

For a centered cover crop, the visible source rectangle is computed from source and viewport ratios. Prompt framing should keep the subject within the intersection of all stable visible source rectangles with an additional 8% inset on each side of that intersection. For contain, use the full source with the same inset. State this as a prompt instruction, not a guarantee of model compliance. Persist/calculate the rule deterministically; do not hardcode a square subject_scale string.

## Persisted compatibility and identity

Keep `schema_version: 2`. Add an optional `sizing` field to `QuizAssetRequirementSchema`, inherited by resolved assets, with a Zod schema matching:

```typescript
type PersistedImageSizing = {
  policy_version: 1;
  layout_id: ResolvedQuizLayoutId;
  geometry_key: string;
  recommended_width: number;
  recommended_height: number;
};
```

Require positive bounded integers for dimensions, nonempty geometry keys, and validate any stored ratio against existing `aspect_ratio`. Optional means old files parse; missing metadata must not be treated as verified current sizing. `geometryKey` is a deterministic serialization of canvas, relevant viewport dimensions/fit, and framing policy; no timestamps, random IDs, labels, or provider secrets. It may be hashed at the server boundary.

Create `reconcileQuizAssetSizing(quiz, director, plan)` as a pure server function returning a new plan plus changes (`asset_id`, reason, previous/current sizing). Resolve effective layouts with the existing policy. Preserve subject, semantic_key, source identity, user content, and unrelated consistency fields. Change only sizing and ratio-dependent framing fields. Do not blindly replace an existing plan with `planQuizAssets()` and lose hand-authored prompt subjects.

Classify changes:

- Metadata-only: ratio/framing equivalent and existing source has enough pixels. Update through an explicit workflow, reuse media, no billing.
- Render-only: geometry/recommended bounds changed but ratio/framing remain compatible. Keep generated source; invalidate optimized copy and render identity.
- Generation-affecting: ratio/framing changed or source cannot meet basic display resolution. Mark affected generated assets stale; replacement requires the normal explicit generation/confirmation action.
- Explicit user-selected source: keep original path/bytes and selection. Show crop/quality warning; never overwrite or relabel actual dimensions as though generated for the new ratio.

Use separate source-generation identity and render-optimization identity. `assetFingerprint()` already includes ratio; include a stable ratio-dependent framing version/key, but do not put every geometry change into this hash and trigger needless paid regeneration. The render identity includes source fingerprint/content identity, target dimensions, fit/quality, and optimization policy version. An mtime-only skip is invalid when those inputs change.

The no-generation completeness check and the resolver must agree on what counts as reusable, including explicit images. An explicit mismatch warning must not cause an endless generate/complete/retry loop. Missing required media remains a blocker.

## Provider contract and actual metadata

At adapter request construction, make precedence explicit: per-asset requested ratio wins over a generic provider default. Existing user quality/resolution preferences remain effective. A contradictory explicit size override is either mapped to a compatible supported size or rejected with `image_request_size_conflict`; do not silently send a square size with a 16:9 prompt.

- GPTI2: use its existing `resolveImageDimensions` mapping. For example, 4:3 currently maps to 1024 x 768 and 16:9 to 1280 x 720 for its gpt-image-2 adapter. These are local adapter expectations, not a claim about every provider's model capabilities.
- ImgStudio: preserve `aspect_ratio` plus its model-aware `resolution`/`quality`. A `2K` preset is not an exact pixel dimension. Test its existing 1K-only model fallback too.
- ShopAiKey/custom: validate `size` and aspect together, including environment overrides. Its payload may express ratio through `size`; do not add unsupported fields to make every API look identical.
- Existing fallback adapters: forward the same requirement or return a typed unsupported-capability error. Never silently change ratio while retaining a success label. No new provider activation/routing work.

Decode returned bytes with existing Sharp at the provider/repository boundary, normalizing orientation. Record actual width/height separately from requested ratio/preset, using an optional `actual_dimensions: { width: number; height: number }` on resolved assets. Keep a sidecar for adapter request diagnostics if an existing metadata facility fits better; avoid duplicating secrets or huge prompts.

For newly generated assets, normalized ratio error must be <= 2%. Wrong-ratio output becomes `image_output_aspect_mismatch`, not a ready asset. Required invalid output blocks; optional invalid output warns. Reuse bounded retry/cancellation policy without multiplying nested retry counts or retrying deterministic size-conflict errors.

Minimum quality: below 1.0x source pixels needed for the visible display is a blocker for newly generated required assets; between 1.0x and 1.5x is a warning, accepted without automatic up-billing. Explicit user-selected low-resolution images warn and preserve selection. Do not upscale and then report the enlarged file as a high-resolution original.

Use one metadata validator in `resolveQuizAssets`, `isQuizAssetResolutionComplete`, and render preparation. The currently isolated PNG-header check with 18% ratio tolerance is not sufficient and adding another unused validator is not completion.
