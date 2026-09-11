# Quiz Layout Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task when available. Steps use checkbox syntax for tracking. Do not create separate user tasks or delegate unless the owner or applicable agent instructions authorize it.

**Goal:** Keep five fixed roles at identical landscape anchors while giving all eight layouts deliberate media and answer geometry.

**Architecture:** A scoped frame wrapper owns fixed geometry. Existing layout renderers own only the media/answer content, preserving public slot and state contracts. Deterministic text measurement participates in the existing render readiness barrier.

**Tech Stack:** TypeScript, HTML/CSS string rendering, existing HyperFrames runtime, Vitest, headless Playwright, existing font and choice-fitting infrastructure.

**Spec:** `01-design-contract.md`, `02-layout-geometry.md`, `03-architecture.md`, and `layout-targets.json` in this directory.

## Global Constraints

- Canvas: 1920 x 1080; all proposal coordinates are canvas-pixel border boxes.
- Do not resize the reference counter/brand components or the 1420 x 168 Question Card.
- Thinking Bar: `(470,882,1240,84)`; Fact Card: `(470,846,1240,156)`.
- Fixed anchors must not depend on layout, choice count, text length, phase, or mascot presence.
- Eight active landscape layouts only; preserve baseline, portrait, Short Reel, intro/outro, IDs, skins, assets, audio, timing, and saved data contracts.
- No production dependency upgrades, new dependencies, commits, mass staging, resets, or unrelated edits without a separate request.
- English-only artifacts and visible strings. Use browser protocols/headless execution, never OS-level input.
- Run the updated renderer and primary workflow before claiming completion. Passing a build alone is insufficient.

## Task 1: Capture the execution baseline and establish contracts

**Files:**

- Read: all files in `03-architecture.md`.
- Create: `apps/server/src/quiz/render/frame/quizFrame.types.ts`.
- Create: `apps/server/src/quiz/render/frame/landscapeFrameGeometry.ts`.
- Create: `apps/server/test/quizFrameGeometry.test.ts`.
- Evidence: preserve this packet's baseline; record execution-time baseline in a new task-owned QA folder.

**Interfaces:**

```ts
export type FrameRect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type FixedFrameRole = "counter" | "question" | "brand" | "thinking" | "fact";
export type LandscapeFrameGeometry = Readonly<{
  canvas: Readonly<{ width: number; height: number }>;
  question: FrameRect;
  thinking: FrameRect;
  fact: FrameRect;
  arena: FrameRect;
  timerProtection: FrameRect;
  counter: Readonly<{ centerX: number; top: number }>;
  brand: Readonly<{ centerX: number; top: number; width: number }>;
}>;
```

- [ ] Record `git status --short`, inspect `AGENTS.md`, use CodeGraph first if indexed. Do not include unrelated dirty files in the patch.
- [ ] Verify the eight current layout IDs and the measured Media Left baseline. If the latest source has changed the approved reference size/anchor materially, stop and explain the discrepancy before redefining the target.
- [ ] Add failing tests for exact fixed geometry, +60 timer shift, shared dock center, and arena containment. Example assertions:

```ts
expect(LANDSCAPE_FRAME.thinking).toEqual({ x: 470, y: 882, width: 1240, height: 84 });
expect(LANDSCAPE_FRAME.thinking.y - 822).toBe(60);
expect(LANDSCAPE_FRAME.fact.y + LANDSCAPE_FRAME.fact.height / 2).toBe(924);
expect(LANDSCAPE_FRAME.question).toEqual({ x: 380, y: 53, width: 1420, height: 168 });
```

- [ ] Run `pnpm --filter @studio/server exec vitest run test/quizFrameGeometry.test.ts`; confirm the expected missing implementation failure.
- [ ] Define immutable `LANDSCAPE_FRAME: LandscapeFrameGeometry` from the JSON values. Do not import documentation JSON at production runtime; copy the agreed constants into the deliberate source module and verify correspondence in tests.
- [ ] Re-run the test and record pass/fail output.

## Task 2: Integrate the shared frame on all three rendering paths

**Files:**

- Create: `apps/server/src/quiz/render/frame/renderQuizFrameBody.ts`, `quizFrameStyles.ts`.
- Modify: `apps/server/src/quiz/render/layouts/*.ts`, `layouts/registry.ts` only as needed for compatibility.
- Modify: `apps/server/src/quiz/render/candyArcade/candyArcadeClips.ts`, `candyArcadeStyles.ts`, `channelBrandMark.ts` through small integration changes.
- Modify: `apps/server/src/quiz/render/sandboxComposition.ts`, `sandbox/sandboxDocumentTemplates.ts`.
- Create tests: `apps/server/test/quizFrameMarkup.test.ts`, `quizFrameAnchors.browser.test.ts`.

**Interfaces:** preserve existing `QuizLayoutSlots`; add these internal helpers:

```ts
export function renderQuizFrameBody(slots: QuizLayoutSlots, contentHtml: string): string;
export function renderQuizPhaseSlots(thinkingHtml: string, factHtml: string): string;
export function isUnifiedQuizFrame(layoutId: QuizPreviewLayoutId, aspectRatio: MascotRenderAspectRatio): boolean;
export function quizFrameCss(): string;
```

- [ ] Write failing markup tests: one question anchor, one content anchor, one timer wrapper, one fact wrapper per question; no duplication in Mystery's two hero layers; baseline still works.
- [ ] Write browser tests comparing fixed wrappers at matching phase-local times across all eight layouts. Test actual counter/brand nodes as well as wrapper geometry. Start with the current code to demonstrate the drift, using the baseline table in `03-architecture.md`.
- [ ] Implement the shared frame body using explicit slots, for example:

```ts
return (
  `<div class="quiz-question-anchor" data-quiz-fixed="question">${slots.questionBoxHtml}</div>` +
  `<div class="quiz-content-anchor" data-quiz-content>${contentHtml}</div>` +
  `<div class="phase-region">${slots.phaseHtml}</div>`
);
```

- [ ] Implement phase wrappers without HTML parsing:

```ts
return (
  `<div class="quiz-thinking-anchor" data-quiz-fixed="thinking">${thinkingHtml}</div>` +
  `<div class="quiz-fact-anchor" data-quiz-fixed="fact">${factHtml}</div>`
);
```

- [ ] Mark only active 16:9 question scenes `quiz-frame-unified` in production, sandbox snapshot, and sandbox rehearsal. Preserve all original timed attributes and IDs.
- [ ] Give the shared `.game-stage` an absolute full-canvas coordinate system; apply fixed wrappers from `LANDSCAPE_FRAME`. Reset internal positional CSS, for example:

```css
.quiz-frame-unified .game-stage {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  max-width: none;
  min-height: 0;
  margin: 0;
  padding: 0;
  display: block;
}
.quiz-frame-unified .quiz-question-anchor {
  position: absolute;
  left: 380px;
  top: 53px;
  width: 1420px;
  height: 168px;
}
.quiz-frame-unified .quiz-question-anchor .question-title {
  width: 100%;
  max-width: 100%;
  height: 100%;
  margin: 0;
}
.quiz-frame-unified .phase-region {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  margin: 0;
  transform: none;
  pointer-events: none;
}
.quiz-frame-unified .quiz-thinking-anchor {
  position: absolute;
  left: 470px;
  top: 882px;
  width: 1240px;
  height: 84px;
}
.quiz-frame-unified .quiz-thinking-anchor > .thinking-bar {
  position: relative;
  inset: auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0;
  transform: none;
}
.quiz-frame-unified .quiz-fact-anchor {
  position: absolute;
  left: 470px;
  top: 846px;
  width: 1240px;
  height: 156px;
}
```

Generate numeric declarations from the source constants, not duplicate literal geometry in production modules. Complete counter/brand rules from the contract, preserving their intrinsic sizing.

- [ ] Replace coordinate-bearing timer exit transforms with scoped inner-only opacity/scale motion. Remove migrated snapshot fact `translateX(-50%)`; retain visibility and timing. Verify the first and final 0.28 seconds of the timer.
- [ ] Remove migrated fixed-role geometry from all eight layout CSS definitions, including `.has-mascot` conflicts. Keep baseline/portrait-specific rules behind their existing paths.
- [ ] Re-run markup/anchor tests; inspect each default thinking/explain snapshot before continuing.

## Task 3: Implement media/answer geometry for all eight layouts

**Files:**

- Create: `apps/server/src/quiz/render/layouts/layoutContentGeometry.ts`.
- Modify: all eight layout files, `layouts/styles/splitVersusTwoStyles.ts`, and focused Mystery/Clue style modules.
- Modify when needed: focused choice components/styles in `apps/server/src/quiz/render/choices/`.
- Reconcile: `packages/shared/src/quizLayouts.catalog.ts` render metrics only; preserve capability and asset ceilings.
- Create tests: `apps/server/test/quizLayoutContentGeometry.test.ts`, `quizLayoutContent.browser.test.ts`.

**Interfaces:**

```ts
export type LayoutContentGeometry = Readonly<{
  hero: FrameRect | null;
  answers: Readonly<Partial<Record<0 | 1 | 2 | 3, readonly FrameRect[]>>>;
}>;
export const LAYOUT_CONTENT_GEOMETRY: Readonly<Record<ResolvedQuizLayoutId, LayoutContentGeometry>>;
```

Specialized panel/header/VS/internal-media contracts stay in the corresponding layout module or an explicit extended geometry type; do not hide them in `any` or unbounded maps.

- [ ] Add tests for every count in JSON. Compare each answer composite border box, not just its background. Example:

```ts
expect(LAYOUT_CONTENT_GEOMETRY.media_left_choices_right.answers[3]).toEqual([
  { x: 1140, y: 274, width: 660, height: 132 },
  { x: 1140, y: 442, width: 660, height: 132 },
  { x: 1140, y: 610, width: 660, height: 132 },
]);
expect(LAYOUT_CONTENT_GEOMETRY.full_stack_list.hero).toBeNull();
expect(LAYOUT_CONTENT_GEOMETRY.mystery_reveal.answers[0]).toEqual([]);
```

- [ ] Run the new tests to confirm failure; implement Media Left, Verdict, and Full Stack using the exact rectangles and count-specific group centering.
- [ ] Implement Visual Three, Pure Three, and Split Versus with composite media/label sizing. In Split text mode, preserve two text candidates without empty media. Fit inside the parent choice group so existing DOM fit checks remain meaningful.
- [ ] Implement Mystery's 920 x 360 matched reveal layers and separate answer strip. Rebind scanner and clipping geometry to that viewport. Keep answers out of the hero's clipping wrapper.
- [ ] Implement Clue's dossier header/evidence-left/candidates-right composition and exact zero/one/two/three-count cases. Preserve gameplay timing and existing clue data; no new data requirements.
- [ ] Apply scoped typography and badge tokens from `02-layout-geometry.md`; do not leak these into baseline or Short Reel.
- [ ] Reconcile render-area metrics with media viewports used by each layout and add narrow metric assertions in existing capability tests. For no-media text modes, do not falsely claim image coverage.
- [ ] Re-run geometry and browser tests with short/long English labels, transparent subjects, tall/wide images, every correct-answer index, and all four answer skins. Check full bounds at peak reveal transforms.

## Task 4: Add deterministic Fact Card fitting and failure reporting

**Files:**

- Create: `apps/server/src/quiz/render/facts/factTextFitPolicy.ts`, `factTextFitScript.ts`.
- Modify narrowly: `apps/server/src/quiz/render/candyArcade/candyArcadeFonts.ts` readiness integration and all three fact HTML producers through a focused renderer if needed.
- Create: `apps/server/test/factTextFit.test.ts`, `factTextFit.browser.test.ts`.
- Reuse: existing preview/font-ready and render error paths; no new database or UI workflow.

**Interfaces:**

```ts
export type FactFitResult =
  { status: "fit"; fontSize: number; lineHeight: number } | { status: "overflow"; code: "QUIZ_FACT_TEXT_OVERFLOW" };
export function resolveFactFit(fits: (fontSize: number, lineHeight: number, maxLines: number) => boolean): FactFitResult;
export function factTextFitScript(): string;
```

- [ ] Test preferred fit, smallest valid fit, and overflow before implementation:

```ts
expect(resolveFactFit(() => true)).toEqual({ status: "fit", fontSize: 38, lineHeight: 1.2 });
expect(resolveFactFit((size) => size <= 32)).toEqual({ status: "fit", fontSize: 32, lineHeight: 1.15 });
expect(resolveFactFit(() => false)).toEqual({ status: "overflow", code: "QUIZ_FACT_TEXT_OVERFLOW" });
```

- [ ] Implement the pure search, then a browser adapter measuring full text line boxes, scroll bounds, and the 156 px card's inner dimensions. Do not measure only a clamped element.
- [ ] Run fact fitting after local fonts load and before any ready flag. Fit invisible-but-laid-out future fact nodes too; skip only genuinely absent cards. Report overflow with the containing question identifier and preserve source text.
- [ ] Ensure fallback code does not report success after an overflow. Verify repeated fit calls are deterministic and a long fact cannot move the fixed shell.
- [ ] Verify short, two-line, three-line and oversized facts plus font-load failure on snapshot, rehearsal, and production paths.

## Task 5: Prove parity, timing, and preview synchronization

**Files:**

- Extend: `apps/server/test/helpers/visualSnapshotHarness.ts`, `quizPixelVisualRegression.test.ts`.
- Extend relevant tests: `quizPreviewProductionStyleParity.test.ts`, `quizScenePipeline.test.ts`, `thinkingBarVariants.test.ts`, `channelBrandMark.test.ts`, `quizMysteryReveal.test.ts`, `quizClueDeduction.test.ts`.
- Regression-test: `apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx`, `apps/web/src/features/episode/hooks/useEpisodeStylePreview.test.tsx`.
- Evidence: screenshots, bounding-box JSON, local preview URLs, commands, and rendered diagnostic clip metadata.

- [ ] Extend the current reveal-only visual fixture matrix to question, choices, thinking, reveal, explain; do not rely on its hardcoded 6-second snapshot for every phase.
- [ ] Compare production, rehearsal, and snapshot anchors at equivalent **local event times**, including a non-first question whose global clip start is nonzero. Test forward seek, backward seek, replay, and repeat captures.
- [ ] Exercise every built-in timer skin in the shared outer slot. Compute full marker/art envelopes over at least 30 evenly spaced local samples plus event boundaries. Treat out-of-envelope text or marker art as a failure.
- [ ] Verify real mascot configurations: absent, default bottom-left, bottom-right, maximum configured scale and offsets. Report a user-config collision explicitly instead of changing fixed positions.
- [ ] Run async preview tests: rapid layout A->B->C, slow old response arriving last, failed preview followed by retry, phase switch while loading, and font error recovery. Only newest response may replace the visible preview; errors must not erase user settings.
- [ ] Run the commands in `05-acceptance.md`; rebuild/restart affected processes and verify the actual UI preview using the new renderer.
- [ ] Produce short local diagnostic video clips using existing authorized test/fixture paths. Do not submit new paid jobs, mutate an episode, or render a full user video just for QA. If real-episode preview is unavailable without new authority, report that limit and use representative existing local fixture assets.
- [ ] Inspect real rendered frames at full canvas and reduced viewing sizes. Obtain owner approval for the proposed visual result before replacing committed pixel baselines. Regenerate only intentional baselines, then rerun without update mode.
- [ ] Review the final diff for duplicated fixed geometry, overly broad selectors, unsafe clipping, stale metrics, unbounded functions, changed timing, and unrelated edits. Report unverified items; do not mark them passed.

## Completion report

Provide fixed-anchor measurements for all eight layouts, before/after drawings or captures, tested content/count/skin matrix, actual command outputs, runtime restart evidence, local diagnostic video metadata, and any explicit limitations. Do not claim the full implementation is complete while a primary preview or render path remains unverified.
