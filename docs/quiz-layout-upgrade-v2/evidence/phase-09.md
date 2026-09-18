# Phase 09 report: Mystery image, timing and narration

## Status

Complete

## Source and scope

- Current commit: `7f08a3ea8342a9c15a32345cf83a0673293d5023`
- Relevant dirty files before work: None from layout upgrade; dirty files in unrelated mascot/animation areas were preserved intact.
- Requirement IDs: R07, R08, R09, R10, R11
- Files changed:
  - `packages/shared/src/quizRevealTiming.ts` (created: defines `QUIZ_TIMER_EXIT_DURATION_SECONDS = 0.28`, `MYSTERY_SUSPENSE_GAP_SECONDS = 0.5`, `MYSTERY_REVEAL_WIPE_SECONDS = 0.85`, `QuizRevealTimingPlan`, and pure helper `calculateQuizRevealTiming`)
  - `packages/shared/src/events.ts` (updated: added `"timer.hide"` to `QuizTimelineEventTypeSchema`)
  - `packages/shared/src/timing.ts` (updated: `computeSandboxPhaseTimeline` supports `isSingleReveal` option with `timerHideAt: 7.47`, `revealStart: 7.97`, and `explainStart: 8.77`)
  - `packages/shared/src/index.ts` (updated: exported `quizRevealTiming.ts`)
  - `apps/server/src/quiz/render/scene/quizScene.types.ts` (updated: added `timerHideAt?: number` to `QuizSceneTiming`)
  - `apps/server/src/quiz/visual/elements/thinkingBar/types.ts` (updated: `ThinkingBarRenderInput` and `calculateThinkingBarTiming` calculate duration using `timerHideAt ?? revealStart`, emit `--timer-hide-at` and `--timer-exit-start` CSS variables)
  - `apps/server/src/quiz/render/scene/renderQuizSceneParts.ts` (updated: `renderQuizSceneThinkingPart` threads `timerHideAt`)
  - `apps/server/src/quiz/timeline/compilers/question/compileThinkingCountdownBeat.ts` (updated: returns `{ timerHideAt, revealAt }`, sets `revealAt = timerHideAt + 0.5`, emits `timer.hide` event, throws `COUNTDOWN_PACING_OVERFLOW` error when countdown narration exceeds available window)
  - `apps/server/src/quiz/timeline/compilers/questionCompiler.ts` (updated: threads `revealAt` from `compileThinkingCountdownBeat` to `compileAnswerRevealBeat`)
  - `apps/server/src/quiz/timeline/compilers/question/compileChoicesBeat.ts` (updated: omits `choices.enter` and `:choice` narration for `single_reveal`, returns `choiceNarrationEnd = questionNarrationEnd`)
  - `apps/server/src/quiz/timeline/compilers/question/compileAnswerRevealBeat.ts` (updated: omits `answer.dim_wrong` for `single_reveal`, enforces `revealNarrationAt >= revealAt`)
  - `apps/server/src/quiz/timeline/compilers/question/compileExplanationBeat.ts` (updated: omits `fact.enter` visual event for `single_reveal`)
  - `apps/server/src/quiz/audio/voicePlan.ts` (updated: omits `:choice` segment for `single_reveal`)
  - `apps/server/src/quiz/render/scene/productionSceneStateAdapter.ts` (updated: during `[timerHideAt, revealStart)` returns `{ ...baseThinking, thinking: "hidden" }`)
  - `apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts` (updated: `questionClip` accepts `timerHideAt`, `revealPanel` returns `""` for `single_reveal`)
  - `apps/server/src/quiz/render/candyArcade/candyArcadeQuestionTimeline.ts` (updated: bounds computation extracts `timerHideAt` from events or defaults to `revealStart - 0.5`)
  - `apps/server/src/quiz/render/scene/renderQuizScenePhaseParts.ts` (created: exports `shouldRenderFactCard` returning `false` for `mystery_reveal`, renders phase slots omitting fact markup for Mystery)
  - `apps/server/src/quiz/render/sandboxComposition.ts` (updated: rehearsal and snapshot compositions compute single-reveal timeline, thread `timerHideAt`, pass `{ revealMode: "snapshot" }`, and omit visual `factHtml`)
  - `apps/server/src/quiz/render/layouts/styles/mysteryReveal/mysteryRevealBaseStyles.ts` (updated: `--mystery-stage-width: 920px`, `--mystery-stage-height: 540px`, unified stage wrapper geometry `(250, 0, 920, 540)` with border 4px, padding 16px, border-radius 32px)
  - `apps/server/src/quiz/render/layouts/styles/mysteryReveal/mysteryRevealStageStyles.ts` (updated: inner slot `880x500` at `left: 16px; top: 16px;`, 16:9 image `880x495` centered with identical pixel registration across mosaic and revealed layers)
  - `apps/server/src/quiz/render/layouts/styles/mysteryReveal/mysteryRevealChoiceStyles.ts` (updated: candidate strip `(250, 637, 920, 120)` local / `(630, 890, 920, 120)` canvas, single answer card, badges hidden, removed multi-choice / wrong-answer rules, aligned entrance animation directly to `var(--reveal-at)` without `+0.12s` delay)
  - `apps/server/test/quizFrameAnchors.browser.test.ts` (updated: explain phase anchor check verifies `boxes.fact` is `null` for `mystery_reveal`)
  - `apps/server/test/mysteryRuntimePhase09.test.ts` (created: 20 unit tests verifying timing calculation, voice plan narration leak prevention, beat compilers, temporal exclusivity in scene states, fact card omission, and canonical geometry)
- New files and responsibilities:
  - `packages/shared/src/quizRevealTiming.ts`: Pure reveal and suspense timing helpers and constants.
  - `apps/server/src/quiz/render/scene/renderQuizScenePhaseParts.ts`: Shared helper to decouple phase slot rendering and conditionally omit the visual fact card dock for Mystery Reveal across all render paths.
  - `apps/server/test/mysteryRuntimePhase09.test.ts`: Automated test suite for Phase 09 single-reveal runtime and timing contracts.
- Out-of-scope changes preserved:
  - Unrelated mascot and topic history files preserved intact.

## Implementation

- **Stage Geometry & Pixel Registration**:
  - Outer stage: `(630, 253, 920, 540)` canvas, `(250, 0, 920, 540)` local in arena. Height increased from 360 to 540 (+180px).
  - Explicit border: 4px, inner padding: 16px.
  - Inner slot: `(650, 273, 880, 500)` canvas, `(16, 16, 880, 500)` local.
  - Centered 16:9 image content: `(650, 275.5, 880, 495)` canvas with 2.5px vertical margin.
  - Mosaic and revealed layers share identical `880x500` container and `880x495` image dimensions, guaranteeing sub-pixel registration during reveal wipe.
- **Answer Geometry & Clean Up**:
  - Answer surface: `(630, 890, 920, 120)` canvas, `(250, 637, 920, 120)` local.
  - Bottom clearance: `1080 - 1010 = 70px`.
  - Stage to answer gap: `890 - 793 = 97px`.
  - Removed all 0/2/3 choice branches, choice letter badges, and incorrect answer rules.
  - Removed obsolete `+0.12s` entrance delay on `.choice-card`.
- **Narration Safety & Timing**:
  - `buildQuizVoicePlan` omits `:choice` segment for `single_reveal`.
  - `compileChoicesBeat` emits no `choices.enter` event and returns `choiceNarrationEnd = questionNarrationEnd`.
  - `compileThinkingCountdownBeat` emits `timer.hide` event at `timerHideAt` ($T$) and sets `revealAt = T + 0.5s` ($R$).
  - `compileThinkingCountdownBeat` validates countdown narration audio duration against `policy.countdown_seconds`, throwing `COUNTDOWN_PACING_OVERFLOW` on overrun.
  - Suspense interval: $[T, T + 0.5s)$ during which timer is hidden, answer is pending/hidden, and mosaic image remains visible.
  - Reveal narration begins at or after $R$.
  - Fact card visual markup is omitted (`shouldRenderFactCard("mystery_reveal") === false`), while explanation/fact narration remains scheduled.

## Acceptance verification

1. **Stage height & bottom gap**:
   - Stage outer height: `540px` (was `360px`, delta = +180px).
   - Answer surface: `(630, 890, 920, 120)`. Bottom = `1010px`. Canvas bottom clearance = `70px`.
2. **Temporal exclusivity (No timer/answer overlap)**:
   - Suspense interval is exactly `0.5s` ($[T, T + 0.5s)$).
   - `productionSceneStateAt`: `thinking === "visible"` for $t < T$; `thinking === "hidden"` and `answers === "pending"` for $T \le t < R$; `answers === "revealed"` for $t \ge R$.
3. **Narration leak prevention**:
   - No `:choice` segment created by `buildQuizVoicePlan` for `single_reveal`.
   - `choices.enter` visual event suppressed.
   - `answer.dim_wrong` suppressed.
   - Visual fact card node omitted across snapshot, rehearsal, and production.
4. **Automated Unit & Browser Tests**:
   - `mysteryRuntimePhase09.test.ts`: 20/20 passed.
   - `quizFrameAnchors.browser.test.ts`: 55/55 passed (including mystery_reveal fact omission in explain phase).
   - `mysteryDataPhase08.test.ts`: 23/23 passed.
   - `binaryLayoutsPhase07.test.ts`: 9/9 passed.
5. **Typecheck verification**:
   - `pnpm --filter @studio/shared build`: exit code 0.
   - `pnpm --filter @studio/server typecheck`: exit code 0.
   - `pnpm --filter @studio/web typecheck`: exit code 0.

## Exit gate

Phase 09 satisfies all criteria: domain-to-render integration, canonical geometry, 0.5s temporal suspense gap, zero answer leak in narration or visuals, headless browser anchor assertions, and clean TypeScript compilation.
