# Evidence Ledger

## Planning evidence

| Date | Check | Result |
| --- | --- | --- |
| 2026-09-11 | Focused server tests: video runner, pipeline, native flow, layout registry, artifact pruning | 7 files, 28 tests passed |
| 2026-09-11 | Configured storage inventory | 1 episode found; five V2 artifacts parsed successfully |
| 2026-09-11 | Stored render manifest inspection | HyperFrames, quiz engine version 2, landscape 1920x1080 |

## Implementation evidence

Antigravity must append one row per command, including working directory, command, exit code, test count or key output, and whether the result is scoped to this change. Do not paste secrets, absolute user paths, full quiz text, or binary dumps.

| Date | Task | Command or inspection | Exit code | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-09-11 | Task 1 | `git branch --show-current` | 0 | Branch `main` | Baseline verification |
| 2026-09-11 | Task 1 | `rg` discovery searches for retirement symbols & pipeline flags | 0 | Matches verified against INVENTORY.md | Active symbols inventoried |
| 2026-09-11 | Task 1 | Read-only storage inventory via `scratch/inventory_storage.ts` | 0 | 2 channels, 1 episode (`ep_4dc807da5f174c36`), video=true, 5/5 V2 artifacts valid, manifest engine=hyperframes v2, 0 missing V2 | Non-destructive inventory |
| 2026-09-11 | Task 1 | `pnpm --filter @studio/server exec vitest run test/videoRunner.test.ts test/videoRunnerStyleBoundary.test.ts test/quizProductionPipelineFastPath.test.ts test/quizNativeFlowEndToEnd.test.ts test/quizPipeline.test.ts test/quizLayoutRegistry.test.ts test/artifactRetentionPruner.test.ts` | 0 | 7 files, 28 tests passed (Duration 3.79s) | Baseline focused test suite passes |
| 2026-09-11 | Task 2 | `pnpm --filter @studio/server exec vitest run test/quizRenderArtifacts.test.ts test/quizV2OnlyCompositionPreparation.test.ts test/videoRunnerStyleBoundary.test.ts test/videoRunnerCancellationLifecycle.test.ts test/renderConcurrencyLimiter.test.ts` | 0 | 5 files, 27 tests passed (Duration 3.16s) | Task 2 required V2 artifact boundary implemented & verified |
| 2026-09-11 | Task 3 | `pnpm --filter @studio/server exec vitest run test/videoRunner.test.ts test/quizPipeline.test.ts test/quizNativeFlowEndToEnd.test.ts test/quizRenderStyleContract.test.ts test/quizPreviewProductionStyleParity.test.ts` | 0 | 5 files, 16 tests passed (Duration 4.00s) | Task 3 V2 composition boundary canonical: buildComposition.ts deleted, HyperframesRenderer & tests migrated |
| 2026-09-11 | Task 4 | `pnpm --filter @studio/server exec vitest run test/renderManifestWriter.test.ts test/artifactRetentionPruner.test.ts test/transitionRenderArtifacts.test.ts test/quizLayoutRegistry.test.ts test/quizLayoutCapabilities.test.ts` | 0 | 5 files, 27 tests passed (Duration 3.49s) | Task 4 redundant state and aliases removed: completeQuizV2 eliminated, V2-only manifest written, QUIZ_LAYOUT_REGISTRY deleted |
| 2026-09-11 | Task 5 | `pnpm --filter @studio/server exec vitest run test/quizProductionPipelineFastPath.test.ts test/quizParallelAssetsVoice.test.ts test/quizNativeFlowEndToEnd.test.ts test/videoCancellation.test.ts test/videoRunnerCancellationLifecycle.test.ts` | 0 | 5 files, 15 tests passed (Duration 2.96s) | Task 5 retired legacy production pipeline: removed executeShotPlanSequences, runLegacyPipeline, and USE_LEGACY_QUIZ_PIPELINE branch; verified flag ignored in tests; updated docs |
| 2026-09-11 | Task 6 | `pnpm --filter @studio/server exec vitest run test/quizV1RetirementArchitecture.test.ts` & `pnpm exec prettier --check <touched-files>` | 0 | 1 file, 9 tests passed (Duration 352ms); Prettier check passed | Task 6 updated stale docs, added architecture tripwire test guarding against retired V1 files/symbols, and formatted touched files |
| 2026-09-11 | Task 7 | `pnpm typecheck` | 0 | All packages (`@studio/shared`, `@studio/server`, `@studio/web`) typecheck cleanly | Workspace typecheck passed |
| 2026-09-11 | Task 7 | `pnpm run audit` | 0 | Choice count audit (0 violations) and quiz-only audit (0 violations) passed | Workspace audits passed |
| 2026-09-11 | Task 7 | Retirement test suite: `pnpm --filter @studio/server exec vitest run test/quizRenderArtifacts.test.ts test/quizV2OnlyCompositionPreparation.test.ts test/videoRunner.test.ts test/quizPipeline.test.ts test/quizNativeFlowEndToEnd.test.ts test/renderManifestWriter.test.ts test/artifactRetentionPruner.test.ts test/quizProductionPipelineFastPath.test.ts test/quizV1RetirementArchitecture.test.ts` | 0 | 9 files, 44 tests passed (Duration 4.14s) | All retirement unit, integration, and architecture tests pass |
| 2026-09-11 | Task 7 | Real local V2 render and missing-artifact verification script in isolated temporary root | 0 | Real MP4 rendered (63.78 MB, 1920x1080, 91.5s, audio present), V2 manifest (engine=hyperframes, quiz_engine_version=2, schema_version=2, preflight=passed); missing artifact fails with QUIZ_V2_REQUIRED before side effects | End-to-end V2 render & guard contract verified |

## Real-render evidence

| Metric | Measured Value | Validation Note |
| --- | --- | --- |
| Isolated fixture | Episode `ep_4dc807da5f174c36` (slug `arcade-game-secrets-true-or-false-gaming-showdown`), Channel `ch_875916a8fd10411f` (slug `novy`) | Cloned into isolated temporary storage root (`os.tmpdir()`) |
| HyperFrames version | `0.8.17` | Pinned project dependency |
| Render command | `executeHyperframesRender` (`hyperframes.mjs render <renderRoot> --output <outputPath> --fps 30 --quality high --workers 2 --strict --json`) | Executed via project runtime execution contract |
| Output MP4 size | `63,785,093 bytes (60.83 MB)` | Non-zero, fully rendered video file |
| Output duration | `91.5 seconds` | 2,745 frames at 30 fps (rendered in 76 seconds) |
| Output dimensions | `1920 x 1080` | Confirmed via `ffprobe` video stream |
| Audio stream | Present (stereo) | Confirmed via `ffprobe` audio stream; 0 blocker issues in post-render QA probe |
| Manifest version fields | `quiz_engine_version: 2`, `schema_version: 2`, `engine: "hyperframes"` | Literal V2 values |
| Preflight assessment | `status: "passed"`, `score: 97`, `blockers: 0` | Real preflight result; zero `legacy_skipped` occurrences |
| Mounted composition files | 7 mounted HTML compositions | `candy-intro.html`, `candy-transition-27200.html`, `candy-transition-52633.html`, `candy-transition-78667.html`, `quiz-q1-2600.html`, `quiz-q2-28044.html`, `quiz-q3-53488.html` |
| Intermediate pruning | Verified | `pruneRenderRootIntermediateFiles` cleanly removed temporary render files |
| Missing-artifact verification | Throws `QUIZ_V2_REQUIRED` | With missing `timeline.json`, fails with `code: "QUIZ_V2_REQUIRED"` and English recovery message; leaves existing video file untouched, creates no render root, and writes no manifest |
| Old flag behavior | Ignored | With `process.env.USE_LEGACY_QUIZ_PIPELINE = "true"`, still throws `QUIZ_V2_REQUIRED` with zero side effects |

## Exceptions

The following pre-existing, unrelated failures existed in the working tree prior to this packet and were preserved pursuant to Rule 10:
1. `pnpm run format:check` (Exit code 1): 84 files across `apps/web` and `packages/shared` have pre-existing unformatted code. All 18 files created or modified by this retirement pass 100% formatted under `pnpm exec prettier --check`.
2. `pnpm lint` (Exit code 1): 771 pre-existing linter errors in untracked/uncommitted feature files (`apps/web/src/features/transitions/`, `packages/shared/test/`, `scripts/validateKnowledgeEntities.js`). All files touched or created by this retirement pass with 0 lint errors under `pnpm exec eslint`.
3. `pnpm test` (Exit code 1): 2 test files fail due to uncommitted SVG encoding changes in `packages/shared/src/sampleImages.ts` (`quizScenePipeline.test.ts` and `quizSceneModel.test.ts`). All 9 retirement test suites pass with exit code 0 (44/44 tests).
