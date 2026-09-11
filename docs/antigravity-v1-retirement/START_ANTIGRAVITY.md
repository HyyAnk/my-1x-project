# Antigravity Kickoff Prompt

Copy the prompt below as one message. Antigravity should read the handoff files before touching source.

```text
You are implementing the approved Quiz V1 retirement described in:

docs/antigravity-v1-retirement/README.md
docs/antigravity-v1-retirement/SPEC.md
docs/antigravity-v1-retirement/INVENTORY.md
docs/antigravity-v1-retirement/DATA_RUNBOOK.md
docs/antigravity-v1-retirement/EXECUTION_PLAN.md
docs/antigravity-v1-retirement/TEST_MATRIX.md
docs/antigravity-v1-retirement/ACCEPTANCE.md

Read those files in that order. The repository has pre-existing uncommitted changes. Preserve them: do not reset, checkout, broadly stage, or overwrite unrelated files. The codebase is English-only. Use CodeGraph first while .codegraph exists, then re-read the current on-disk source immediately before each edit.

Objective: make quiz video production V2-only. Delete the V1 scene renderer and its fallback, remove the redundant V2 wrappers and registry alias, remove the internal completeQuizV2/legacy-skipped state, and remove the USE_LEGACY_QUIZ_PIPELINE branch and its legacy narrative helpers. Keep all eight production layouts, preview baseline, Candy Arcade composition, mascot/intro/outro/transition/asset behavior, quiz-native artifact synthesis, stored-video readers, task cancellation, progress, and cleanup.

Non-negotiable contracts:

1. All five validated files are required: quiz-v2.json, director-plan.json, asset-plan.json, voice-plan.json, timeline.json.
2. Missing any file fails with RepositoryError code QUIZ_V2_REQUIRED, lists canonical missing filenames, and gives an English recovery action. This applies even if episode.video_asset_path is present.
3. Malformed artifact and reader errors retain their existing error identity. Do not catch and relabel them.
4. The completeness guard runs before style pinning, render-root creation, narration copy, asset preparation, soundtrack preparation, composition writes, manifest writes, or video writes.
5. Production calls buildCandyArcadeCompositionBundle directly. Preserve every field currently forwarded by HyperframesRenderer.prepare and every returned PreparedQuizRender field.
6. New manifests are always schema/version 2 with a real preflight result. Remove legacy_skipped; do not rewrite historical manifests.
7. runPipelineTask always uses runQuizNativePipeline, then runQuizV2Pipeline, then the existing video child. Setting USE_LEGACY_QUIZ_PIPELINE=true must not submit legacy child tasks.
8. Keep synthesizeAllLegacyArtifacts because quiz-native generation still calls it. Do not delete generic helpers with other consumers.
9. Do not refactor layouts, add an engine factory, add a feature flag, migrate live data, change dependencies, or update snapshots to hide regressions.

Work task-by-task from EXECUTION_PLAN.md. Write failing tests before implementation for each new boundary, run the focused command at the end of each task, and append commands/results to execution/EVIDENCE.md. Update execution/STATUS.md only with evidence-backed states. If a video-bearing episode is missing V2 artifacts, stop and report the IDs; do not generate or delete data.

Before final handoff, run the complete TEST_MATRIX.md command sequence, perform an isolated real V2 render with existing local fixtures/media, inspect root and mounted composition files plus the MP4 and manifest, and complete every item in ACCEPTANCE.md. Report exact commands, exit codes, test counts, real-render measurements, remaining unrelated failures, and any deviation from the spec. Do not claim completion without evidence.
```
