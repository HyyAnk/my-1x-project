# Test and Verification Matrix

The matrix is a gate. A green unit test does not replace a real composition check or render. Run commands from the repository root unless a command specifies a package.

| ID | Behavior | Test or command | Required evidence |
| --- | --- | --- | --- |
| A01 | All five artifacts are required | `quizRenderArtifacts.test.ts` | Complete object; five individual missing cases |
| A02 | Missing artifact is not bypassed by an existing video | `quizV2OnlyCompositionPreparation.test.ts` or extended style-boundary test | `QUIZ_V2_REQUIRED`; no render-root/HTML/media/manifest write |
| A03 | Malformed and reader errors retain identity | `quizRenderArtifacts.test.ts` | `QUIZ_ARTIFACT_INVALID` or original error, not relabeled |
| A04 | All reads settle before success | `quizRenderArtifacts.test.ts` | Delayed reader test does not resolve early |
| A05 | V2 adapter preserves fields | `videoRunner.test.ts`, `videoRunnerStyleBoundary.test.ts` | Root and mounted HTML, style, mascot/transition fields |
| A06 | No V1 symbols in active source | `quizV1RetirementArchitecture.test.ts` plus `rg` | Zero active matches |
| A07 | Manifest is V2-only | `renderManifestWriter.test.ts` | Version 2 literals, passed preflight, preserved metadata |
| A08 | Layout registry remains complete | `quizLayoutRegistry.test.ts`, `quizLayoutCapabilities.test.ts` | Eight landscape layouts plus baseline where expected |
| A09 | Native pipeline remains default and only | `quizProductionPipelineFastPath.test.ts` | Old flag true submits no legacy child tasks |
| A10 | Quiz-native synthesis remains | `quizNativeFlowEndToEnd.test.ts` | Scenes and companion artifacts still generated |
| A11 | Cancellation and slot cleanup | `videoCancellation.test.ts`, `videoRunnerCancellationLifecycle.test.ts`, `renderConcurrencyLimiter.test.ts` | No late completion; slot/controller released |
| A12 | Existing video remains on failure | integration fixture | Video bytes and metadata unchanged |
| A13 | Styles/layout/transitions remain | `quizRenderStyleContract.test.ts`, `quizPreviewProductionStyleParity.test.ts`, `transitionRenderArtifacts.test.ts` | Existing assertions pass |
| A14 | Full repository correctness | `pnpm typecheck`, `pnpm test`, `pnpm run audit`, `pnpm lint`, `pnpm run format:check` | Exit code 0 for each |
| A15 | Real render integrity | isolated local V2 render + HyperFrames check/render | MP4, duration, dimensions, audio, files, manifest |
| A16 | Documentation has no stale active claim | docs search and review | No instructions to use V1 or enable legacy flag |

## Required command sequence

```powershell
pnpm --filter @studio/server exec vitest run test/quizRenderArtifacts.test.ts test/videoRunner.test.ts test/videoRunnerStyleBoundary.test.ts test/quizV1RetirementArchitecture.test.ts test/renderManifestWriter.test.ts
pnpm --filter @studio/server exec vitest run test/quizProductionPipelineFastPath.test.ts test/quizNativeFlowEndToEnd.test.ts test/quizParallelAssetsVoice.test.ts test/videoCancellation.test.ts test/videoRunnerCancellationLifecycle.test.ts test/renderConcurrencyLimiter.test.ts
pnpm --filter @studio/server exec vitest run test/quizLayoutRegistry.test.ts test/quizLayoutCapabilities.test.ts test/quizRenderStyleContract.test.ts test/quizPreviewProductionStyleParity.test.ts test/transitionRenderArtifacts.test.ts
pnpm typecheck
pnpm test
pnpm run audit
pnpm lint
pnpm run format:check
```

## Failure policy

- A focused failure blocks the next task until fixed and re-run.
- A pre-existing unrelated failure is recorded with command, file, and exit code; it is not hidden or fixed opportunistically.
- A visual or real-render difference blocks acceptance even if TypeScript and unit tests pass.
- Do not update snapshots to make a failing retirement test pass. First prove whether the HTML/content difference is intentional and within the output-preservation contract.
- Do not use `--passWithNoTests`, `--no-verify`, `--force`, or a broad test exclusion.

## Output inspection checklist

For the isolated real render, inspect root `index.html`, all `compositions/*.html`, and the persisted `render-manifest.json`. Assert:

```text
root data-composition-id = quiz-v2-candy-arcade
quiz_engine_version = 2
schema_version = 2
preflight.status != legacy_skipped
composition files count > 0
video size > 0
video duration > 0
video width = 1920 and height = 1080
video has video and audio streams
no active legacy child task submission
```
