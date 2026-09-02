# Quiz Reveal Timing Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent answer leakage and align the thinking timer, visual reveal, and reveal voice in Candy Arcade quiz renders.

**Architecture:** Keep timeline semantics and render semantics separate. The compiler owns the reveal timestamp, the thinking-bar renderer owns its local timing origin, and choice rendering exposes a scheduled target without prematurely changing the semantic answer state.

**Tech Stack:** TypeScript, Vitest, HyperFrames HTML/CSS render pipeline

**Spec:** `docs/superpowers/specs/2026-09-02-quiz-reveal-timing-fix-design.md`

## Global Constraints

- Preserve unrelated dirty-worktree changes and modify only quiz/timing tests and implementation files required by this fix.
- Keep sandbox snapshots canonical: reveal/explain use `correct` and `incorrect`; production starts all cards as `pending`.
- Do not render over an existing video; use a separate output file for visual verification.

---

### Task 1: Anchor thinking-bar timing to the thinking window

**Files:**
- Modify: `apps/server/test/thinkingBarVariants.test.ts`
- Modify: `apps/server/src/quiz/visual/elements/thinkingBar/types.ts`
- Modify: `apps/server/src/quiz/visual/elements/thinkingBar/variants/starSlider.ts`
- Modify: `apps/server/src/quiz/visual/elements/thinkingBar/variants/capsuleLiquid.ts`
- Modify: `apps/server/src/quiz/visual/elements/thinkingBar/variants/energyLaser.ts`
- Modify: `apps/server/src/quiz/visual/elements/thinkingBar/variants/constructionMachine.ts`
- Modify: `apps/server/src/quiz/visual/elements/thinkingBar/variants/emberTrail.ts`
- Modify: `apps/server/src/quiz/visual/elements/thinkingBar/variants/cosmicRocket.ts`
- Modify: `apps/server/src/quiz/render/candyArcade/candyArcadeStyles.ts`
- Modify: `apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts`

**Interfaces:**
- Consumes: `ThinkingBarRenderInput { clipStart, thinkingStart, revealStart }`
- Produces: timer CSS variables `--timer-start`, `--timer-duration`, and countdown offsets measured from the thinking window

- [ ] **Step 1: Write failing timer-origin and marker-removal tests**

```ts
const timing = calculateThinkingBarTiming({ clipStart: 3.26, thinkingStart: 10.95, revealStart: 18.27 });
expect(timing.duration).toBe(7.32);
expect(timing.styleAttr).toContain("--timer-start:10.950s");
expect(renderedHtml).not.toContain("val-query");
```

- [ ] **Step 2: Run the focused test and verify the old implementation fails**

Run: `pnpm --filter @studio/server test -- thinkingBarVariants.test.ts`

Expected: failure because duration is calculated from `clipStart` and every variant renders `val-query`.

- [ ] **Step 3: Implement the minimal shared timing contract**

```ts
const timerStart = input.thinkingStart ?? input.clipStart;
const duration = Math.max(0.05, input.revealStart - timerStart);
```

Emit `--timer-start`, remove query fields/markup, and make every timer fill, marker, countdown number, sparkle, and fade use `var(--timer-start)`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm --filter @studio/server test -- thinkingBarVariants.test.ts`

Expected: PASS.

### Task 2: Make reveal voice and visual boundary identical

**Files:**
- Modify: `apps/server/test/quizTimeline.test.ts`
- Modify: `packages/shared/src/timing.ts`
- Modify: `apps/server/src/quiz/timeline/compilers/questionCompiler.ts`
- Modify: `apps/server/src/quiz/render/choices/choiceStateStyles.ts`

**Interfaces:**
- Consumes: `answer.reveal.at_seconds` and default `QuizTimingPolicy`
- Produces: reveal narration event with the same `at_seconds` and scheduled answer CSS starting at `--reveal-at`

- [ ] **Step 1: Write a failing timeline test**

```ts
expect(revealNarration.at_seconds).toBe(reveal.at_seconds);
```

- [ ] **Step 2: Run it to confirm the former `0.12` second default fails**

Run: `pnpm --filter @studio/server test -- quizTimeline.test.ts`

Expected: failure with reveal narration later than `answer.reveal`.

- [ ] **Step 3: Set the default lead to zero and remove the visual offset**

```ts
reveal_voice_lead_seconds: 0,
const revealNarrationAt = round(revealAt + policy.reveal_voice_lead_seconds);
```

Use `calc(var(--clip-start) + var(--reveal-at))` for scheduled correct and incorrect animations.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm --filter @studio/server test -- quizTimeline.test.ts`

Expected: PASS.

### Task 3: Preserve pending production answer state until scheduled reveal

**Files:**
- Modify: `apps/server/test/quizChoiceGroupRenderer.test.ts`
- Modify: `apps/server/test/candyArcade.test.ts`
- Modify: `apps/server/src/quiz/render/choices/choiceGroup.types.ts`
- Modify: `apps/server/src/quiz/render/choices/renderChoiceGroup.ts`
- Modify: `apps/server/src/quiz/render/choices/choiceStateStyles.ts`
- Modify: `apps/server/src/quiz/render/scene/renderQuizSceneParts.ts`
- Modify: `apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts`
- Modify: `apps/server/src/quiz/visual/elements/answerCard/variants/comicChunky.ts`

**Interfaces:**
- Consumes: `ChoiceGroupRenderInput` plus a scheduled reveal mode
- Produces: `data-answer-state="pending"` for production and exactly one `answer-reveal-correct` target per question

- [ ] **Step 1: Write failing renderer and production-composition tests**

```ts
expect(productionHtml.match(/data-answer-state="pending"/g)).toHaveLength(3);
expect(productionHtml).toContain("answer-reveal-correct");
expect(productionHtml).not.toMatch(/class="[^"]*answer-correct/);
```

- [ ] **Step 2: Run them and verify the current reveal-built model fails**

Run: `pnpm --filter @studio/server test -- quizChoiceGroupRenderer.test.ts candyArcade.test.ts`

Expected: failure because production starts with one correct and the remaining incorrect states.

- [ ] **Step 3: Implement scheduled target classes**

```ts
type ChoiceRevealMode = "snapshot" | "scheduled";
```

In scheduled mode, retain pending semantic state, attach `answer-reveal-correct` or `answer-reveal-incorrect`, and animate from neutral `0%` keyframes using `both`. Build production models at `input.start`; leave sandbox render calls on snapshot mode.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `pnpm --filter @studio/server test -- quizChoiceGroupRenderer.test.ts candyArcade.test.ts`

Expected: PASS.

### Task 4: Validate the generated video path

**Files:**
- Verify generated HyperFrames composition and a separately named MP4 output

**Interfaces:**
- Consumes: regenerated episode composition, Q1/Q2 reveal timestamps
- Produces: frame evidence before and after reveal with no leaked correct answer

- [ ] **Step 1: Run affected static checks and tests**

Run: `pnpm --filter @studio/shared build; pnpm --filter @studio/server typecheck; pnpm --filter @studio/server test -- thinkingBarVariants.test.ts quizTimeline.test.ts quizChoiceGroupRenderer.test.ts candyArcade.test.ts`

Expected: all commands exit zero.

- [ ] **Step 2: Regenerate the existing episode composition**

Run the project’s existing episode render-generation path without overwriting the earlier MP4.

- [ ] **Step 3: Run HyperFrames check and boundary snapshots**

Run: `npx hyperframes check --snapshots`

Capture frames before `thinkingStart`, before `revealStart`, and just after `revealStart` for Q1 and Q2.

- [ ] **Step 4: Render and inspect a separate MP4**

Run the project render command with a new output name, verify the file exists and use FFmpeg frames to confirm pending cards before reveal and the correct card only after it.

