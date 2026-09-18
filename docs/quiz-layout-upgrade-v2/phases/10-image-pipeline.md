# Phase 10: Image prompt, request and cache propagation

Status: not started

## Objective

Make every fresh asset use the ratio and framing actually required by its enlarged viewport.

Requirements: R12, R13.

## Dependencies and required reading

Phase 09 gate passed; read its evidence before editing.

- [specs/IMAGE-GENERATION.md](../specs/IMAGE-GENERATION.md)
- [data/layout-targets.json](../data/layout-targets.json)
- [FILE-MAP.md](../FILE-MAP.md)

## Concrete implementation steps

1. Wire resolved shared geometry through planQuizAssets for hero and choice assets. Full Stack requests none; Mystery requests one hero and no option-image set.

2. Pass layout-aware safe-region context to promptFramingRules and compileQuizAssetPrompt. Preserve child-safe visual style and identifying marks.

3. Replace conflicting generic generous-margin or 68-72%-scale instructions when they undermine the approved large-image framing. Keep option-set scale/lighting consistent.

4. Write the chosen ratio both into prompt output framing and provider request parameters. Verify sanitizers/compactors do not remove the critical instructions.

5. Keep recommended raster sizes provider-independent. Adapters select an equal-ratio supported resolution or report unsupported input; never silently choose square.

6. Decode returned dimensions and check ratio/quality before committing the asset. Preserve intended transparent canvas during matting.

7. Include geometry/framing revision in fresh request fingerprints and prompt cache version. Test same-ratio changed-geometry requests do not reuse old framing.

8. Test through existing generation adapters using mocks. Do not spend provider credits, rewrite old assets or run blanket regeneration without separate authorization.

## File ownership

- `apps/server/src/quiz/assets/assetPlanner.ts` (existing)
- `apps/server/src/quiz/assets/promptCompiler.ts` (existing)
- `apps/server/src/quiz/assets/promptFramingRules.ts` (existing)
- `apps/server/src/quiz/assets/assetFingerprint.ts` (existing)
- `apps/server/src/quiz/assets/ensureQuizAssetSizing.ts` (existing)
- `apps/server/src/quiz/assets/reconcileQuizAssetSizing.ts` (existing)
- `packages/shared/src/schemas/quiz/quizAssets.ts` (existing)
- `apps/server/src/tasks/imageRunner.ts` (existing)
- `apps/server/src/providers/gpti2Dimensions.ts` (existing)
- `apps/server/src/providers/gpti2/generator.ts` (existing)
- `apps/server/src/providers/gpti2/provider.ts` (existing)
- `apps/server/src/providers/imgstudio/provider.ts` (existing)
- `apps/server/src/providers/imgstudio/types.ts` (existing)
- `apps/server/src/providers/codexImage.ts` (existing)

This is the phase's primary ownership set. Shared integration points in FILE-MAP.md may require small changes; register any newly discovered files before editing. Do not touch unrelated files merely because they appear in the overall inventory.

## Verification and acceptance

- [ ] All six expected ratios reach actual mocked provider request objects.
- [ ] Returned-size mismatch, provider error and safe retry are covered.
- [ ] New cache identity changes when geometry/framing changes even if the ratio does not.
- [ ] No old-image migration or accidental new Full Stack/Mystery distractor assets.
- [ ] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [ ] Updated primary workflow rerun; screenshots/logs point to the current build.
- [ ] Diff reviewed for scope, responsibility boundaries and preserved user changes.

## Exit gate

Asset metadata, prompts, provider requests and rendered slots agree on ratio and framing.

## Deliverables

Prompt/request/fingerprint updates and provider-contract tests, evidence/phase-10.md.

## Recovery and handoff

If a check fails, preserve inputs and evidence, isolate the defect at its owning boundary and rerun. Do not globally revert the worktree, weaken expected geometry, or mark a skipped check as passed. Document blockers and the exact resume step in PROGRESS.md. Use the phase report template and keep all implementation artifacts in English.
