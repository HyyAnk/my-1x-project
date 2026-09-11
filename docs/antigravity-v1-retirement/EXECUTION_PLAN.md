# V1 Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make quiz video production V2-only, delete the obsolete V1 renderer and legacy narrative branch, and prove output, error, cleanup, and task-flow behavior remain correct.

**Architecture:** The five V2 artifact reads become a required, typed boundary before any render preparation side effect. Production composition continues through `HyperframesRenderer` and `buildCandyArcadeCompositionBundle`; the outer task pipeline always runs `runQuizNativePipeline` and `runQuizV2Pipeline`. No engine selector or compatibility adapter is added.

**Tech Stack:** TypeScript, Node.js, Zod, Vitest, pnpm workspaces, HyperFrames 0.8.17, existing repository and task abstractions.

**Spec:** `docs/antigravity-v1-retirement/SPEC.md`

## Global Constraints

- Preserve all pre-existing working-tree changes and re-read current files before editing.
- English-only repository files, comments, tests, errors, and docs.
- No production dependencies, lockfile changes, schema-version migrations, live-data mutation, provider calls, or broad refactors.
- Keep all eight production layouts, preview baseline, mascot, intro/outro, transition, asset fallback, Short Reel, and stored-video readers.
- Never use `buildQuizComposition`, `buildQuizV2Composition`, `QuizV2CompositionInput`, `completeQuizV2`, `runLegacyPipeline`, `executeShotPlanSequences`, or `USE_LEGACY_QUIZ_PIPELINE` in active implementation after the relevant step.
- Run each task's focused test before moving to the next task. Do not claim completion without the final gates in `TEST_MATRIX.md`.

---

## Task 1: Capture a repository and data baseline

**Files:**
- Read: `INVENTORY.md`, `DATA_RUNBOOK.md`, `apps/server/src/repository/quiz/quizPlanArtifacts.ts`, `apps/server/src/tasks/video/videoCompositionPreparer.ts`
- Test: no source changes; record command output in `execution/EVIDENCE.md`

**Interfaces:** No code contract changes. The baseline establishes the current consumer set and storage safety facts.

- [ ] **Step 1: Record repository state**

Run from the repository root:

```powershell
git status --short
git branch --show-current
rg -n '\bbuildQuizComposition\b|\bbuildQuizV2Composition\b|\bbuildQuizV2CompositionBundle\b|\bQuizV2CompositionInput\b|\bQUIZ_LAYOUT_REGISTRY\b|\bcompleteQuizV2\b' apps packages scripts -g '*.ts' -g '*.tsx' -g '*.mjs' -g '!dist' -g '!node_modules'
rg -n 'USE_LEGACY_QUIZ_PIPELINE|runLegacyPipeline|executeShotPlanSequences' apps packages scripts docs -g '*.ts' -g '*.tsx' -g '*.md' -g '*.mjs' -g '!dist' -g '!node_modules'
```

- [ ] **Step 2: Inventory configured storage read-only**

Use the configured storage path and the five repository filenames. Print timestamp, `[INFO]`, `[STEP:inventory]`, episode ID, and counts only. Parse with the same shared schemas through a temporary `tsx` process; do not write JSON or include question content in the log. If any video-bearing episode lacks a V2 artifact, stop and report it to the owner before Task 2.

- [ ] **Step 3: Run the focused baseline**

```powershell
pnpm --filter @studio/server exec vitest run test/videoRunner.test.ts test/videoRunnerStyleBoundary.test.ts test/quizProductionPipelineFastPath.test.ts test/quizNativeFlowEndToEnd.test.ts test/quizPipeline.test.ts test/quizLayoutRegistry.test.ts test/artifactRetentionPruner.test.ts
```

Record the exit code, test count, and any pre-existing failure. Do not update snapshots.

## Task 2: Add the required V2 artifact boundary

**Files:**
- Create: `apps/server/src/tasks/video/quizRenderArtifacts.types.ts`
- Create: `apps/server/src/tasks/video/quizRenderArtifacts.ts`
- Create: `apps/server/test/quizRenderArtifacts.test.ts`
- Modify: `apps/server/src/tasks/video/videoCompositionPreparer.ts`

**Interfaces:**
- Consumes: repository methods `readQuiz`, `readDirectorPlan`, `readAssetPlan`, `readVoicePlan`, `readQuizTimeline`
- Produces: `RequiredQuizRenderArtifacts`, `QuizRenderArtifactRepository`, and `loadRequiredQuizRenderArtifacts(repository, channelId, episodeId)`

- [ ] **Step 1: Write the contract test first**

Use a typed fake repository whose five readers are `vi.fn()` functions. Cover: all present returns a non-null object with the same five properties; each of the five missing cases rejects with `RepositoryError` code `QUIZ_V2_REQUIRED` and names the missing filename; a rejected reader propagates its original error; a delayed reader prevents the result until all five promises settle. Assert no `hasExistingVideo` argument exists in the call contract.

The expected missing error shape is:

```ts
new RepositoryError(
  `Quiz V2 artifacts are required before rendering. Missing: ${missing.join(", ")}. Run the quiz-native generation stages and retry.`,
  "QUIZ_V2_REQUIRED",
)
```

Sort `missing` in canonical filename order. The helper must never catch a `RepositoryError` from a reader and relabel it.

- [ ] **Step 2: Add the narrow types**

In `quizRenderArtifacts.types.ts`, define a type-only reader boundary and a non-null result. Use the repository method return types rather than `unknown` or `any`:

```ts
import type { RepositoryService } from "../../repository.js";

export type QuizRenderArtifactRepository = Pick<
  RepositoryService,
  "readQuiz" | "readDirectorPlan" | "readAssetPlan" | "readVoicePlan" | "readQuizTimeline"
>;

export type RequiredQuizRenderArtifacts = {
  quiz: NonNullable<Awaited<ReturnType<RepositoryService["readQuiz"]>>>;
  director: NonNullable<Awaited<ReturnType<RepositoryService["readDirectorPlan"]>>>;
  assetPlan: NonNullable<Awaited<ReturnType<RepositoryService["readAssetPlan"]>>>;
  voicePlan: NonNullable<Awaited<ReturnType<RepositoryService["readVoicePlan"]>>>;
  timeline: NonNullable<Awaited<ReturnType<RepositoryService["readQuizTimeline"]>>>;
};
```

- [ ] **Step 3: Implement the loader**

Read all five in `Promise.all`, map them to canonical names, collect null/undefined results, and throw only for incompleteness. Return the named object for a complete result. Import `RepositoryError` from the existing repository error module. Do not inspect `episode.video_asset_path`.

- [ ] **Step 4: Make preparation require the boundary**

In `videoCompositionPreparer.ts`, import the new helper and replace `loadAndValidateQuizV2`. Call it immediately after destructuring the options in `prepareVideoComposition`, before style pinning, audio copy, `mkdir`, asset preparation, soundtrack preparation, or composition writing. Rename the local to `artifacts` and make asset, preflight, soundtrack, and composition calls unconditional. Remove the nullable type and the `completeQuizV2` field from `VideoCompositionContext`.

- [ ] **Step 5: Run the focused tests**

```powershell
pnpm --filter @studio/server exec vitest run test/quizRenderArtifacts.test.ts test/videoRunnerStyleBoundary.test.ts test/videoRunnerCancellationLifecycle.test.ts test/renderConcurrencyLimiter.test.ts
```

Expected: all pass; missing-artifact tests prove no preparation side effect occurs.

## Task 3: Make the V2 composition boundary canonical

**Files:**
- Modify: `apps/server/src/quiz/render/hyperframesRenderer.ts`
- Modify: `apps/server/src/quiz/render/candyArcadeComposition.ts`
- Delete: `apps/server/src/quiz/render/buildComposition.ts`
- Modify: `apps/server/src/tasks.ts`
- Modify: `apps/server/test/videoRunner.test.ts`
- Modify: `apps/server/test/quizPipeline.test.ts`
- Modify: `apps/server/test/quizNativeFlowEndToEnd.test.ts`

**Interfaces:**
- Consumes: existing `CandyArcadeCompositionInput` and `buildCandyArcadeCompositionBundle`
- Produces: unchanged `PreparedQuizRender` and `QuizRenderer` behavior; no V1 export

- [ ] **Step 1: Migrate the production adapter**

Change the import in `HyperframesRenderer` to import the bundle builder and its bundle type directly from `candyArcadeComposition.ts`. Keep every input field currently forwarded, return `composition.html`, `composition.files`, `composition.transitionInstances`, duration, question count, and style revisions exactly as before.

- [ ] **Step 2: Remove duplicate wrapper validation**

Delete only the extra `QuizV2Schema.parse` in the removed wrapper layer. Keep the canonical parse at `buildCandyArcadeCompositionBundle`. Do not remove schema validation from repository/API boundaries.

- [ ] **Step 3: Delete the V1 file and exports**

After all imports are migrated, delete `buildComposition.ts` and remove the V1 re-export from `apps/server/src/tasks.ts`. Run the inventory search; zero active source/test references to the V1 names are required.

- [ ] **Step 4: Migrate tests without weakening coverage**

Replace V1 HTML assertions with a V2 fixture built from `QuizV2`, `DirectorPlan`, `VoicePlan`, and `QuizTimeline`. Assert root `data-composition-id="quiz-v2-candy-arcade"`, duration, audio, and question text in the concatenation of root HTML plus mounted files. Retain the choice-count validation test at the schema/preflight owner; do not recreate it in a deleted renderer.

- [ ] **Step 5: Run composition tests**

```powershell
pnpm --filter @studio/server exec vitest run test/videoRunner.test.ts test/quizPipeline.test.ts test/quizNativeFlowEndToEnd.test.ts test/quizRenderStyleContract.test.ts test/quizPreviewProductionStyleParity.test.ts
```

## Task 4: Remove redundant state and aliases

**Files:**
- Modify: `apps/server/src/tasks/video/renderManifestWriter.ts`
- Modify: `apps/server/src/tasks/video/videoCompositionPreparer.ts`
- Modify: `apps/server/src/tasks/videoRunner.ts`
- Modify: all mocks found by `rg -n 'completeQuizV2|persistVideoRenderArtifacts|prepareVideoComposition' apps/server/test`
- Modify: `apps/server/src/quiz/render/layouts/registry.ts`
- Modify: `apps/server/test/artifactRetentionPruner.test.ts`
- Create or extend: `apps/server/test/renderManifestWriter.test.ts`

**Interfaces:**
- Consumes: `RequiredQuizRenderArtifacts` and the existing preflight assessment
- Produces: V2-only manifest persistence with unchanged asset/transition metadata

- [ ] **Step 1: Remove the boolean from all internal contracts**

Delete `completeQuizV2` from `VideoCompositionContext`, `persistVideoRenderArtifacts` options, the `runVideoTask` call, and mocks. Make `preflightAssessment` non-null where the V2-only path guarantees it. Update fixtures with a real schema-valid assessment, not `as any`.

- [ ] **Step 2: Make manifest version fields V2-only**

Replace the ternaries in `renderManifestWriter.ts` with literals `quiz_engine_version: 2` and `schema_version: 2`. Write the actual preflight status and score/blocker count. Remove `{ status: "legacy_skipped" }`; preserve all other fields and fallback-asset metadata.

- [ ] **Step 3: Remove the layout alias**

Delete only `export const QUIZ_LAYOUT_REGISTRY = QUIZ_LAYOUT_RENDERERS` after confirming no non-test consumer. Keep the renderer map, `getQuizLayoutRenderer`, `renderQuizLayoutBody`, CSS aggregation, all layout imports, and the shared capability catalog.

- [ ] **Step 4: Test contracts and manifest**

Assert a V2 manifest is written for a complete render, no `legacy_skipped` appears, degraded asset fields remain, and transition instances/engine snapshot remain present. Test that a failed preparation cannot call the manifest writer.

- [ ] **Step 5: Run focused tests**

```powershell
pnpm --filter @studio/server exec vitest run test/renderManifestWriter.test.ts test/artifactRetentionPruner.test.ts test/transitionRenderArtifacts.test.ts test/quizLayoutRegistry.test.ts test/quizLayoutCapabilities.test.ts
```

## Task 5: Retire the legacy production pipeline

**Files:**
- Modify: `apps/server/src/tasks/pipeline/quizProductionPipelineRunner.ts`
- Modify: `apps/server/test/quizProductionPipelineFastPath.test.ts`
- Modify: `docs/architecture.md`
- Modify: `docs/quiz-engine-v2.md`
- Modify: `docs/troubleshooting.md`

**Interfaces:**
- Consumes: existing `runQuizNativePipeline`, `runQuizV2Pipeline`, task child/cancellation APIs
- Produces: `runPipelineTask` with no environment-based branch and unchanged task lifecycle

- [ ] **Step 1: Add the regression test first**

Change the old positive legacy-flag test to set `process.env.USE_LEGACY_QUIZ_PIPELINE = "true"` and assert no `GENERATE_RESEARCH`, `GENERATE_TREATMENT`, `GENERATE_SCRIPT`, `GENERATE_VISUAL_BIBLE`, or `GENERATE_SEQUENCE_SCENES` submission, while `GENERATE_QUIZ`/`GENERATE_VIDEO` and completion remain as appropriate. Keep the existing native no-flag and already-present tests.

- [ ] **Step 2: Remove only the legacy branch**

Delete `executeShotPlanSequences`, `runLegacyPipeline`, their exclusive imports (`extractNarrationSections`, `planSequenceResume`, and helpers proven exclusive by search), the environment read, and the `if/else`. In `runPipelineTask`, call `runQuizNativePipeline(this, task, episodeId, step)` directly, then preserve cancellation checks, `runQuizV2Pipeline.call(this, task)`, video child handling, finish, and `finally` cleanup.

- [ ] **Step 3: Re-run consumer search**

Confirm that any retained `planSequenceResume`, narrative helper, or task handler has a non-legacy consumer. Do not delete `synthesizeAllLegacyArtifacts`; its direct quiz handler caller remains required.

- [ ] **Step 4: Update documentation and tests**

Document that production is quiz-native and V2-only, that the old flag is ignored, and that missing artifacts require regeneration through supported stages. Keep troubleshooting recovery actionable and English-only.

- [ ] **Step 5: Run pipeline tests**

```powershell
pnpm --filter @studio/server exec vitest run test/quizProductionPipelineFastPath.test.ts test/quizParallelAssetsVoice.test.ts test/quizNativeFlowEndToEnd.test.ts test/videoCancellation.test.ts test/videoRunnerCancellationLifecycle.test.ts
```

## Task 6: Remove stale documentation references and add architecture tripwires

**Files:**
- Modify: `docs/antigravity-image-sizing/05-acceptance.md`
- Modify: all docs found by the legacy-name search
- Create: `apps/server/test/quizV1RetirementArchitecture.test.ts`

**Interfaces:** No runtime interfaces. The tripwire is a maintenance guard, not an implementation dependency.

- [ ] **Step 1: Update stale acceptance language**

Replace production references to `buildQuizComposition` with the current path: `prepareQuizVideoRender`, `HyperframesRenderer.prepare`, and V2 bundle mounted files. Do not rewrite unrelated image-sizing requirements.

- [ ] **Step 2: Add a narrow source tripwire**

Read only the known production files in the test and assert they do not contain the retired symbols/flag. Keep the assertion list explicit so a future intentional compatibility change produces a reviewable test edit. Do not scan the whole repository because this handoff and historical docs intentionally describe the removal.

- [ ] **Step 3: Run the tripwire and formatting check**

```powershell
pnpm --filter @studio/server exec vitest run test/quizV1RetirementArchitecture.test.ts
pnpm run format:check
```

## Task 7: Full verification and real V2 render

**Files:**
- Modify: `execution/STATUS.md`
- Modify: `execution/EVIDENCE.md`
- No production source changes in this task

- [ ] **Step 1: Run shared build and typecheck**

```powershell
pnpm typecheck
```

Expected: exit 0. If it fails, fix only errors caused by this retirement before proceeding.

- [ ] **Step 2: Run the full test suite**

```powershell
pnpm test
```

Expected: exit 0 with no skipped retirement coverage. Do not update unrelated snapshots.

- [ ] **Step 3: Run audits and lint**

```powershell
pnpm run audit
pnpm lint
```

- [ ] **Step 4: Run a real local render**

Use an isolated temporary repository root containing only schema-valid checked-in fixtures and existing local media. Prepare the composition through the application V2 path, then run the pinned HyperFrames CLI check/render contract from the project. Verify `index.html`, every mounted composition file, MP4 non-zero size, plausible duration, 1920x1080 landscape dimensions, audio stream, V2 manifest fields, and no `legacy_skipped`/version 1 values. Do not use hosted/cloud render or upgrade the pinned CLI.

- [ ] **Step 5: Verify missing-artifact failure**

Run a fixture with `video_asset_path` set and one V2 file removed. Assert the task fails with `QUIZ_V2_REQUIRED`, keeps the old video untouched, does not write a composition/manifest, releases the render slot, and clears the active video controller. Repeat with the old environment flag set to `true`.

- [ ] **Step 6: Review and record evidence**

Run the final searches, review the diff for unrelated changes and accidental data edits, update `execution/EVIDENCE.md` with commands and exit codes, and update `STATUS.md` to `implemented` only if every acceptance item is evidenced.
