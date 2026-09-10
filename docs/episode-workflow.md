# Episode workflow

Reviewed against working-tree source on 2026-09-09.

## Create and confirm

Topics and bank questions feed landscape Episodes through [the bank bridge](../apps/server/src/quiz/bank/questionBankToQuizBridge.ts). Topic confirmation must use authoritative source bindings, eligibility checks and durable receipts; it is not merely copying a topic into a new folder. See [Question bank](question-bank.md).

A selected bank question can also create an Episode through the single-question bridge. Pipeline auto-start is controlled by the flow's input; do not assume every creation always starts rendering.

[Episode contracts](../packages/shared/src/schemas/channel.ts) fix render aspect ratio to `16:9`. [Short Reels](short-reel.md) have their own records, confirmation and deliverables.

## Build and resume

The production runner reuses existing artifacts when valid, generates missing quiz content, and runs the [Quiz V2 pipeline](quiz-engine-v2.md). The main sequence is quiz/director, asset planning, assets and voice, timeline, QA, thumbnail and video rendering. Description and thumbnail errors are non-fatal; QA blockers are not.

Compatibility `script.md`, `visual_bible.md` and `scenes.json` can be synthesized from direct quiz output. Their existence does not mean the legacy narrative workflow ran.

Upstream edits must invalidate affected downstream artifacts through repository operations. Cancellation and retry must preserve accepted work and respect task locks; do not clear files manually to force a rebuild.

## Voice and media

[Voice stages](../apps/server/src/quiz/pipeline/stages/assetsVoiceStages.ts) plan and synthesize episode segments, measure durations, and assemble narration for timeline/render consumption. Cache reuse is based on the relevant content and voice inputs.

Scene-level audio/regeneration code remains for compatibility consumers. Its existence does not guarantee a visible scene editor in every current Episode view. Trace [audio/video routes](../apps/server/src/routes/audioVideo.ts) and the actual UI before changing or documenting a user-facing action.

## Progress and recovery

Task state is delivered through WebSocket events with refetch on reconnect and terminal updates. Feature hooks must refresh Episode details and artifact views, not only the task list.

Verify successful build, reused artifacts, upstream invalidation, cancellation, retry, provider failure and reconnect without requiring a full-page refresh. See [Workflow](workflow.md) and [Troubleshooting](troubleshooting.md).
