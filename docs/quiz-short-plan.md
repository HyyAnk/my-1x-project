# Quiz Short implementation plan

Status: implemented, 2026-10-10. Phases 0 to 7 landed in commits fad8762, d513f5f, 46c459a, 9426c62 and the documentation commit that follows. Known gaps: no ZIP export package for Quiz Shorts, the real browser render is covered only by the opt-in system test, the topic history filter has no Quiz Short tab, and portrait image prompt copy still uses landscape framing wording.

Quiz Short is a third content kind next to Episodes and Short Reels: a 9:16 portrait quiz video with five questions by default, sourced from one Question Bank topic, rendered to MP4 by the Quiz V2 pipeline, with its own tab in the channel UI.

## Product decisions (confirmed)

| Area             | Decision                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Placement        | Own tab, own record, own routes. Not nested in Episode or Short Reel.                                                                                                                |
| Source           | Question Bank only. All questions of one video come from one topic.                                                                                                                  |
| Topic generation | Topic run shows three groups in order: Episode, Quiz Short, Short Reel.                                                                                                              |
| Question count   | Configurable, default 5.                                                                                                                                                             |
| Aspect ratio     | 9:16, 1080x1920.                                                                                                                                                                     |
| Localization     | Same mechanism as Episodes (product localization at confirm time).                                                                                                                   |
| Intro / outro    | No intro. Outro is a fixed 3-second CTA asking viewers to comment their score.                                                                                                       |
| Mascot           | Appears only during the answer reveal beat and the outro CTA.                                                                                                                        |
| Narration        | Question text is read. Choices are not read. The reveal reads only the correct choice label (A/B/C or Yes/No) plus the answer text.                                                  |
| Layouts          | Two layouts per video, alternating, chosen from a small portrait layout set. Image layouts carry at most two images. A three-image question is adapted by dropping one wrong choice. |
| Thumbnail        | 9:16 cover built on the Short Reel portrait cover pipeline, driven by question one.                                                                                                  |
| Publishing       | MP4 plus title and description, as Episodes. No ZIP export.                                                                                                                          |
| Build order      | Topic layer, bank and confirmation, render, thumbnail. Each layer is finished and tested before the next.                                                                            |

## Architecture decision: a separate product that shares the Quiz V2 pipeline

The Quiz V2 pipeline, repository artifact helpers and task runners are keyed by `channelId` plus `episodeId` and write under `channels/<slug>/episodes/<slug>/`. Quiz Short needs the same artifacts (`quiz-v2.json`, `director-plan.json`, voice, timeline, QA, render manifest) in its own directory.

Recommended approach: introduce a product reference so the pipeline works for both kinds without copying code.

- Add `QuizProductRef = { kind: "episode" | "quiz_short"; channelId: string; productId: string }` in `packages/shared/src/schemas/quizProduct.ts`.
- Add one path resolver (`apps/server/src/repository/quizProductPaths.ts`) that maps a ref to its directory (`episodes/<slug>` or `quiz_shorts/<slug>`), built on the existing `pathSafety.ts` helpers.
- `repository/quiz/quizPlanArtifacts.ts`, `quizArtifactsInvalidation.ts`, `videoTitleArtifacts.ts` and the render manifest writer accept the ref. Existing episode call sites pass `{ kind: "episode" }` through a thin adapter so their signatures do not change in the first pass.
- `quiz/pipeline/orchestrator.ts` and `tasks/pipeline/quizV2PipelineRunner.ts` take the ref instead of `episodeId`.
- `tasks/videoRunner.ts` loads the product by ref; the hard aspect check is replaced by the product's `render_aspect_ratio`.

Alternative considered: a `product_kind` field on `EpisodeSchema` with episodes and quiz shorts in one list. Rejected because the product needs separate tabs, lists, topic groups and defaults, and because mixing kinds in the episode list would leak into every episode consumer.

## Phase 0: Shared contracts (packages/shared)

1. `schemas/channel.ts`
   - Add `QuizShortTopicCandidateSchema`: `content_kind: "quiz_short"`, `question_count` (min 3, max 7, default 5), `aspect_ratio: "9:16"`, `age_band`, `archetype` restricted to archetypes whose layouts exist in portrait, `layout_pair` (see Phase 3).
   - Add it to `TopicCandidateSchema`.
   - Add `QuizShortConfigSchema`: subset of `QuizConfigSchema` with `render_aspect_ratio: "9:16"`, `question_count` default 5, `pacing_profile: "short"`, `layout_pair`, `outro_cta_enabled` default true, no intro fields, `thumbnail_aspect_ratio: "9:16"`.
2. `schemas/quizShort.ts` (new): `QuizShortSchema` built from a `QuizProductBaseSchema` extracted from `EpisodeSchema` (id, slug, title, stage, timestamps, video fields, `thumbnail_asset_path_9_16`, localization). Episode keeps its current shape; the extraction is a refactor with no behavior change.
3. `schemas/topicSourceBinding.ts`, `schemas/topicRun.ts`, `schemas/config.ts`: extend every `content_kind` / `content_type` enum with `quiz_short`. Add `DEFAULT_TOPIC_QUIZ_SHORT_TARGET_COUNT = 4` and `target_quiz_short_count` on the run schemas. Add the `qshort_` history id prefix in `inferQuestionHistoryContentType`.
4. `api/channel.ts`: `QuizShortTopicConfirmInputSchema` (`render_aspect_ratio: "9:16"`, optional `question_count`), `ConfirmQuizShortTopicResponseSchema`, `QuizShortSettingsInputSchema`.
5. `quizGameplayPolicy.ts`
   - Add `pacing_profile: "standard" | "short"` to `gameplayTimingPolicy`. The short profile: thinking 3 to 4 seconds, countdown 3, `question_narration_lead_seconds` 0.35, `explanation_hold_seconds` 0.4, `transition_seconds` 0.3, `readChoices: false` for every policy.
   - Bump `QUIZ_GAMEPLAY_POLICY_VERSION` so resumed episode plans regenerate cleanly.
6. `quizLayoutGeometry/types.ts`, `quizLayouts.catalog.ts`, `quizLayouts.policy.ts`
   - Add `QUIZ_PORTRAIT_LAYOUT_IDS`: `short_stack_list`, `short_media_top_choices`, `short_versus_two`, `short_verdict_yes_no`. The retired ids guarded by `quizLayoutsPortrait.test.ts` are not reused.
   - Catalog entries declare `supportedAspectRatios: ["9:16"]`, image counts (0, 1, 2, 1) and asset ratios (none, 4:3, 3:4, 4:3).
   - `filterQuizLayoutsByAspectRatio("9:16")` returns this set. `getCompatibleQuizLayout` stops throwing for 9:16.
7. `quizImageSizing/geometry.ts` and `types.ts`: accept a 9:16 canvas and return portrait slot sizes.
8. `mascot/renderConstants.ts` already defines the 9:16 canvas; no change.

## Phase 1: Topic layer

Goal: a topic run produces Episode, Quiz Short and Short Reel candidates, and the Topics tab shows them in that order.

Server:

- `context/topicMatrix.constants.ts`: add `QUIZ_SHORT_ARCHETYPE_DEFINITIONS` (deep_trivia, verdict_yes_no, versus_faceoff, visual_identification limited to two images). `ARCHETYPE_SLOT_DEFINITIONS` becomes 12 slots: 1-4 episode, 5-8 quiz_short, 9-12 short_reel. `generateRandomSlotDefinitions` follows the same split.
- `context/topicMatrixPlanner.ts`: third pool and a prompt paragraph describing Quiz Short (five short questions, one topic, portrait, choices readable in two seconds).
- `context/bankTopicAllocation.ts`: `requiredCount` for quiz_short is `quizShortQuestionCount` (default 5); eligibility uses the new `evaluateQuizShortQuestionEligibility`.
- `context/topicRunTargets.ts`: return `{ episode, quizShort, shortReel }`.
- `context/candidate/candidateNormalizer.ts`: `buildQuizShortRunCandidate` with the `topic_qs` id prefix. `candidateFieldValidator.ts`: `validateQuizShortCandidateSlot`.
- `quiz/bank/topicAvailabilityService.ts`: required source count for quiz_short equals the candidate question count.
- `repository/topicConfirmationReceipts.ts`, `topicSelectionProjection.ts`: handle the new kind.

Web:

- `features/channel/components/ChannelTopicsTab.tsx`: three sections, order Episode, Quiz Short, Short Reel.
- `components/topicCard/TopicPickers.tsx`: quiz_short shows a question count picker capped by bound sources, default 5, and no visual style picker.
- `features/channel/hooks/useChannelDetail.ts`: on confirm result `content_kind === "quiz_short"`, navigate to the new route.

Tests: extend `topicSuggestionMatrix.test.ts`, `topicCandidateValidation.test.ts`, `bankTopicGeneration.test.ts`, `topicAvailabilityRoute.test.ts`; a web test for the three sections.

## Phase 2: Bank eligibility, confirmation and record

Goal: confirming a Quiz Short topic creates a `QuizShort` record with localized questions, a director plan and a submitted pipeline task.

Eligibility (`quiz/bank/bankEligibility.ts`):

- New policy `"quiz_short"`: approved status, question text at most 90 characters, each choice at most 32 characters, at most 3 choices, explanation optional, and image questions allowed only when the resolved portrait layout needs at most two images or the question can be adapted (see below).
- `bankInventory.ts` adds `eligible_by_policy.quiz_short`; `bankCooldownCalculator.ts` and `routes/questionBank/queryRoutes.ts` accept the `quiz_short` scope.

Question adaptation (`quiz/bank/bridge/quizShortQuestionAdapter.ts`, new):

- For a three-image question, drop one wrong choice and keep the correct one, choosing the distractor with the lowest text overlap with the correct answer. Record the dropped choice id in the quiz question metadata so QA can see the adaptation. Bank records are never mutated.
- Reject questions that would fall below two choices.

Confirmation (`quiz/bank/bridge/`):

- `quizShortBridge.ts` (new): `createQuizShortFromTopicWithBank`, mirroring the `topicEpisodeBridge.ts` steps and reusing `resolveBoundTopicSources` (scope `quiz_short`), `convertBankQuestionToQuizQuestionLossless`, `spreadCorrectChoicePositions`, `localizeProductContent` (artifact `content_kind: "quiz_short"`), the confirmation lock and receipts.
- `bootstrapperHelpers.ts`: `resolveRenderAspect` accepts 9:16 when the kind is quiz_short. `buildQuizShortRecord` builds a `QuizShortSchema` record under `channels/<slug>/quiz_shorts/<slug>/`.
- `bankDirectorPlanFactory.ts`: `resolveTargetLayoutPairForTopic` for portrait; `buildQuizShortDirectorPlan`.
- `routes/channels.ts` confirm handler: third branch for `quiz_short`.

Record and routes:

- `repository/quizShorts.ts` (new): list, get, delete, settings update. Contract and bindings in `repository/contracts` and `repository/bindings`.
- `routes/quizShorts.ts` (new): `GET /api/channels/:c/quiz-shorts`, `GET/PATCH/DELETE /quiz-shorts/:id`, pipeline start and retry proxied to the existing task submission.
- `productLocalizationStore.ts`: `resolveQuizShortTargetLanguage`.

Tests: `quizShortEligibility.test.ts`, `quizShortQuestionAdapter.test.ts`, `quizShortConfirmation.test.ts` (replay, conflicting kind, insufficient capacity, localization), `quizShortRoutes.test.ts`.

## Phase 3: Director, timing and pipeline

Goal: the Quiz V2 pipeline runs end to end for a Quiz Short and produces a timeline that fits 45 to 60 seconds.

Director (`quiz/director/`):

- `createDefaultDirectorPlan` takes the aspect ratio from the config instead of the hard-coded 16:9.
- `quizShortDirectorPlan.ts` (new): assign layouts by alternating the `layout_pair`, with the first question forced to the primary layout. Pair selection rule: text-only topics use `short_stack_list` with `short_verdict_yes_no`; image topics use `short_media_top_choices` with `short_versus_two`. `applyGameplayDirectorPolicy` receives `pacing_profile: "short"`.
- `validateDirectorPlan.ts`: a rule that a Quiz Short plan uses at most two distinct layouts and only portrait ids.
- `quiz/layoutCompatibility.ts`: `resolveQuestionLayout` accepts 9:16.

Timeline (`quiz/timeline/`):

- `compileTimeline.ts` skips the intro, bridge topic, mid-roll CTA and pre-outro stages when the product kind is quiz_short, and compiles `outro/compileScoreCtaStage.ts` (new, 3 seconds).
- Question compilers read `pacing_profile` from the timing policy; the explanation beat is skipped when the explanation is empty.
- `validateTimeline.ts`: a Quiz Short timeline warns above 75 seconds and fails above 90 seconds.

Voice (`quiz/audio/`):

- `voicePlan.ts`: when `readChoices` is false, no choice segments; the reveal segment is the correct choice label plus the answer text, at most eight words. Add a short kickoff line ("Five questions. Ready?") and no closing line, because the CTA clip carries on-screen text only.
- `voicePolicy.ts`: the short profile words-per-second target is one step faster than the age band default.

Assets (`quiz/assets/`):

- `assetPlanner.ts` and `imageMetadataValidator.ts` use the product aspect ratio and the portrait slot sizes from Phase 0.

Pipeline and tasks:

- `quiz/pipeline/orchestrator.ts`, `tasks/pipeline/quizV2PipelineRunner.ts`, `quizProductionPipelineRunner.ts`, `quizPipelineVoiceStep.ts`: accept `QuizProductRef`.
- `tasks/videoRunner.ts`: remove `UNSUPPORTED_ASPECT_RATIO` for 9:16; `renderCanvas` comes from the product.
- `tasks/video/videoCompositionPreparer.ts` and `compositionHtmlCompiler.ts` already thread 9:16.
- QA (`quiz/qa/`): add checks that no choice narration exists in the short profile and that the mascot is absent outside reveal and CTA phases.

Tests: `quizShortDirectorPlan.test.ts`, `quizShortTimeline.test.ts` (duration budget), `quizShortVoicePlan.test.ts`, `quizShortPipeline.test.ts` modeled on `quizOnlyPipeline.test.ts`, plus `gameplayPolicy.test.ts` coverage for the short profile.

## Phase 4: Portrait render

Goal: the HyperFrames composition renders a 1080x1920 video with the portrait layouts, phase slots and mascot rules.

Frame (`quiz/render/frame/`):

- `portraitFrameGeometry.ts` (new), the portrait counterpart of `landscapeFrameGeometry.ts`. Reserved zones: top 10 percent (status bar and title), bottom 22 percent (platform controls and caption), right 14 percent (action icons). The question arena is the middle 40 percent; choices sit below it inside the safe zone; the progress strip ("1 / 5") sits at the top of the arena.
- `renderQuizFrameBody.ts`: `isUnifiedQuizFrame` accepts 9:16 with a portrait layout id; `quizFrameStyles.ts` gains a portrait variant.
- Replace the question counter with a five-segment progress strip for the short kind (`frame/progressStrip.ts`, new).

Layouts (`quiz/render/layouts/`):

- `portrait/shortStackList.ts`, `portrait/shortMediaTopChoices.ts`, `portrait/shortVersusTwo.ts`, `portrait/shortVerdictYesNo.ts`, each with a `styles/` folder under `layouts/portrait/styles/` (currently empty). Register in `registry.ts`.
- Text sizing: question at least 56 px, choices at least 44 px, on a 1080 px wide canvas.

Candy Arcade (`quiz/render/candyArcade/`):

- `candyArcadeComposition.ts`: a `kind` switch that omits intro, bridge topic, brand stinger, subscribe CTA, pre-outro and celebration clips, and appends `scoreCtaClip.ts` (new, 3 seconds, text "How many did you get right? Comment below", mascot in the celebrate pose).
- `candyArcadePortraitStyles.ts`: extend for the new layout ids and the progress strip.
- `transitionClip.ts`: remove the hard-coded 1920x1080 in favor of the canvas size.
- Countdown: a large centered ring timer for the short profile (`candyArcadeClipElements.ts`).

Mascot:

- `productionMascotTimeline.ts`: a `visibility_policy: "always" | "reveal_only"` option; Quiz Short uses `reveal_only`, which emits markers only for answer reveal beats and the CTA clip.
- Placement uses the existing 9:16 preset from `schemas/mascot.ts`.

Preflight: `tasks/video/videoLayoutChecker.ts` samples portrait frames; contrast healing is unchanged.

Tests: `quizShortLayoutRegistry.test.ts`, `quizShortRenderSnapshot.test.ts` (HTML snapshot per layout), extend `videoLayoutChecker.test.ts`, and an opt-in `quizShortRender.system.test.ts` that renders one five-question specimen.

## Phase 5: Thumbnail, title and description

Thumbnail (`quiz/thumbnail/`):

- `quizShortCoverPlanner.ts` (new) adapted from `shortReel/coverAiPlanner.ts`: persona and hook derived from question one, plus a "5 questions" badge.
- `quizShortCoverService.ts` (new) reusing `createPortraitImageClient` and `normalizeReelPortrait` (move `normalizeReelPortrait` to `providers/imageGeneration/portraitNormalizer.ts` so both products share it).
- `tasks/thumbnail/thumbnailTaskRunner.ts` dispatches by product kind; output goes to `thumbnail_asset_path_9_16`.
- Routes under `/quiz-shorts/:id/thumbnail`.

Title and description:

- `quiz/title/titlePromptCompiler.ts`: a short variant, at most 70 characters, no question count requirement, ends with `#Shorts`.
- `quiz/description/descriptionPromptCompiler.ts`: a short variant without chapters, at most 600 characters, with the score CTA sentence and hashtags.
- `videoMetadataStages.ts` passes the product kind.

Tests: `quizShortCoverPlanner.test.ts`, `quizShortCover.test.ts`, title and description short-variant tests.

## Phase 6: Web

- `hooks/router/hashCodec.ts`: route `/channels/:id/quiz-shorts/:quizShortId` and tab `quiz-shorts`.
- `features/channel/ChannelDetail.tsx` and `useChannelDetail.ts`: tab order Episodes, Quiz Shorts, Short Reels, Topics, DNA, Intro & Outro. `ChannelQuizShortsTab.tsx` with `QuizShortCard`.
- `features/quizShort/` (new feature folder): `QuizShortView.tsx`, `components/` (header, portrait preview, pipeline rail, customization bar limited to preset, palette, mascot style, question count, outro CTA toggle), `hooks/` (`useQuizShort`, `useQuizShortPipeline`, `useQuizShortThumbnail`), `services/`, `types/`.
- Reuse episode components where they are presentation-only (`PipelineRail`, `VideoTitleCard`, `VideoDescriptionCard`, thumbnail carousel). Extract shared pieces into `features/quizProduct/` only when both features need identical props; otherwise import directly.
- `api/quizShortApi.ts`.

Tests: `ChannelDetailQuizShorts.test.tsx`, `QuizShortView.test.tsx`.

## Phase 7: Documentation and cleanup

- `docs/quiz-short.md` describing the product, and updates to `architecture.md`, `episode-workflow.md`, `question-bank.md` and `quiz-engine-v2.md`.
- Fix the doc drift found during the survey: thumbnail runs as a child task; episode allocation binds eight sources; `layouts/portrait/styles` is empty today.

## Risks and mitigations

- **Repository refactor scope.** The product-ref change touches many call sites. Do it first, behind adapters, and run the full episode suite before any Quiz Short feature lands.
- **Working tree state.** The tree has many uncommitted changes. Commit or stash them before starting Phase 0 so each phase lands as its own commit.
- **Policy version bump.** Raising `QUIZ_GAMEPLAY_POLICY_VERSION` invalidates existing episode director plans on resume. Acceptable, but announce it.
- **Duration budget.** Validate with the first rendered specimen; if five questions exceed 60 seconds, lower the thinking window before touching anything else.
- **Portrait retirement tests.** The new ids avoid the retired names; the guard tests stay as they are.

## Suggested commit sequence

1. Shared contracts and product-ref adapters (no behavior change for episodes).
2. Topic layer, server and web.
3. Eligibility, adapter, confirmation, record, routes.
4. Director, timing, voice, pipeline.
5. Portrait frame, layouts, composition, mascot policy.
6. Thumbnail, title, description.
7. Web feature and tab.
8. Docs.
