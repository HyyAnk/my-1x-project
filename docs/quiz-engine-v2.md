# Quiz Engine V2

Reviewed against working-tree source on 2026-09-09. See [Architecture](architecture.md) for system boundaries and [Episode workflow](episode-workflow.md) for product entry points.

## Production path

[quizProductionPipelineRunner.ts](../apps/server/src/tasks/pipeline/quizProductionPipelineRunner.ts) owns the outer task and video child. It reuses an existing quiz or submits `GENERATE_QUIZ`. The default path is quiz-native; `USE_LEGACY_QUIZ_PIPELINE=true` still enables the compatibility research/treatment/script/scene path.

[directQuizHandler.ts](../apps/server/src/tasks/handlers/directQuizHandler.ts) parses direct quiz output, balances answer positions, and synthesizes compatibility script/visual-bible/scene artifacts. Do not make those compatibility artifacts a second source of truth for quiz questions.

## Stage sequence

[quizV2PipelineRunner.ts](../apps/server/src/tasks/pipeline/quizV2PipelineRunner.ts) coordinates these stages, implemented through [the domain orchestrator](../apps/server/src/quiz/pipeline/orchestrator.ts):

1. Ensure quiz and director artifacts.
2. Ensure the asset plan.
3. Attempt description generation if missing.
4. Resolve assets and synthesize voice concurrently when both need work; otherwise run only the needed branch.
5. Ensure a measured, compiled timeline.
6. Run QA and supported healing.
7. Attempt thumbnail generation.
8. Return to the outer runner for the video child task.

Description and thumbnail failures are non-fatal warnings. Both calls are awaited: non-fatal does not mean detached or zero-latency. The runner does not generate the thumbnail twice in this sequence.

Voice synthesis measures segment durations and assembles episode narration. Timing must use measured media, not estimated text duration alone. Stage and parallel timings are persisted for diagnostics.

## QA and invalidation

[quizPipelineVoiceStep.ts](../apps/server/src/tasks/pipeline/quizPipelineVoiceStep.ts) defaults to three blocker checks, with at most two intervening healing rounds. Supported asset and voice repairs can run concurrently. Remaining blockers fail with `QUIZ_QA_BLOCKED`; unsupported blockers must not be silently ignored.

Domain validation is owned by:

- [Director validation](../apps/server/src/quiz/director/validateDirectorPlan.ts): question coverage, semantic presentation and pacing requirements.
- [Timeline compilation](../apps/server/src/quiz/timeline/compileTimeline.ts): scheduled segments and timeline construction.
- [QA stages](../apps/server/src/quiz/qa/): semantic, asset, voice and other assessments. The copyright filter is application policy, not a legal clearance guarantee.
- [Invalidation map](../apps/server/src/quiz/pipeline/invalidation.ts) and [repository invalidation](../apps/server/src/repository/quiz/quizArtifactsInvalidation.ts): upstream changes invalidate derived artifacts.

Read thresholds in source/tests instead of copying numeric rules into new modules.

## Persistence and rendering

The exact JSON artifact filenames are:

```text
quiz-v2.json          director-plan.json       asset-plan.json
asset-resolution.json voice-plan.json         timeline.json
qa.json               history-check.json      video-description.json
stage-timings.json
```

[RepositoryRuntime](../apps/server/src/repository/runtime.ts) declares the names; [quizPlanArtifacts.ts](../apps/server/src/repository/quiz/quizPlanArtifacts.ts) owns schema-bound reads/writes. DTO field names such as `director_plan` or `assessment` are not filenames. Reuse repository write queues and atomic helpers.

[videoRunner.ts](../apps/server/src/tasks/videoRunner.ts) owns composition preparation, render execution, output persistence, completion, and history handling. It appends question history after rendering and rolls back question-history entries by render task on failure. BGM history has separate error handling; do not claim both ledgers form a single atomic transaction.

Episode configuration currently fixes output to landscape `16:9`; see [config schema](../packages/shared/src/schemas/config.ts) and [channel/episode schemas](../packages/shared/src/schemas/channel.ts). Lower-level portrait-capable types do not establish a supported portrait episode workflow. [Short Reels](short-reel.md) are a separate product.

## Verification

Start with [quizOnlyPipeline.test.ts](../apps/server/test/quizOnlyPipeline.test.ts), [quizParallelAssetsVoice.test.ts](../apps/server/test/quizParallelAssetsVoice.test.ts), and [pipelineVideoProgress.test.ts](../apps/server/test/pipelineVideoProgress.test.ts). Add targeted coverage for changed stages, invalidation, failure and cancellation. Follow [the workflow guide](workflow.md) for full checks. This documentation review did not run generation or certify render quality.
