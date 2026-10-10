# Quiz Short

Quiz Short is the third content kind next to [Episodes](episode-workflow.md) and [Short Reels](short-reel.md): a 9:16 portrait quiz video with five questions by default, sourced from one Question Bank topic and rendered to MP4 by the [Quiz V2 pipeline](quiz-engine-v2.md). The implementation plan and its phase status live in [quiz-short-plan.md](quiz-short-plan.md).

## Product rules

| Rule | Value |
|---|---|
| Canvas | 1080x1920, `render_aspect_ratio` locked to `9:16` |
| Questions | 3 to 7, default 5, all from one bank topic |
| Pacing | `pacing_profile: "short"`: thinking 3 to 4 seconds, countdown 3 seconds, trimmed holds, target 45 to 60 seconds total |
| Narration | Question text is read. Choices are never read. The reveal reads the correct choice label plus a short answer. |
| Layouts | Exactly two portrait layouts alternate per video (`layout_pair`), question one uses the primary layout |
| Images | At most two images per question. A three-image bank question is adapted by dropping one wrong choice; the bank record is never changed. |
| Bookends | No intro. A fixed 3 second score CTA closes the video ("How many did you get right? Comment below"). |
| Mascot | Visible only during answer reveal beats and the CTA |
| Thumbnail | One 9:16 cover driven by question one |
| Publishing | MP4 plus title and description. No ZIP export. |

## Contracts

- [quizShort.ts](../packages/shared/src/schemas/quizShort.ts): `QuizShortSchema`, `QuizShortConfigSchema`, `QuizShortLayoutPairSchema`, `QuizPacingProfile`.
- [quizProduct.ts](../packages/shared/src/schemas/quizProduct.ts): `QuizProductRef` names the product kind the pipeline is working on. Episodes and Quiz Shorts share the Quiz V2 pipeline through this reference.
- [channel.ts](../packages/shared/src/schemas/channel.ts): `QuizShortTopicCandidateSchema` (`content_kind: "quiz_short"`). [topicSourceBinding.ts](../packages/shared/src/schemas/topicSourceBinding.ts): `TopicContentKindSchema` lists the three kinds in Topics tab order.
- [api/channel.ts](../packages/shared/src/api/channel.ts): `QuizShortTopicConfirmInputSchema`, `ConfirmQuizShortTopicResponseSchema`, `QuizShortSettingsInputSchema`.
- [quizGameplayPolicy.ts](../packages/shared/src/quizGameplayPolicy.ts): `applyPacingProfile` and the `pacingProfile` argument of `gameplayTimingPolicy`. The policy version is 2; director plans built under version 1 regenerate on resume.

## Portrait layouts

The portrait catalog in [quizLayouts.catalog.ts](../packages/shared/src/quizLayouts.catalog.ts) is separate from the landscape catalog; `filterQuizLayoutsByAspectRatio("9:16")` returns it and `getCompatibleQuizLayout` maps across the two.

| Layout | Images | Use |
|---|---|---|
| `short_stack_list` | none | Text questions with 2 or 3 stacked choices |
| `short_media_top_choices` | 1 hero (4:3) | One subject image above stacked choices |
| `short_versus_two` | 2 choice images (3:4) | Side by side comparison or identification |
| `short_verdict_yes_no` | 1 hero (4:3) | Yes or No with two large buttons |

Frame geometry is in [portraitFrame.ts](../packages/shared/src/quizLayoutGeometry/portraitFrame.ts). Reserved zones keep content clear of platform chrome: the top 192 px, the bottom 422 px and the right 151 px of the canvas. Question text is at least 56 px and choice text at least 44 px.

## Storage

Quiz Short records live under `channels/<slug>/quiz_shorts/<slug>/` with the same artifact file names as Episodes (`quiz-v2.json`, `director-plan.json`, `timeline.json`, and so on). Question history entries use the `qshort_` id prefix and `content_type: "quiz_short"`.

## Verification

Start with [quizShortContracts.test.ts](../packages/shared/test/quizShortContracts.test.ts). Server and web suites for each phase are listed in the plan.
