# Phase 3 Specification: Per-Question Uniform Random Selector Engine

## Objective
Build a robust, question-level uniform random selector engine that randomly picks among ALL available variants (both static 3D images and video animations) in a style for each question clip, eliminating rigid round-robin modulo and preventing consecutive repeats when multiple variants are available.

## Architectural Requirements
1. **Per-Question Randomness (Uniform Distribution):**
   - For a given style and state (`thinking` or `celebrate`), filter variants with `isMascotVariantAvailable`.
   - If available count is 0, return `null`.
   - If available count is 1, return that single variant.
   - If available count > 1, pick uniformly at random across all available variants.
2. **Consecutive Repeat Avoidance:**
   - If `previousSlotIndex` is provided and candidate variant matches `previousSlotIndex` (and available count >= 2):
     - Advance or choose another candidate from available variants so question $Q_k$ never repeats question $Q_{k-1}$'s variant.
3. **Deterministic Seeding for Video Rendering:**
   - Video rendering requires zero frame-to-frame jumping (HyperFrames seeking constraint).
   - Random selection must be seeded deterministically by `fnv1a32(episodeId + ":" + questionId + ":" + state + ":" + styleId)` so every frame of that question renders the identical chosen variant.
   - For ad-hoc preview/sandbox without fixed questionId, generate or pass a stable question seed.
4. **Implementation Seams:**
   - `packages/shared/src/mascot/animation/animationVariantSelector.ts`: upgrade `selectAnimationVariant` or add `selectQuestionVariant`.
   - `apps/server/src/quiz/render/mascot/productionMascotStateAdapter.ts`: integrate the upgraded selector in `selectVariantForQuestionState` and `adaptMascotForQuestion`.
5. **Unit Tests:**
   - Create `packages/shared/test/questionVariantSelector.test.ts`:
     - Test uniform distribution across 100 iterations (each available variant receives selections).
     - Test repeat avoidance: across 20 sequential questions, no adjacent questions share the same variant.
     - Test stability: same inputs produce identical selections.

## Acceptance Criteria
- [ ] Selector supports both video and static variants uniformly.
- [ ] Repeat avoidance active when >= 2 variants exist.
- [ ] Unit tests pass with 100% pass rate.
