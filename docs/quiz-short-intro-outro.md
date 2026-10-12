# Quiz Short Intro & Outro

Quiz Shorts can open and close on uploaded portrait clips, the 9:16 counterpart of the Episode [Intro & Outro](intro-outro.md) pairs. Each channel has a **Short Intro & Outro** tab grouped by built-in style, and each Quiz Short picks a pair from the category of its own style preset.

## Product rules

| Rule      | Value                                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Media     | Exactly 1080x1920, at least 0.5 seconds, no rotation metadata. Uploaded as a pair into one built-in style; pairs are numbered 001, 002, ... per style.                                                                                                      |
| Intro     | Audio is always removed on upload. The intro is a loop: it is the backdrop for the quiz title, repeated when the title stage outlasts it, and cut as soon as the stage ends. A 10 second loop is enough for any title read.                                 |
| Title     | Drawn inside the pair's `title_canvas` (default x 110, y 280, 860x900 px, the blank panel of the reference intro, above the mascot). A "QUIZ TIME" badge, and the title at the largest size that fits (60 to 132 px).                                       |
| Voice     | The kickoff narration reads the quiz title instead of "Five questions. Ready?". It starts 0.6 seconds in, after the title appears, and words highlight as it is read.                                                                                       |
| Hand-off  | The first question starts 0.8 seconds after the title voice ends, through the pair's transition (stinger swipe, 0.5 seconds).                                                                                                                               |
| Outro     | Replaces the score CTA after the last question and plays in full with no narration. Its own audio is removed unless "Keep the outro's own audio" was checked on upload.                                                                                     |
| BGM       | With or without bookends, a Quiz Short's BGM starts on frame 0 and runs to the last frame. With an outro, the last BGM clip fades out across the whole outro.                                                                                               |
| Selection | `quiz_config.bookend_selection`: `style_builtin` (default, random ready pair of the style category from `resolveBuiltInPresetCategoryId`), `specific_pair`, or `none` (kickoff card and score CTA). Chosen in the Quiz Short "Short Intro & Outro" setting. |

## Pinning and invalidation

The draw is pinned per Short in `channels/<slug>/quiz_short_bookend_selections/<quizShortId>.json` the first time voice is planned, so voice, timeline and render agree. A new draw happens only when the selection key (selection mode plus style category) changes. After a settings change the route re-pins; when the intro or outro appears, disappears or changes length, voice, timeline, QA and render are invalidated. The render checks the timeline against the pin and fails with `QUIZ_SHORT_BOOKEND_TIMELINE_STALE` if they disagree, and with `QUIZ_SHORT_BOOKEND_CHANGED` if the pinned media files changed. Title area edits apply on the next render without re-voicing.

## Code

- Contracts: [quizShortBookends.ts](../packages/shared/src/schemas/quizShortBookends.ts) (pair, title canvas, selection, snapshot) and `bookend_selection` on `QuizShortConfigSchema` and `QuizShortSettingsInputSchema`.
- Storage and upload: [quizShortBookends/](../apps/server/src/quizShortBookends/) (`QuizShortBookendStore`, `QuizShortBookendService`, media processing, selection, settings sync) under `channels/<slug>/quiz_short_bookends/<pair_id>/`. Routes: [quizShortBookends.ts](../apps/server/src/routes/quizShortBookends.ts) (`/api/channels/:channelId/quiz-short-bookends`, `/quiz-short-bookend-categories`).
- Pipeline: [quizShortBookendConfig.ts](../apps/server/src/quiz/pipeline/stages/quizShortBookendConfig.ts) feeds voice and timeline; [shortBookendCompiler.ts](../apps/server/src/quiz/timeline/compilers/shortBookendCompiler.ts) emits the `short_intro` and `short_outro` stages.
- Render: [quizShortBookendPreparation.ts](../apps/server/src/tasks/video/quizShortBookendPreparation.ts) copies the media and sets the BGM window; [shortBookends/](../apps/server/src/quiz/render/candyArcade/shortBookends/) builds the intro clip, title layout and outro clip; styles in [candyArcadeShortBookendStyles.ts](../apps/server/src/quiz/render/candyArcade/styles/candyArcadeShortBookendStyles.ts).
- Web: [features/shortIntroOutro](../apps/web/src/features/shortIntroOutro/) (channel tab, upload, title area editor, preview) and the selector in [QuizShortCustomizationBar.tsx](../apps/web/src/features/quizShort/components/QuizShortCustomizationBar.tsx).

## Verification

`quizShortBookends.test.ts` (upload, muting, numbering, idempotency, categories, title canvas, pinning, settings sync), `quizShortBookendTimeline.test.ts` (title voice, stage timing, outro, QA, title layout, BGM fade), `quizShortBookendRender.test.ts` (composition) and the web suites `ShortIntroOutroTab` and `quizShortBookendOptions`. The opt-in `quizShortBookendRender.system.test.ts` renders a real Short through HyperFrames; set `SHORT_BOOKEND_SAMPLE_DIR` to a folder with `intro.mp4` and `outro.mp4` to render your own clips.
