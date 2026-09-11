# Scope and Design Contract

## 1. Required behavior

| Input state at render preparation | Required result |
| --- | --- |
| All five V2 artifacts load and validate | Continue through the existing V2 asset, QA, audio, composition, check, render, and persistence workflow |
| Any V2 artifact is absent, with or without an existing video | Reject with `RepositoryError.code === "QUIZ_V2_REQUIRED"`; identify missing filenames and the recovery action |
| An artifact is malformed | Preserve the repository's `QUIZ_ARTIFACT_INVALID` error; do not reinterpret it as absence |
| Another repository read fails | Propagate the error; do not swallow it or invoke another renderer |
| V2 preflight has blockers | Preserve `QUIZ_PREFLIGHT_BLOCKED`; do not render or publish |
| Old environment flag is unset, `false`, or `true` | Always use the quiz-native pipeline |
| A stored V1 video is viewed or downloaded | Continue serving the stored artifact through existing readers; do not delete or rewrite it |
| A stored V1-only episode is re-rendered | Refuse until its V2 artifacts are explicitly regenerated through the supported production workflow |

The five canonical filenames, under the episode's `quiz/` directory, are:

1. `quiz-v2.json`
2. `director-plan.json`
3. `asset-plan.json`
4. `voice-plan.json`
5. `timeline.json`

Do not check for `quiz.json`. Do not use file existence alone as validation. The repository read methods already parse these artifacts with their schemas.

## 2. Target responsibility boundaries

```text
runPipelineTask
  -> runQuizNativePipeline
  -> runQuizV2Pipeline
  -> GENERATE_VIDEO
       -> runVideoTask
       -> prepareVideoComposition
            -> loadRequiredQuizRenderArtifacts
            -> existing V2 preparation and preflight
            -> prepareQuizVideoRender
                 -> HyperframesRenderer.prepare
                 -> buildCandyArcadeCompositionBundle
            -> root HTML + composition files
       -> existing check and HyperFrames render
       -> V2 manifest + stored video
```

Introduce only a focused artifact-loading boundary and its types. Do not introduce a renderer factory, engine selector, generic migration platform, or replacement legacy adapter.

`loadRequiredQuizRenderArtifacts(repository, channelId, episodeId)` consumes a narrow `Pick` of the five repository readers and returns non-null `RequiredQuizRenderArtifacts`. It has no `hasExistingVideo` argument and no nullable success return. It owns the completeness requirement, not schema parsing, file access, or semantic QA.

The completeness check must execute before `pinEpisodeStyleRevision`, render-root creation, narration copying, asset generation, soundtrack preparation, and composition writes in `prepareVideoComposition`. Existing task status updates, prerequisite reads, render-slot handling, and task-scoped failure bookkeeping may still happen in `runVideoTask`.

Read all five artifacts before continuing. Preserve the current repository error behavior. Do not add cross-artifact consistency algorithms or a new persistence transaction in this change; existing preflight remains responsible for semantic compatibility.

## 3. Public and internal contracts

- Delete `apps/server/src/quiz/render/buildComposition.ts` after migrating every source and test import. This removes V1, both redundant V2 wrappers, and the duplicate `QuizV2CompositionInput` type.
- Retain `HyperframesRenderer`, `QuizRenderer`, `QuizRenderInput`, `PreparedQuizRender`, `buildCandyArcadeComposition`, and `buildCandyArcadeCompositionBundle`.
- Preserve every field currently forwarded by `HyperframesRenderer.prepare`, especially style context, premixed audio, FPS, intro/outro options, and transition instances.
- Retain the existing `QuizV2Schema.parse` at the canonical Candy Arcade bundle boundary. Remove only the duplicate wrapper validation; repository and API validation stay.
- Retain `CandyArcadeCompositionInput`, including `mascotStyleId`; do not replace it with the narrower deleted wrapper type.
- Remove the internal `completeQuizV2` boolean from `VideoCompositionContext`, the manifest writer input, the caller, and affected mocks. Do not retain an always-true field.
- Successful preparation returns a non-null `preflightAssessment`. New manifests always write `quiz_engine_version: 2`, `schema_version: 2`, and an actual passed preflight result. No new `legacy_skipped` status.
- Preserve the existing manifest shape otherwise, including degraded asset reporting, engine snapshot, artifact hash, and transition instances. An asset-provider fallback is not a renderer fallback.
- Do not rewrite old manifests, bump shared schemas unnecessarily, or remove historical version readers.

## 4. Pipeline retirement boundary

Delete `runLegacyPipeline`, `executeShotPlanSequences`, the environment-variable branch, and imports used exclusively by these functions in `quizProductionPipelineRunner.ts`.

Keep `runQuizNativePipeline`, `runQuizV2Pipeline`, `runVideoRenderStep`, scene overlay balancing, task child tracking, progress propagation, resume behavior, stage timing, and cancellation cleanup.

Do not delete generic task enums, route handlers, `pipelineHelpers`, `planSequenceResume`, or narrative helper modules simply because the removed branch referenced them. Other consumers must be preserved. Any further deletion requires zero non-test consumers and evidence recorded separately; broad narrative subsystem retirement is not authorized.

Critically, keep `synthesizeAllLegacyArtifacts` and its caller in `directQuizHandler.ts`: quiz-native generation still uses them to produce scenes and companion artifacts. Their name does not make them part of the retired execution path.

## 5. Output preservation

For identical fixed V2 inputs, preserve root HTML and composition-file content across this refactor, except for an independently identified defect approved by the owner. Capture this comparison in the same working environment with fixed revision, time-dependent inputs, and media.

Do not alter quiz text, timeline timing, asset selection, fonts, CSS, scene layouts, mascot placement, transition math, brand marks, aspect-ratio restrictions, or audio mix. Existing episode rendering supports landscape; this retirement does not enable portrait episodes or change Short Reel behavior.

Do not compare only root HTML: question content is in `bundle.files`. A string-only wrapper can hide missing mounted files.

## 6. Interaction and asynchronous behavior

No new UI is required. Existing task transport and error surfaces are the integration boundary.

- A render request receives the existing immediate pending/queued feedback.
- A missing-artifact error appears through the existing task failure path with filenames and a concise English recovery action.
- The existing video remains accessible; its metadata and content are not replaced on this failure.
- Failure clears pending state and releases the task's render slot/controller.
- Retry after explicit artifact repair runs V2 and does not submit legacy child tasks.
- Cancellation remains terminal and does not become a late `COMPLETED` state.
- Slow artifact reads must not trigger early composition generation or publication.
- Concurrent work on another episode remains unaffected; keep the existing episode/task locking policy.
- After a successful render, existing state updates refresh affected views without a page reload. Verify this behavior; do not redesign synchronization during retirement.

Do not promise a new guarantee for cancellation during preparation that the current implementation does not provide. Report unrelated lifecycle defects instead of silently expanding this task.

## 7. Alternatives considered

| Approach | Decision |
| --- | --- |
| Split V1 HTML/CSS into modules but keep both renderers | Rejected: retains the maintenance branch the owner wants removed |
| Keep a flag or adapter for V1 while migrating | Rejected: recreates the fallback surface and unclear retirement date |
| Require V2, retire dead wrappers and the legacy pipeline | Selected: smallest durable change, with an explicit compatibility break |

## 8. Global constraints

- Work only in the current approved checkout and preserve all pre-existing changes.
- All repository artifacts and system messages must be English-only.
- No production dependencies, package-version changes, or lockfile changes.
- No live-data deletion, automatic regeneration, or migration.
- No external AI/image/audio provider requests during verification.
- No OS-level mouse, keyboard, clipboard, or focus-stealing automation.
- Use browser-protocol automation for browser checks.
- New scripts must use the existing structured logger or a labeled, timestamped, color-capable helper.
- No broad staging, commits, pushes, or checkout resets without separate owner authorization.
- Missing verification evidence means incomplete acceptance, not a presumed pass.
