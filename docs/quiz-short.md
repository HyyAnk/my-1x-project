# Quiz Short

Quiz Short is the third content kind next to [Episodes](episode-workflow.md) and [Short Reels](short-reel.md): a 9:16 portrait quiz video with five questions by default, sourced from one Question Bank topic and rendered to MP4 by the [Quiz V2 pipeline](quiz-engine-v2.md). The implementation plan lives in [quiz-short-plan.md](quiz-short-plan.md).

## Product rules

| Rule       | Value                                                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas     | 1080x1920, `render_aspect_ratio` locked to `9:16`                                                                                                                       |
| Questions  | 3 to 7, default 5, all from one bank topic                                                                                                                              |
| Pacing     | `pacing_profile: "short"`: thinking 3 to 4 seconds, countdown 3 seconds, trimmed holds, target 45 to 60 seconds total (warning above 75, blocker above 90)              |
| Narration  | Question text is read. Choices are never read. The reveal reads the correct choice label plus a short answer. A kickoff line opens the video; there is no closing line. |
| Layouts    | Exactly two portrait layouts alternate per video (`layout_pair`), question one uses the primary layout                                                                  |
| Images     | At most two images per question. A three-image bank question is adapted by dropping one wrong choice; the bank record is never changed.                                 |
| Bookends   | No intro. A fixed 3 second score CTA closes the video ("How many did you get right? Comment below").                                                                    |
| Mascot     | Visible only during answer reveal beats and the CTA                                                                                                                     |
| Thumbnail  | One 9:16 cover driven by question one with a question-count badge                                                                                                       |
| Publishing | MP4 plus title (at most 70 characters, ends with `#Shorts`) and description (at most 600 characters, score CTA, 3 to 5 hashtags). No ZIP export.                        |

## Contracts

- [quizShort.ts](../packages/shared/src/schemas/quizShort.ts): `QuizShortSchema`, `QuizShortConfigSchema`, `QuizShortLayoutPairSchema`, `QuizPacingProfile`.
- [quizProduct.ts](../packages/shared/src/schemas/quizProduct.ts): `QuizProductRef` names the product kind the pipeline is working on. Episodes and Quiz Shorts share the Quiz V2 pipeline through this reference.
- [channel.ts](../packages/shared/src/schemas/channel.ts): `QuizShortTopicCandidateSchema` (`content_kind: "quiz_short"`). [topicSourceBinding.ts](../packages/shared/src/schemas/topicSourceBinding.ts): `TopicContentKindSchema` lists the three kinds in Topics tab order.
- [api/channel.ts](../packages/shared/src/api/channel.ts): `QuizShortTopicConfirmInputSchema`, `ConfirmQuizShortTopicResponseSchema`, `QuizShortSettingsInputSchema`.
- [quizGameplayPolicy.ts](../packages/shared/src/quizGameplayPolicy.ts): `applyPacingProfile` and the `pacingProfile` argument of `gameplayTimingPolicy`. The policy version is 2; director plans built under version 1 regenerate on resume.
- [events.ts](../packages/shared/src/events.ts): `Task.product_kind` (absent means episode) lets `GENERATE_PIPELINE`, `GENERATE_VIDEO` and `GENERATE_THUMBNAIL` build either kind.

## Topic layer

The suggestion matrix has 12 slots: 1-4 Episode, 5-8 Quiz Short, 9-12 Short Reel ([topicMatrix.constants.ts](../apps/server/src/context/topicMatrix.constants.ts), [topicMatrix.quizShort.constants.ts](../apps/server/src/context/topicMatrix.quizShort.constants.ts)). Allocation binds exactly `question_count` approved sources per Quiz Short slot using the `quiz_short` policy in [bankEligibility.ts](../apps/server/src/quiz/bank/bankEligibility.ts): question text at most 90 characters, choices at most 32 characters, 2 or 3 choices (`TEXT_TOO_LONG_FOR_SHORT` is the exclusion code). The Topics tab renders the three groups in that order.

## Confirmation

[quizShortBridge.ts](../apps/server/src/quiz/bank/bridge/quizShortBridge.ts) mirrors the Episode bridge under the confirmation lock: bound source resolution with scope `quiz_short`, lossless conversion, [question adaptation](../apps/server/src/quiz/bank/bridge/quizShortQuestionAdapter.ts) (`adapted_from_choice_ids` records the dropped choice), product localization (artifact `content_kind: "quiz_short"`), the record, `quiz-v2.json` and a portrait director plan, question history (`content_type: "quiz_short"`, id prefix `qshort_`), receipts, and an optional pipeline start through `TaskManager.submitForProduct`. The confirm route branch is [confirmQuizShortTopic.ts](../apps/server/src/routes/channels/confirmQuizShortTopic.ts).

## Pipeline

The Quiz V2 orchestrator and task runners resolve a `QuizProductRef` and read a [product view](../apps/server/src/quiz/pipeline/quizProductView.ts); repository artifact and media helpers accept a ref or a plain id ([quizProductPaths.ts](../apps/server/src/repository/quizProductPaths.ts), [quizProductLocator.ts](../apps/server/src/repository/quizProductLocator.ts)). Quiz Short specifics:

- Director: [quizShortDirectorPlan.ts](../apps/server/src/quiz/director/quizShortDirectorPlan.ts) alternates the layout pair and falls back per beat; [portraitPlanRules.ts](../apps/server/src/quiz/director/portraitPlanRules.ts) blocks plans with non-portrait or more than two layouts.
- Timeline: [compileTimeline.ts](../apps/server/src/quiz/timeline/compileTimeline.ts) with `productKind: "quiz_short"` compiles kickoff, question blocks under the short policy and the score CTA stage ([quizShortTimelinePolicy.ts](../apps/server/src/quiz/timeline/quizShortTimelinePolicy.ts)); explanation beats are skipped when the hold is under 0.5 seconds.
- Voice: [quizShortVoicePlan.ts](../apps/server/src/quiz/audio/quizShortVoicePlan.ts) and [quizShortVoiceCopy.ts](../apps/server/src/quiz/audio/quizShortVoiceCopy.ts).
- Assets: portrait canvas and slot sizes through `getQuizImageSlotGeometry`; never three choice images on a portrait beat.
- QA: [assessQuizShortQa.ts](../apps/server/src/quiz/qa/stages/assessQuizShortQa.ts); the Quiz Short blocker codes are unhealable and fail with `QUIZ_QA_BLOCKED` ([quizQaBlockerPolicy.ts](../apps/server/src/tasks/pipeline/quizQaBlockerPolicy.ts)).
- Settings: [quizShortSettings.ts](../apps/server/src/repository/quizShortSettings.ts). Question count, age band, visual style and layout pair rebuild director through render and keep `quiz-v2.json`; style-only changes mark the render stale.

## Render

[quizShortComposition.ts](../apps/server/src/quiz/render/candyArcade/quizShortComposition.ts) builds the kickoff card, portrait question clips and the score CTA clip; the Episode composition is untouched. Portrait layouts live in [layouts/portrait](../apps/server/src/quiz/render/layouts/portrait/) with frame geometry in [portraitFrameGeometry.ts](../apps/server/src/quiz/render/frame/portraitFrameGeometry.ts) (reserved top 192 px, bottom 422 px, right 151 px; question text at least 56 px, choices at least 44 px), a progress strip instead of the counter and a ring timer instead of the thinking bar. The mascot uses the `reveal_only` visibility policy; [quizShortMascotInvariant.ts](../apps/server/src/quiz/render/candyArcade/quizShortMascotInvariant.ts) is enforced before writing the composition. [productCompositionDispatcher.ts](../apps/server/src/tasks/video/productCompositionDispatcher.ts) routes by product kind to [quizShortCompositionPreparer.ts](../apps/server/src/tasks/video/quizShortCompositionPreparer.ts); layout preflight samples 1080x1920 frames.

| Layout                    | Images                | Use                                        |
| ------------------------- | --------------------- | ------------------------------------------ |
| `short_stack_list`        | none                  | Text questions with 2 or 3 stacked choices |
| `short_media_top_choices` | 1 hero (4:3)          | One subject image above stacked choices    |
| `short_versus_two`        | 2 choice images (3:4) | Side by side comparison or identification  |
| `short_verdict_yes_no`    | 1 hero (4:3)          | Yes or No with two large buttons           |

The ring timer is a 150 px badge on the question card's bottom-right corner, the reveal card sits at the bottom left of the safe area and the mascot uses the compact portrait preset at the bottom right (`RECOMMENDED_MASCOT_PLACEMENT_PRESET_9_16`), so no layout overlaps another slot. The opt-in system test `quizShortRender.system.test.ts` checks and renders a five-question specimen in the real HyperFrames browser; run it after changing portrait geometry or styles.

## Cover, title and description

[quizShortCoverService.ts](../apps/server/src/quiz/thumbnail/quizShortCoverService.ts) plans the cover from the hook question, generates it through the portrait image client, normalizes it to 1080x1920 and records a manifest so unchanged inputs reuse the cover. Title and description use the short variants in [quizShortTitleRules.ts](../apps/server/src/quiz/title/quizShortTitleRules.ts) and [quizShortDescriptionGenerator.ts](../apps/server/src/quiz/description/quizShortDescriptionGenerator.ts); metadata needs a confirmation receipt or localization artifact for the language, exactly like Episodes.

## HTTP and web

Routes: [quizShorts.ts](../apps/server/src/routes/quizShorts.ts) (list, get, settings, delete, pipeline start), [quizShortWorkspace.ts](../apps/server/src/routes/quizShortWorkspace.ts) (artifacts, video, render manifest), [quizShortMetadata.ts](../apps/server/src/routes/quizShortMetadata.ts) and [quizShortMetadataEdit.ts](../apps/server/src/routes/quizShortMetadataEdit.ts) (cover, title, description). The web feature is [features/quizShort](../apps/web/src/features/quizShort/) with the channel tab in [ChannelQuizShortsTab.tsx](../apps/web/src/features/channel/components/ChannelQuizShortsTab.tsx) and the API client in [quizShortApi.ts](../apps/web/src/api/quizShortApi.ts). Routes are `/channels/:id/quiz-shorts` and `/channels/:id/quiz-shorts/:quizShortId`.

## Storage

Quiz Short records live under `channels/<slug>/quiz_shorts/<slug>/quiz_short.json` with the same artifact file names as Episodes (`quiz-v2.json`, `director-plan.json`, `timeline.json`, and so on), the cover at `assets/cover.png` and its manifest.

## Verification

Start with [quizShortContracts.test.ts](../packages/shared/test/quizShortContracts.test.ts), then the server suites `quizShortEligibility`, `quizShortConfirmation`, `quizShortQuestionAdapter`, `quizShortDirectorPlan`, `quizShortTimeline`, `quizShortVoicePlan`, `quizShortAssetPlan`, `quizShortPipeline`, `quizShortInvalidation`, `quizShortRepository`, `quizShortVideoRunner`, `quizShortRenderSnapshot`, `quizShortLayoutRegistry`, `quizShortCover`, `quizShortTitle`, `quizShortDescription`, `quizShortMetadataRoutes`, `quizShortWorkspaceRoutes`, and the web suites `ChannelDetailQuizShorts` and `QuizShortView`.
