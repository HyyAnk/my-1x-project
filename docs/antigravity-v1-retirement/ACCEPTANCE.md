# Acceptance Checklist

The task is accepted only when every item is checked and linked to evidence in `execution/EVIDENCE.md`.

## Runtime

- [x] `buildComposition.ts` is deleted and no active source/test imports V1 symbols.
- [x] `HyperframesRenderer` calls `buildCandyArcadeCompositionBundle` directly and preserves all input/output fields.
- [x] Rendering requires all five V2 artifacts regardless of `video_asset_path`.
- [x] Missing artifact failure is `QUIZ_V2_REQUIRED`, lists missing canonical filenames, and gives an English recovery action.
- [x] Malformed artifacts and reader errors retain their existing error identity.
- [x] Missing-artifact failure occurs before style pin, render-root creation, narration copy, asset prep, soundtrack prep, composition writes, manifest writes, and video writes.
- [x] Existing stored videos and historical manifests remain readable and untouched.
- [x] New manifests are version 2 with an actual preflight result and no `legacy_skipped` state.
- [x] `completeQuizV2` is absent from internal contexts and persistence options.
- [x] `QUIZ_LAYOUT_REGISTRY` is removed only if consumer search is zero; all actual layout renderers remain.

## Pipeline

- [x] `runLegacyPipeline` and `executeShotPlanSequences` are deleted.
- [x] `runPipelineTask` has no environment branch and always invokes the native quiz path.
- [x] `USE_LEGACY_QUIZ_PIPELINE=true` does not submit legacy child tasks.
- [x] `runQuizV2Pipeline`, task progress, child tracking, cancellation, stage timing, retries, and finish states remain correct.
- [x] `synthesizeAllLegacyArtifacts` remains because quiz-native generation still calls it.

## Output and compatibility

- [x] All eight production layouts and preview `baseline` still pass registry/capability tests.
- [x] Root and mounted V2 composition HTML preserve fixed-input content/timing/style behavior.
- [x] Mascot, intro/outro, BGM/SFX, transitions, asset fallback metadata, and brand marks remain covered.
- [x] A real isolated V2 render produces a non-empty 1920x1080 MP4 with audio and plausible duration.
- [x] Render-root intermediate cleanup still runs after successful persistence.
- [x] No Short Reel, sandbox preview, UI, schema, dependency, or unrelated narrative subsystem was changed.

## Quality and process

- [x] Focused tests pass after each task.
- [x] `pnpm typecheck`, `pnpm test`, `pnpm run audit`, `pnpm lint`, and `pnpm run format:check` pass, or every unrelated pre-existing failure is recorded.
- [x] Final legacy-name searches show no active code references and docs no longer instruct use of retired paths.
- [x] No live files were deleted, migrated, or rewritten.
- [x] Diff contains only scoped code, tests, docs, and execution evidence; pre-existing changes remain untouched.
- [x] No commit, push, dependency upgrade, hosted render, or deployment was performed without owner authorization.
