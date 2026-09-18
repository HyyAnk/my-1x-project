# Phase 10 Evidence: Image Prompt, Request and Cache Propagation

## 1. Overview
- **Phase**: 10
- **Status**: Completed
- **Requirements Addressed**: R12, R13
- **Primary Objective**: Align image asset planning, prompt generation, provider requests, dimension verification, and caching/fingerprinting with the layout geometry specifications (Media Left 4:3, Visual Card 1:1, Pure Visual 3:4, Split Versus 16:9, Verdict 4:3, Mystery Reveal 16:9, and Full Stack List 0 assets).

---

## 2. Implementation Summary

### 2.1 Asset Planner (`apps/server/src/quiz/assets/assetPlanner.ts`)
- Configured layout-aware asset quantity constraints:
  - **Full Stack List**: Plans exactly 0 hero assets and 0 choice assets.
  - **Mystery Reveal**: Plans exactly 1 hero asset (revealed subject) and 0 choice assets.
- Resolved aspect ratio mapping matching target geometries:
  - `visual_cards_three`: 1:1 (648x648)
  - `visual_cards_three_pure`: 3:4 (648x864)
  - `split_versus_two`: 16:9 (1152x648)
  - `verdict_statement`: 4:3 (1216x912)
  - `mystery_single_reveal`: 16:9 (1408x792)
  - `media_left_three`: 4:3 (1120x840)
- Updated consistency group instructions: replaced obsolete 68-72% scaling constraints with full-silhouette card-fill guidance while maintaining lighting/palette harmony.

### 2.2 Prompt Framing Rules & Compiler (`apps/server/src/quiz/assets/promptFramingRules.ts`, `promptCompiler.ts`)
- Added layout-aware safe margins to `framingRules(aspectRatio, options?: { layoutId?: string })`:
  - **Media Left (4:3)**: 8% horizontal, 6% vertical safe margin.
  - **Visual Choices Three (1:1)**: 6% horizontal, 10% vertical safe margin.
  - **Visual Choices Three Pure (3:4)**: 6% horizontal, top 8%, bottom 14% safe margin (protecting lower silhouette from floating choice badge).
  - **Split Versus Two (16:9)**: 12% horizontal, 6% vertical safe margin.
  - **Verdict (4:3)**: 6% horizontal, 10% vertical safe margin.
  - **Mystery Reveal (16:9)**: 6% all edges with complete silhouette guarantee.
- Updated `compileQuizAssetPrompt` to pass `contract.layoutId` down to framing rules.
- Bumped prompt cache version to `${contract.id}-v5-layout-framing`.

### 2.3 Cache Fingerprinting (`apps/server/src/quiz/assets/assetFingerprint.ts`)
- Added `geometry_key` and `layout_id` to the hashed fingerprint payload.
- Incremented `generationVersion` to `"v3-geom2"`.
- Verified that two layouts sharing identical aspect ratio (e.g., `media_left_three` vs `verdict_statement` both at 4:3) generate distinct fingerprints and cache keys.

### 2.4 Dimension Resolution & Strict Error Handling (`apps/server/src/providers/gpti2Dimensions.ts`, `imgstudio/dimensions.ts`)
- Replaced fallback-to-square/16:9 behavior with explicit `RepositoryError` on unsupported ratios.
- Added 3:4 resolution definitions (`768x1024` for GPT-4o, `1080x1440` for Nano Banana).
- Added explicit validation to prevent conflicting size overrides (`image_request_size_conflict`).

### 2.5 Provider Request Propagation & Dimension Validation
- **GPTi2 Generator** (`apps/server/src/providers/gpti2/generator.ts`): Propagates resolved `aspect_ratio` into `/v1/images/generations` request payload.
- **Image Dimension Validator** (`apps/server/src/quiz/assets/imageDimensionValidator.ts`):
  - Decodes PNG IHDR dimensions directly from byte headers.
  - Validates returned image aspect ratio against requested ratio within a 5% tolerance window.
  - Throws `IMAGE_RATIO_MISMATCH` if returned dimensions violate requested aspect ratio.
- **Provider Adapters** (`apps/server/src/providers/gpti2/provider.ts`, `apps/server/src/providers/imgstudio/provider.ts`):
  - Calls `validateReturnedImageDimensions` prior to committing generated image bytes.

---

## 3. Automated Verification & Test Results

### 3.1 Unit Test Suite (`apps/server/test/imagePipelinePhase10.test.ts`)
- **25/25 tests passing**:
  - Zero assets for Full Stack List questions.
  - Exactly 1 hero asset and 0 choice assets for Mystery Reveal questions.
  - Correct aspect ratios assigned per layout (1:1, 3:4, 16:9, 4:3).
  - Layout-specific safe region insets included in compiled prompt output.
  - Prompt compiler cache version updated to `v5-layout-framing`.
  - Same-ratio distinct-geometry fingerprint differentiation (`media_left_three` vs `verdict_statement`).
  - Cache key stability for identical inputs.
  - Unsupported aspect ratio rejection in GPTi2 and ImgStudio dimension resolvers.
  - Explicit size override conflict rejection.
  - PNG IHDR decoding and aspect ratio tolerance enforcement.
  - Dimension mismatch rejection (`IMAGE_RATIO_MISMATCH`).

```
 PASS test/imagePipelinePhase10.test.ts (25 tests) 10ms
 Test Files  1 passed (1)
      Tests  25 passed (25)
   Duration  1.56s
```

### 3.2 Regression Suite Across Server & Playwright Browser Tests
- Server test suite (`imagePipelinePhase10.test.ts`, `mysteryRuntimePhase09.test.ts`, `mysteryDataPhase08.test.ts`): **68/68 passed**.
- Browser layout test suite (`quizFrameAnchors.browser.test.ts`): **55/55 passed**.
- Server typecheck (`pnpm --filter @studio/server typecheck`): **0 errors**.
- Web typecheck (`pnpm --filter @studio/web typecheck`): **0 errors**.

---

## 4. Exit Gate Confirmation
- [x] All six expected ratios reach actual mocked provider request objects.
- [x] Returned-size mismatch, provider error and safe retry are covered.
- [x] New cache identity changes when geometry/framing changes even if the ratio does not.
- [x] No old-image migration or accidental new Full Stack/Mystery distractor assets.
- [x] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [x] Diff reviewed for scope, responsibility boundaries and preserved user changes.
