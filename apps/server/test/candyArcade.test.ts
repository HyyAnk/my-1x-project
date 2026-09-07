import { describe, expect, it } from "vitest";
import {
  AssetConsistencyGroupSchema,
  DEFAULT_QUIZ_PALETTE_FALLBACK,
  QuizV2Schema,
  resolveQuizLayout,
  serializeQuizPaletteCss,
  serializeQuizPaletteCssVariables,
  serializeQuizPaletteInlineStyle,
  type MascotProfile,
  type QuizBackgroundStyle,
} from "@studio/shared";
import { compileQuizAssetPrompt } from "../src/quiz/assets/promptCompiler.js";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { buildQuizVoicePlan, ENGLISH_OUTRO_CLOSING_VARIANTS } from "../src/quiz/audio/voicePlan.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { assessQuiz } from "../src/quiz/qa/quizAssessment.js";
import { assessQuizVisualLayout } from "../src/quiz/qa/visualQa.js";
import {
  buildCandyArcadeComposition,
  buildCandyArcadeCompositionBundle,
  candyArcadeHeroAreaRatio,
} from "../src/quiz/render/candyArcadeComposition.js";
import { candyArcadeCss } from "../src/quiz/render/candyArcade/candyArcadeStyles.js";
import { baseChoiceStyles } from "../src/quiz/render/choices/baseChoiceStyles.js";
import { choiceTypographyStyles } from "../src/quiz/render/choices/choiceTypographyStyles.js";
import { choiceStateStyles } from "../src/quiz/render/choices/choiceStateStyles.js";
import { fullStackListLayout } from "../src/quiz/render/layouts/fullStackList.js";
import { mediaLeftChoicesRightLayout } from "../src/quiz/render/layouts/mediaLeftChoicesRight.js";
import { visualChoicesThreeLayout } from "../src/quiz/render/layouts/visualChoicesThree.js";
import { splitVersusTwoLayout } from "../src/quiz/render/layouts/splitVersusTwo.js";
import { verdictTrueFalseLayout } from "../src/quiz/render/layouts/verdictTrueFalse.js";
import { mysteryRevealLayout } from "../src/quiz/render/layouts/mysteryReveal.js";
import { clueDeductionLayout } from "../src/quiz/render/layouts/clueDeduction.js";
import { baselineLayout } from "../src/quiz/render/layouts/baseline.js";
import { glossyArcadeVariant } from "../src/quiz/visual/elements/answerCard/variants/glossyArcade.js";
import { comicChunkyVariant } from "../src/quiz/visual/elements/answerCard/variants/comicChunky.js";
import { glassNeonVariant } from "../src/quiz/visual/elements/answerCard/variants/glassNeon.js";
import { minimalSoftVariant } from "../src/quiz/visual/elements/answerCard/variants/minimalSoft.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";
import { resolveBackgroundVariant } from "../src/quiz/visual/elements/background/index.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import {
  ambientPhaseSeconds,
  candyArcadePalettes,
  candyArcadeTemplate,
  quizTimerState,
  resolvePalette,
  textLayout,
  textTier,
  timelineProgress,
  visualAnswerState,
} from "../src/quiz/visual/candyArcade.js";
import { styleBoundaryQuiz } from "./quizStyleBoundaryFixtures.js";

const quiz = QuizV2Schema.parse({
  schema_version: 2,
  episode_id: "candy-demo",
  age_band: "7-9",
  language: "English",
  questions: [
    {
      id: "question-01",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which ocean is the largest on Earth?",
      choices: [
        { id: "choice-a", text: "Pacific Ocean" },
        { id: "choice-b", text: "Atlantic Ocean" },
        { id: "choice-c", text: "Arctic Ocean" },
      ],
      correct_choice_id: "choice-b",
      explanation: "The Pacific Ocean covers the largest area.",
      fun_fact: "",
      source_ids: ["C01"],
      visual_opportunity: "A bright globe with the Pacific Ocean",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
    {
      id: "question-02",
      number: 2,
      format: "odd_one_out",
      difficulty: 2,
      question: "Which animal can sprint the fastest?",
      choices: [
        { id: "choice-a", text: "Cheetah" },
        { id: "choice-b", text: "Turtle" },
        { id: "choice-c", text: "Elephant" },
      ],
      correct_choice_id: "choice-a",
      explanation: "Cheetahs sprint very quickly for short distances.",
      fun_fact: "",
      source_ids: ["C02"],
      visual_opportunity: "A friendly cheetah",
      validation: { semantic_status: "validated", source_coverage: true, fact_locked: true },
    },
  ],
});

const dummyMascot: MascotProfile = {
  id: "mascot-1",
  name: "Buddy",
  description: "Friendly mascot",
  visual_style: "pixar_3d",
  master_prompt: "",
  master_image_url: null,
  color_theme: "#06b6d4",
  assigned_channel_ids: ["ch-1"],
  actions: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("Candy Arcade visual template", () => {
  it("reserves AA-compliant colors for text on light cards and bright badges", () => {
    for (const palette of candyArcadePalettes) {
      expect(contrastRatio(palette.surfaceAccent, palette.surface), `${palette.id} surface accent`).toBeGreaterThanOrEqual(4.5);
      for (const background of [palette.accent, palette.answerBadge, palette.correct, palette.incorrect]) {
        expect(contrastRatio(palette.onAccent, background), `${palette.id} badge ink on ${background}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("uses reusable tokens and never auto-repeats a palette", () => {
    expect(candyArcadeTemplate.tokens.safeArea.left).toBeGreaterThan(0);
    expect(candyArcadeTemplate.tokens.typography.question.family).toContain("SVN-Hello Headline");
    expect(candyArcadeTemplate.tokens.typography.question.family).toContain("Fredoka");
    const first = resolvePalette("auto", 0);
    expect(resolvePalette("auto", 0, first.id).id).not.toBe(first.id);
  });

  it("mounts scene files without parent-traversal asset paths", () => {
    const director = createDefaultDirectorPlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
    const bundle = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
    });

    expect(bundle.html).toContain('data-composition-src="compositions/candy-intro.html"');
    expect(bundle.html).toContain('class="clip sfx-clip"');
    expect(bundle.html).toContain("ui_pop.wav");
    expect(bundle.html).toContain("correct_ding.wav");
    expect(bundle.html).toContain("data-no-timeline");
    expect(Object.keys(bundle.files)).toContain("compositions/candy-intro.html");
    expect(Object.values(bundle.files).every((file) => file.includes("data-no-timeline"))).toBe(true);
    expect(Object.values(bundle.files).every((file) => !file.includes('src="../'))).toBe(true);
    expect(Object.values(bundle.files).every((file) => !file.includes("data-start="))).toBe(true);
    expect(Object.values(bundle.files).every((file) => !file.includes("data-track-index="))).toBe(true);
    expect(bundle.html.match(/data-composition-src=/g)).toHaveLength(Object.keys(bundle.files).length);
  });

  it("fails closed before rendering a quiz with a fourth answer", () => {
    const director = createDefaultDirectorPlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
    const invalidQuiz = {
      ...quiz,
      questions: [
        {
          ...quiz.questions[0],
          choices: [...quiz.questions[0].choices, { id: "choice-d", text: "Forbidden fourth answer" }],
        },
      ],
    };

    expect(() =>
      buildCandyArcadeCompositionBundle({
        quiz: invalidQuiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
      }),
    ).toThrow();
  });

  it("selects semantic layouts and deterministic readable text tiers", () => {
    expect(resolvedLayout("illustrated_multiple_choice", "multiple_choice")).toBe("media_left_choices_right");
    expect(resolvedLayout("illustrated_multiple_choice", "image_guess")).toBe("media_left_choices_right");
    expect(resolvedLayout("visual_multiple_choice", "odd_one_out")).toBe("visual_choices_three_pure");
    // Question text layout - Mascot OFF: [28, 50, 85, 135, 176]
    const ultraShortQOff = textLayout("Who was the first?", "question", { hasMascot: false });
    expect(ultraShortQOff.tier).toBe("ultra_short");
    expect(ultraShortQOff.fontSize).toBe(74);
    expect(ultraShortQOff.maxLines).toBe(1);

    const shortQOff = textLayout("Which ocean is the largest on Earth?", "question", { hasMascot: false });
    expect(shortQOff.tier).toBe("short");
    expect(shortQOff.fontSize).toBe(64);
    expect(shortQOff.fits).toBe(true);

    const overflowQOff = textLayout("x".repeat(190), "question", { hasMascot: false });
    expect(overflowQOff.tier).toBe("overflow");
    expect(overflowQOff.fits).toBe(false);

    // Question text layout - Mascot ON: [22, 44, 76, 125, 165]
    const ultraShortQOn = textLayout("What is Paris?", "question", { hasMascot: true });
    expect(ultraShortQOn.tier).toBe("ultra_short");
    expect(ultraShortQOn.fontSize).toBe(70);
    expect(ultraShortQOn.maxLines).toBe(1);

    const shortQOn = textLayout("Which ocean is the largest on Earth?", "question", { hasMascot: true });
    expect(shortQOn.tier).toBe("short");
    expect(shortQOn.fontSize).toBe(60);
    expect(shortQOn.fits).toBe(true);

    const overflowQOn = textLayout("x".repeat(170), "question", { hasMascot: true });
    expect(overflowQOn.tier).toBe("overflow");
    expect(overflowQOn.fits).toBe(false);

    // Mascot OFF mode for choices: standard limits [18, 34, 58, 82]
    const offLayout = textLayout("Pacific Oceanic", "choice", { hasMascot: false });
    expect(offLayout.tier).toBe("short");
    expect(offLayout.fontSize).toBe(34);

    // Mascot ON mode for choices: narrower limits [10, 22, 40, 60] -> 15-char string shifts to medium tier to avoid clipping
    const onLayout = textLayout("Pacific Oceanic", "choice", { hasMascot: true });
    expect(onLayout.tier).toBe("medium");
    expect(onLayout.fontSize).toBe(24);

    // Ultra short choice text remains short tier in Mascot ON mode
    const shortOnLayout = textLayout("Paris", "choice", { hasMascot: true });
    expect(shortOnLayout.tier).toBe("short");
    expect(shortOnLayout.fontSize).toBe(28);
  });

  it("defaults textLayout and textTier to canonical Mascot-Ready 1420px grid when options or hasMascot is omitted", () => {
    // Question limits: [22, 44, 76, 125, 165]
    // ultra_short: <= 22 -> 70px
    // short: <= 44 -> 60px
    // medium: <= 76 -> 50px
    // long: <= 125 -> 42px
    // very_long: <= 165 -> 35px
    // overflow: > 165 -> 30px, fits: false
    const qUltraShort = textLayout("x".repeat(22), "question");
    expect(qUltraShort.tier).toBe("ultra_short");
    expect(qUltraShort.fontSize).toBe(70);
    expect(qUltraShort.lineHeight).toBe(1.12);
    expect(qUltraShort.maxLines).toBe(1);
    expect(qUltraShort.fits).toBe(true);

    const qShort = textLayout("x".repeat(44), "question");
    expect(qShort.tier).toBe("short");
    expect(qShort.fontSize).toBe(60);
    expect(qShort.lineHeight).toBe(1.15);
    expect(qShort.maxLines).toBe(2);
    expect(qShort.fits).toBe(true);

    const qMedium = textLayout("x".repeat(76), "question", {});
    expect(qMedium.tier).toBe("medium");
    expect(qMedium.fontSize).toBe(50);
    expect(qMedium.lineHeight).toBe(1.18);
    expect(qMedium.maxLines).toBe(2);
    expect(qMedium.fits).toBe(true);

    const qLong = textLayout("x".repeat(125), "question", { layoutId: "media_left_choices_right" });
    expect(qLong.tier).toBe("long");
    expect(qLong.fontSize).toBe(42);
    expect(qLong.lineHeight).toBe(1.2);
    expect(qLong.maxLines).toBe(2);
    expect(qLong.fits).toBe(true);

    const qVeryLong = textLayout("x".repeat(165), "question");
    expect(qVeryLong.tier).toBe("very_long");
    expect(qVeryLong.fontSize).toBe(35);
    expect(qVeryLong.lineHeight).toBe(1.22);
    expect(qVeryLong.maxLines).toBe(2);
    expect(qVeryLong.fits).toBe(true);

    const qOverflow = textLayout("x".repeat(166), "question");
    expect(qOverflow.tier).toBe("overflow");
    expect(qOverflow.fontSize).toBe(30);
    expect(qOverflow.lineHeight).toBe(1.24);
    expect(qOverflow.maxLines).toBe(2);
    expect(qOverflow.fits).toBe(false);

    // Choice limits: [10, 22, 40, 60]
    // short: <= 10 -> 28px
    // medium: <= 22 -> 24px
    // long: <= 40 -> 21px
    // very_long: <= 60 -> 18px
    // overflow: > 60 -> 18px, fits: false
    const cShort = textLayout("x".repeat(10), "choice");
    expect(cShort.tier).toBe("short");
    expect(cShort.fontSize).toBe(28);
    expect(cShort.lineHeight).toBe(1.1);
    expect(cShort.maxLines).toBe(2);
    expect(cShort.fits).toBe(true);

    const cMedium = textLayout("x".repeat(22), "choice", {});
    expect(cMedium.tier).toBe("medium");
    expect(cMedium.fontSize).toBe(24);
    expect(cMedium.lineHeight).toBe(1.12);
    expect(cMedium.maxLines).toBe(2);
    expect(cMedium.fits).toBe(true);

    const cLong = textLayout("x".repeat(40), "choice", { layoutId: "baseline" });
    expect(cLong.tier).toBe("long");
    expect(cLong.fontSize).toBe(21);
    expect(cLong.lineHeight).toBe(1.15);
    expect(cLong.maxLines).toBe(3);
    expect(cLong.fits).toBe(true);

    const cVeryLong = textLayout("x".repeat(60), "choice");
    expect(cVeryLong.tier).toBe("very_long");
    expect(cVeryLong.fontSize).toBe(18);
    expect(cVeryLong.lineHeight).toBe(1.16);
    expect(cVeryLong.maxLines).toBe(3);
    expect(cVeryLong.fits).toBe(true);

    const cOverflow = textLayout("x".repeat(61), "choice");
    expect(cOverflow.tier).toBe("overflow");
    expect(cOverflow.fontSize).toBe(18);
    expect(cOverflow.lineHeight).toBe(1.16);
    expect(cOverflow.maxLines).toBe(3);
    expect(cOverflow.fits).toBe(false);

    // Direct textTier calls verify omission of options defaults to Mascot-Ready thresholds
    expect(textTier("x".repeat(22), "question")).toBe("ultra_short");
    expect(textTier("x".repeat(23), "question")).toBe("short");
    expect(textTier("x".repeat(10), "choice")).toBe("short");
    expect(textTier("x".repeat(11), "choice")).toBe("medium");
  });

  it("maps answer state only from the canonical QuizV2 choice", () => {
    expect(visualAnswerState("choice-b", "choice-b", "reveal")).toBe("correct");
    expect(visualAnswerState("choice-a", "choice-b", "reveal")).toBe("incorrect");
    expect(visualAnswerState("choice-a", "choice-b", "idle")).toBe("idle");
  });

  it("derives thinking and transition progress from timeline time", () => {
    expect(timelineProgress(10, 20, 10)).toBe(0);
    expect(timelineProgress(10, 20, 15)).toBe(0.5);
    expect(timelineProgress(10, 20, 32)).toBe(1);
  });

  it("couples timer fill and marker to one seek-deterministic normalized value", () => {
    for (const value of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const state = quizTimerState(10, 20, 10 + value * 10);
      expect(state.boundary).toBe(state.remaining);
      expect(quizTimerState(10, 20, 10 + value * 10)).toEqual(state);
    }
    for (const fps of [24, 30, 60]) {
      const samples = Array.from({ length: fps * 2 + 1 }, (_, index) => quizTimerState(0, 2, index / fps).boundary);
      expect(samples.every((value, index) => index === 0 || value <= samples[index - 1])).toBe(true);
    }
  });

  it("assigns stable ambient phases without runtime randomness", () => {
    expect(ambientPhaseSeconds("float", 1, "question-02")).toBe(ambientPhaseSeconds("float", 1, "question-02"));
    expect(ambientPhaseSeconds("float", 1, "question-02")).not.toBe(ambientPhaseSeconds("float", 2, "question-02"));
    expect(ambientPhaseSeconds("none", 4, "question-02")).toBe(0);
  });

  it("compiles purpose-specific image prompts and checks visual layout semantically", () => {
    const director = createDefaultDirectorPlan(quiz);
    const visualBeat = director.beats[1];
    expect(visualBeat.layout_id).toBe("visual_choices_three_pure");
    const assetPlan = planQuizAssets(quiz, director);
    const option = assetPlan.assets.find((asset) => asset.asset_id === "asset-question-02-choice-a")!;
    const group = assetPlan.consistency_groups.find((candidate) => candidate.group_id === option.consistency_group_id)!;
    const prompt = compileQuizAssetPrompt(option, group);
    expect(prompt.prompt).toContain("consistent with the other answer options");
    expect(prompt.prompt).toContain("Every option in this set must share this exact art direction");
    expect(prompt.prompt).toContain("No words");
    expect(group.face_policy).toBe("natural_only");
    expect(prompt.prompt).toContain("face policy natural_only");
    expect(prompt.prompt).toContain("Use facial features only when naturally present in the subject");
    const { face_policy: _facePolicy, ...groupWithoutFacePolicy } = group;
    expect(AssetConsistencyGroupSchema.parse(groupWithoutFacePolicy).face_policy).toBe("natural_only");
    const hero = assetPlan.assets.find((asset) => asset.asset_id === "asset-question-01-hero")!;
    const heroPrompt = compileQuizAssetPrompt(hero);
    expect(heroPrompt.prompt).toContain("3D Pixar Animation");
    expect(heroPrompt.prompt).toContain("soft cinematic studio lighting");
    expect(heroPrompt.prompt).toContain("Face policy: natural_only");
    expect(heroPrompt.prompt).toContain("cinematic 3D environment");

    // Test other visual styles
    const vectorPrompt = compileQuizAssetPrompt(hero, undefined, "flat_vector");
    expect(vectorPrompt.prompt).toContain("2D Flat Vector");
    expect(vectorPrompt.prompt).toContain("vibrant modern vector landscape");

    const realismPrompt = compileQuizAssetPrompt(hero, undefined, "natural_realism");
    expect(realismPrompt.prompt).toContain("Cinematic Realism");
    expect(realismPrompt.prompt).toContain("breathtaking authentic natural landscape");

    const plasticToyPrompt = compileQuizAssetPrompt(hero, undefined, "plastic_toy");
    expect(plasticToyPrompt.prompt).toContain("3D Glossy Vinyl Toy");
    expect(plasticToyPrompt.prompt).toContain("cute painted glossy eyes with expressive pupils");
    expect(plasticToyPrompt.prompt).toContain(
      "Living creatures, characters, dinosaurs, and animals must have complete, expressive natural eyes",
    );
    expect(plasticToyPrompt.cacheVersion).toContain("v3-expressive-faces");

    expect(assessQuizVisualLayout({ quiz, director }).filter((issue) => issue.severity === "blocker")).toEqual([]);
    const fairnessIssues = assessQuizVisualLayout({ quiz, director, assetPlan });
    expect(fairnessIssues.filter((issue) => issue.severity === "blocker")).toEqual([]);
    expect(fairnessIssues.some((issue) => issue.code === "needs_visual_review")).toBe(true);
  });

  it("accounts for question-phase Mascot occupancy in fallback text QA", () => {
    const longChoiceQuiz = QuizV2Schema.parse({
      ...quiz,
      episode_id: "candy-mascot-choice-capacity",
      questions: [
        {
          ...quiz.questions[0],
          choices: [{ ...quiz.questions[0].choices[0], text: "x".repeat(61) }, ...quiz.questions[0].choices.slice(1)],
        },
      ],
    });
    const director = createDefaultDirectorPlan(longChoiceQuiz);
    const hasChoiceOverflow = (issues: ReturnType<typeof assessQuizVisualLayout>) =>
      issues.some((issue) => issue.code === "layout_choice_overflow");

    expect(hasChoiceOverflow(assessQuizVisualLayout({ quiz: longChoiceQuiz, director, hasMascot: false }))).toBe(false);
    expect(hasChoiceOverflow(assessQuizVisualLayout({ quiz: longChoiceQuiz, director, hasMascot: true }))).toBe(true);
    // Omitting hasMascot defaults to canonical Mascot-Ready 1420px grid
    expect(hasChoiceOverflow(assessQuizVisualLayout({ quiz: longChoiceQuiz, director }))).toBe(true);

    const assessWithQuestionMascot = (showInQuestion: boolean) =>
      assessQuiz({
        quiz: longChoiceQuiz,
        director,
        mascot: dummyMascot,
        mascotConfig: {
          mascot_id: dummyMascot.id,
          enabled: true,
          position: "bottom_left",
          scale: 1,
          show_in_question: showInQuestion,
        },
      }).issues;

    expect(hasChoiceOverflow(assessWithQuestionMascot(false))).toBe(false);
    expect(hasChoiceOverflow(assessWithQuestionMascot(true))).toBe(true);
    // Omitting mascot configuration in assessQuiz defaults hasQuestionMascot to true for 16:9 validation
    expect(hasChoiceOverflow(assessQuiz({ quiz: longChoiceQuiz, director }).issues)).toBe(true);
  });

  it("keeps the reveal focused on the canonical answer card and drives the Thinking Bar from timeline ranges", () => {
    const director = createDefaultDirectorPlan(quiz);
    const voice = buildQuizVoicePlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: voice });
    const html = compositionSources({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
    });
    expect(html).not.toContain("reveal-panel");
    expect(html).toContain("Many more questions to explore");
    expect(html).toContain("--surface-accent:");
    expect(html).toContain("--on-accent:");
    expect(html).toContain(".fact-card span { color: var(--surface-accent);");
    expect(html).toContain(".timer-marker { position: absolute;");
    expect(html).toContain(".marker-star-svg {");
    expect(html).toContain(
      ".intro-card > span, .outro-card > span { display: inline-flex; padding: 15px 23px; border-radius: 999px; background: #FF6277; color: #172A59;",
    );
    expect(html).toContain(".intro-stars, .outro-stars { margin-top: 35px; color: #172A59;");
    expect(html).toContain("background: #29B9A8; color: #172A59;");
    expect(html).not.toContain("reveal-lockup");
    expect(html).toContain("timer-marker");
    expect(html).toContain(
      '<div class="timer-progress"></div><span class="timer-marker" data-layout-allow-occlusion data-layout-allow-overlap>',
    );
    const thinkingBarCount = [...html.matchAll(/<div class="thinking-bar thinking-bar-/g)].length;
    expect([...html.matchAll(/class="marker-val val-query"/g)]).toHaveLength(thinkingBarCount);
    expect([...html.matchAll(/>\?</g)]).toHaveLength(thinkingBarCount);
    expect(html).not.toContain('<div class="timer-progress"><span class="timer-marker');
    expect(html).toContain("@keyframes quiz-timer-marker-slide");
    expect(html).toContain("layout-media_left_choices_right .game-stage");
    expect(html).toContain('<strong class="keyword-highlight">');
    expect(candyArcadeHeroAreaRatio("media_left_choices_right")).toBeGreaterThan(0.2);
    expect(html).toContain("transition-bubble_splash");
    expect(html).toContain("splash-brand");
    expect(html).toContain(".decor-7 { left: 30%; top: 8%;");
    expect(html).toContain('font-family: "SVN-Hello Headline"');
    expect(html).toContain('.question-title h1 { margin: 0; color: #342245; font-family: "Fredoka", "SVN-Hello Headline"');
    expect(html).toContain("is-final-scene");
    expect(html).toContain(".game-stage { position: relative; z-index: 3;");
    expect(html).toContain(".reward-fx { position: absolute; z-index: 7; inset: 0;");
    expect(html).toContain("--candy-layer-transition: 10;");
    expect(html).toContain("--candy-layer-mascot: 11;");
    expect(html).toContain(".candy-transition { position: absolute; z-index: var(--candy-layer-transition);");
    expect(html).toContain(
      ".candy-mascot-container { position: absolute; width: 220px; height: 220px; z-index: var(--candy-layer-mascot);",
    );
    expect(html).toContain(".brand-mascot { position: absolute; z-index: var(--candy-layer-mascot);");
    expect(html).toContain("hanging-wood-sign");
    expect(html).toContain("wood-sign-plank");
    expect(html).toContain("question-number-val");
    expect(html).toContain("@keyframes hanging-sign-sway");
  });

  it("starts production question files with pending answers and scheduled reveal targets", () => {
    const director = createDefaultDirectorPlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
    const bundle = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
    });
    const questionFiles = questionCompositionFiles(bundle.files);

    expect(questionFiles).toHaveLength(quiz.questions.length);

    for (const [index, html] of questionFiles.entries()) {
      const question = quiz.questions[index];
      expect(html.match(/data-answer-state="pending"/g) ?? []).toHaveLength(question.choices.length);
      expect(html.match(/answer-reveal-correct/g) ?? []).toHaveLength(1);
      expect(html.match(/answer-reveal-incorrect/g) ?? []).toHaveLength(question.choices.length - 1);
      expect(html).not.toMatch(/class="[^"]*answer-correct/);
      expect(html).not.toMatch(/class="[^"]*answer-incorrect/);
      expect(choiceCardTag(html, question.correct_choice_id)).toContain("answer-reveal-correct");
    }

    expect(bundle.html).not.toContain("var(--reveal-at, 0s) + .14s");
    expect(bundle.html).not.toContain("var(--reveal-at, 0s) + 0.14s");
  });

  it("keeps the 50-question maximum to one scene and one hero image per question", () => {
    const maximumQuiz = QuizV2Schema.parse({
      ...quiz,
      episode_id: "candy-maximum",
      questions: Array.from({ length: 50 }, (_, index) => ({
        ...quiz.questions[0],
        id: `question-${String(index + 1).padStart(2, "0")}`,
        number: index + 1,
        question: `Which simple machine is shown in challenge ${index + 1}?`,
      })),
    });
    const director = createDefaultDirectorPlan(maximumQuiz);
    const timeline = compileQuizTimeline({ quiz: maximumQuiz, director, voicePlan: buildQuizVoicePlan(maximumQuiz) });
    const html = compositionSources({
      quiz: maximumQuiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
    });
    expect(html.match(/<section id="quiz-q/g) ?? []).toHaveLength(50);
    expect(html.match(/class="image-card hero-image"/g) ?? []).toHaveLength(50);
    expect(html).toContain("ray-spin 150s");
    expect(html).not.toContain("repeat:-1");
    expect(html).toContain("filter: grayscale");
    expect(html).not.toContain("clip-path");
  });

  it("creates one complete visual-answer consistency group and blocks missing group metadata", () => {
    const director = createDefaultDirectorPlan(quiz);
    const plan = planQuizAssets(quiz, director);
    const group = plan.consistency_groups[0];
    expect(group.asset_ids).toHaveLength(3);
    expect(plan.assets.filter((asset) => asset.consistency_group_id === group.group_id)).toHaveLength(3);
    const broken = {
      ...plan,
      assets: plan.assets.map((asset) => (asset.consistency_group_id ? { ...asset, consistency_group_id: null } : asset)),
    };
    expect(
      assessQuizVisualLayout({ quiz, director, assetPlan: broken }).some(
        (issue) => issue.code === "VISUAL_ANSWER_LEAKAGE" && issue.severity === "blocker",
      ),
    ).toBe(true);
  });

  it("applies the improved pacing, removes redundant reveal-panel, and sets outro pause and copy", () => {
    const director = createDefaultDirectorPlan(quiz);
    const voicePlan = buildQuizVoicePlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan });
    const bundle = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
    });
    const sources = [bundle.html, ...Object.values(bundle.files)].join("\n");

    // Requirement 1: No reveal-panel badge at bottom, fact-card is preserved
    expect(sources).not.toContain("reveal-panel");
    expect(sources).not.toContain("reveal-stamp");
    expect(sources).toContain("fact-card");

    // Requirement 2: Timing pacing - 2s lead before narration, 2s hold after explanation before transition
    const q1Enter = timeline.events.find((e) => e.type === "question.enter" && e.question_id === "question-01")!;
    const q1Narration = timeline.events.find((e) => e.segment_id === "question-01:question")!;
    expect(q1Narration.at_seconds - q1Enter.at_seconds).toBeGreaterThanOrEqual(2.0);

    const q1Explain = timeline.events.find((e) => e.segment_id === "question-01:explanation")!;
    const q1Transition = timeline.events.find((e) => e.type === "transition.start" && e.question_id === "question-01")!;
    expect(q1Transition.at_seconds - (q1Explain.at_seconds + q1Explain.duration_seconds)).toBeGreaterThanOrEqual(2.0);

    const q2Enter = timeline.events.find((e) => e.type === "question.enter" && e.question_id === "question-02")!;
    expect(q2Enter.at_seconds).toBeGreaterThanOrEqual(q1Transition.at_seconds + q1Transition.duration_seconds);

    // Requirement 3: Outro phrases have 1s pause after score prompt & copy is 'Many more questions to explore'
    const outroSegment = voicePlan.segments.find((s) => s.role === "outro")!;
    expect(outroSegment.phrases[0]?.text).toBe("How many did you get right?");
    expect(outroSegment.phrases[0]?.pause_after).toBe("long");
    expect(bundle.files["compositions/candy-outro.html"]).toContain("Many more questions to explore");
    expect(bundle.files["compositions/candy-outro.html"]).not.toContain("2 questions to explore");

    // Vietnamese legacy input fallback to English outro copy check
    const vietnameseQuiz = { ...quiz, language: "Vietnamese" };
    const viVoice = buildQuizVoicePlan(vietnameseQuiz);
    const viOutro = viVoice.segments.find((s) => s.role === "outro")!;
    expect(viOutro.phrases[0]?.text).toBe("How many did you get right?");
    expect(viOutro.phrases[0]?.pause_after).toBe("long");
    const viTimeline = compileQuizTimeline({ quiz: vietnameseQuiz, director, voicePlan: viVoice });
    const viBundle = buildCandyArcadeCompositionBundle({
      quiz: vietnameseQuiz,
      director,
      timeline: viTimeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: viTimeline.duration_seconds,
    });
    expect(viBundle.files["compositions/candy-outro.html"]).toContain("Many more questions to explore");
    expect(viBundle.files["compositions/candy-outro.html"]).toContain("badge-cta");
    expect(viBundle.files["compositions/candy-outro.html"]).toContain("Subscribe");
    expect(viBundle.files["compositions/candy-outro.html"]).toContain("Comment");

    // Outro hold test (5s hold after voice segment)
    const outroEvent = viTimeline.events.find((e) => e.segment_id === "outro")!;
    expect(viTimeline.duration_seconds - (outroEvent.at_seconds + outroEvent.duration_seconds)).toBeGreaterThanOrEqual(4.9);
  });

  it("generates dynamic high-energy outro closings across different episodes", () => {
    const closings = new Set<string>();
    const sampleEpisodeIds = ["episode-alpha", "episode-beta", "episode-gamma", "episode-delta", "episode-epsilon"];
    for (const epId of sampleEpisodeIds) {
      const epQuiz = { ...quiz, episode_id: epId };
      const plan = buildQuizVoicePlan(epQuiz);
      const outro = plan.segments.find((s) => s.role === "outro")!;
      const lastPhrase = outro.phrases.at(-1)?.text ?? "";
      expect(lastPhrase).toBe("Bye bye!");
      closings.add(outro.text);
    }
    // Multiple distinct closings are assigned across diverse episodes
    expect(closings.size).toBeGreaterThan(1);

    // All English closing variants are high-energy and conclude with Bye bye!
    expect(ENGLISH_OUTRO_CLOSING_VARIANTS.length).toBeGreaterThanOrEqual(4);
    for (const variant of ENGLISH_OUTRO_CLOSING_VARIANTS) {
      expect(variant).toContain("Bye bye!");
    }
  });

  it("keeps the production Mascot-on content layout independent of the mascot anchor", () => {
    const director = createDefaultDirectorPlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
    const renderAt = (position: "bottom_left" | "bottom_right") =>
      buildCandyArcadeCompositionBundle({
        quiz,
        director,
        timeline,
        styleContext: { theme: "candy_arcade" },
        audioPath: "./narration.wav",
        narrationDurationSeconds: timeline.duration_seconds,
        mascot: dummyMascot,
        mascotConfig: { mascot_id: "mascot-1", enabled: true, position, scale: 1, show_in_question: true },
      });
    const leftBundle = renderAt("bottom_left");
    const rightBundle = renderAt("bottom_right");
    const bundleSources = (bundle: ReturnType<typeof renderAt>) => [bundle.html, ...Object.values(bundle.files)].join("\n");
    const questionClasses = (bundle: ReturnType<typeof renderAt>) =>
      Array.from(bundleSources(bundle).matchAll(/<section id="quiz-q[^"]+" class="([^"]+)"/g), (match) => match[1]);

    expect(questionClasses(leftBundle).length).toBeGreaterThan(0);
    expect(questionClasses(leftBundle)).toEqual(questionClasses(rightBundle));
    expect(questionClasses(leftBundle).every((className) => className.split(" ").includes("has-mascot"))).toBe(true);
    expect(bundleSources(leftBundle)).not.toContain("has-mascot-left");
    expect(bundleSources(rightBundle)).not.toContain("has-mascot-right");
    expect(bundleSources(leftBundle)).toContain("anchor-bottom_left");
    expect(bundleSources(rightBundle)).toContain("anchor-bottom_right");
  });

  it("renders Game SFX onto track 3, avoids Mascot-specific SFX, and prevents audio overlaps on the same track", () => {
    const director = createDefaultDirectorPlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
    const bundle = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot: dummyMascot,
      mascotConfig: { mascot_id: "mascot-1", enabled: true, position: "bottom_left", scale: 1, show_in_question: true },
    });

    // 1. Must NOT reference non-existent ui_soft.wav
    expect(bundle.html).not.toContain("ui_soft.wav");
    expect(bundle.html).toContain("ui_pop.wav");

    // 2. Mascot SFX should not exist
    expect(bundle.html).not.toContain("mascot-sfx");

    // 3. Extract all audio tags and verify tracks and overlaps
    const audioRegex =
      /<audio\s+id="([^"]+)"[^>]*data-start="([^"]+)"\s+data-duration="([^"]+)"\s+data-track-index="([^"]+)"[^>]*src="([^"]+)"/g;
    const matches = Array.from(bundle.html.matchAll(audioRegex));
    expect(matches.length).toBeGreaterThan(0);

    const tracks = new Map<number, Array<{ id: string; start: number; end: number; src: string }>>();
    for (const match of matches) {
      const id = match[1];
      const start = parseFloat(match[2]);
      const duration = parseFloat(match[3]);
      const trackIndex = parseInt(match[4], 10);
      const src = match[5];
      const end = start + duration;

      if (!tracks.has(trackIndex)) tracks.set(trackIndex, []);
      tracks.get(trackIndex)!.push({ id, start, end, src });
    }

    // Verify game SFX is on track 3 and no mascot SFX on track 5
    const track3 = tracks.get(3) ?? [];
    const track5 = tracks.get(5) ?? [];
    expect(track3.length).toBeGreaterThan(0);
    expect(track5.length).toBe(0);

    // Verify no overlapping audio clips on any track
    for (const [trackIndex, clips] of tracks.entries()) {
      clips.sort((a, b) => a.start - b.start);
      for (let i = 0; i < clips.length - 1; i++) {
        const current = clips[i];
        const next = clips[i + 1];
        expect(
          current.end,
          `Track ${trackIndex} overlap between ${current.id} (${current.start}-${current.end}) and ${next.id} (${next.start}-${next.end})`,
        ).toBeLessThanOrEqual(next.start + 0.001);
      }
    }
  });

  it("resolves decoupled mascot placements for 16:9 and 9:16 aspect ratios independently", () => {
    const director = createDefaultDirectorPlan(quiz);
    const timeline = compileQuizTimeline({ quiz, director, voicePlan: buildQuizVoicePlan(quiz) });
    const mascotConfig: ChannelMascotConfig = {
      enabled: true,
      position: "bottom_left",
      scale: 1.84,
      offset_x: 67,
      offset_y: 90,
      flip_x: false,
      show_in_question: true,
      placements: {
        "16:9": { position: "bottom_left", scale: 1.84, offset_x: 67, offset_y: 90, flip_x: false },
        "9:16": { position: "bottom_right", scale: 1.2, offset_x: -20, offset_y: 50, flip_x: true },
      },
    };

    const bundle16_9 = buildCandyArcadeCompositionBundle({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot: { ...dummyMascot, master_image_url: "/assets/mascot.png" },
      mascotConfig,
      aspectRatio: "16:9",
    });

    const quiz9_16: QuizV2 = {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        format: "multiple_choice",
      })),
    };
    const director9_16 = {
      ...director,
      beats: director.beats.map((b) => ({
        ...b,
        archetype: "illustrated_multiple_choice" as const,
        layout_id: "portrait_hero_choices" as const,
        asset_intents: ["question_illustration" as const],
      })),
    };

    const bundle9_16 = buildCandyArcadeCompositionBundle({
      quiz: quiz9_16,
      director: director9_16,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./narration.wav",
      narrationDurationSeconds: timeline.duration_seconds,
      mascot: { ...dummyMascot, master_image_url: "/assets/mascot.png" },
      mascotConfig,
      aspectRatio: "9:16",
    });

    const source16_9 = [bundle16_9.html, ...Object.values(bundle16_9.files)].join("\n");
    const source9_16 = [bundle9_16.html, ...Object.values(bundle9_16.files)].join("\n");

    expect(source16_9).toContain("anchor-bottom_left");
    expect(source16_9).toContain('data-mascot-scale="1.84"');
    expect(source16_9).toContain('data-mascot-canvas="1920x1080"');

    expect(source9_16).toContain("anchor-bottom_right");
    expect(source9_16).toContain('data-mascot-scale="1.2"');
    expect(source9_16).toContain('data-mascot-canvas="1080x1920"');
  });

  it("renders dynamic QuestionBox, CounterBadge, and AnswerCard element variants in video composition", () => {
    const timeline = compileQuizTimeline({
      quiz,
      director: createDefaultDirectorPlan(quiz),
      voicePlan: buildQuizVoicePlan(quiz, createDefaultDirectorPlan(quiz)),
      assets: planQuizAssets(quiz, createDefaultDirectorPlan(quiz)),
    });
    const director = createDefaultDirectorPlan(quiz);
    // Customize question 1 styles
    director.beats[0].question_box_style = "comic_bubble";
    director.beats[0].question_counter_style = "neon_badge";
    director.beats[0].answer_card_style = "comic_chunky";
    director.beats[0].thinking_bar_style = "flame_fuse";

    const sources = compositionSources({
      quiz,
      director,
      timeline,
      styleContext: { theme: "candy_arcade" },
      audioPath: "./voice.wav",
      narrationDurationSeconds: timeline.duration_seconds,
    });

    // Verify comic bubble question box rendered
    expect(sources).toContain("qb-comic-bubble");
    // Verify neon badge counter rendered
    expect(sources).toContain("cb-neon-badge");
    // Verify comic chunky answer card rendered
    expect(sources).toContain("ac-comic-chunky");
    // Verify flame fuse thinking bar rendered
    expect(sources).toContain("thinking-bar-flame-fuse");
  });
});

function resolvedLayout(
  archetype: Parameters<typeof resolveQuizLayout>[0]["archetype"],
  questionFormat: Parameters<typeof resolveQuizLayout>[0]["questionFormat"],
) {
  const result = resolveQuizLayout({
    requestedLayout: "auto",
    archetype,
    questionFormat,
    choiceCount: questionFormat === "true_false" ? 2 : 3,
  });
  if (!result.ok) throw new Error("Expected a compatible layout");
  return result.layoutId;
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string): number => {
    const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const [red, green, blue] = channels.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

function compositionSources(input: Parameters<typeof buildCandyArcadeComposition>[0]): string {
  const bundle = buildCandyArcadeCompositionBundle(input);
  return [bundle.html, ...Object.values(bundle.files)].join("\n");
}

function questionCompositionFiles(files: Record<string, string>): string[] {
  return Object.entries(files)
    .filter(([path]) => path.startsWith("compositions/quiz-q"))
    .map(([, html]) => html);
}

function choiceCardTag(html: string, choiceId: string): string {
  return html.match(new RegExp(`<div[^>]*data-choice-id="${choiceId}"[^>]*>`))?.[0] ?? "";
}

type BackgroundId = Exclude<QuizBackgroundStyle, "auto">;

function parityProductionBundle(backgrounds: [BackgroundId, BackgroundId]) {
  const boundaryQuiz = { ...styleBoundaryQuiz, episode_id: "phase-08c-parity" };
  const director = createDefaultDirectorPlan(boundaryQuiz);
  director.beats.forEach((beat, index) => {
    beat.background_style = backgrounds[index];
  });
  const voicePlan = buildQuizVoicePlan(boundaryQuiz);
  const timeline = compileQuizTimeline({ quiz: boundaryQuiz, director, voicePlan, targetDurationSeconds: 30 });
  return buildCandyArcadeCompositionBundle({
    quiz: boundaryQuiz,
    director,
    timeline,
    styleContext: { theme: "candy_arcade" },
    audioPath: "./narration.wav",
    narrationDurationSeconds: 30,
  });
}

function paritySandboxComposition(background: BackgroundId) {
  return buildSandboxComposition({
    background_style: background,
    theme: "candy_arcade",
    palette_id: "lime",
    question_number: 1,
    total_questions: 2,
  });
}

describe("Candy Arcade CSS architecture, boundaries & tokens", () => {
  it("owns placement, dimensions, and capacity tokens in layout CSS without selecting private skin classes", () => {
    const mlcrCss = mediaLeftChoicesRightLayout.css("16:9");
    const vc3Css = visualChoicesThreeLayout.css("16:9");
    const baseCss = baselineLayout.css("16:9");

    expect(mlcrCss).toContain("--choice-card-min-height");
    expect(mlcrCss).toContain("--choice-badge-size");
    expect(mlcrCss).toContain("--choice-font-size-base");
    expect(vc3Css).toContain("--choice-media-height");
    expect(vc3Css).toContain("--choice-label-font-size-base");
    expect(baseCss).toContain("--choice-card-min-height");

    expect(mlcrCss).not.toContain(".ac-glossy-arcade");
    expect(mlcrCss).not.toContain(".ac-comic-chunky");
    expect(mlcrCss).not.toContain(".ac-glass-neon");
    expect(mlcrCss).not.toContain(".ac-minimal-soft");
    expect(vc3Css).not.toContain(".ac-glossy-arcade");
    expect(vc3Css).not.toContain(".ac-comic-chunky");

    expect(mlcrCss).not.toContain("border: 8px solid");
    expect(mlcrCss).not.toContain("border: 7px solid");
    expect(mlcrCss).not.toContain("border: 4px solid");
  });

  it("owns stable internal structure in base choice CSS independent of skin and layout", () => {
    const base = baseChoiceStyles();

    expect(base).toContain(".choice-group");
    expect(base).toContain(".choice-card");
    expect(base).toContain(".choice-card-text");
    expect(base).toContain(".choice-card-visual");
    expect(base).toContain(".choice-label");
    expect(base).toContain(".choice-text");
    expect(base).toContain(".choice-media");

    expect(base).toContain("var(--choice-card-min-height");
    expect(base).toContain("var(--choice-badge-size");
    expect(base).toContain("var(--choice-media-height");
    expect(base).toContain('.choice-group[data-choice-fit-lines="2"] .choice-text');
    expect(base).toContain("-webkit-line-clamp: 2");
  });

  it("keeps visual answer tracks and cards inside allocated grid width", () => {
    const base = baseChoiceStyles();

    expect(base).toContain("grid-template-columns: var(--choice-grid-columns, repeat(3, minmax(0, 1fr)));");
    expect(base).toMatch(/\.choice-card-visual,[\s\S]*?\.visual-answer-card \{[\s\S]*?min-width: 0;/);
    expect(base).toMatch(/\.visual-answer-label \{[\s\S]*?min-width: 0;/);
  });

  it("owns shared answer outcome states without icon bloat", () => {
    const state = choiceStateStyles();

    expect(state).toContain(".answer-correct");
    expect(state).toContain(".answer-incorrect");
    expect(state).toContain("correct-card-reveal");
    expect(state).toContain("incorrect-card-settle");
    expect(state).not.toContain(".answer-check");
    expect(state).not.toContain(".answer-cross");
  });

  it("provides typography tier system consuming layout capacity tokens", () => {
    const typo = choiceTypographyStyles();

    expect(typo).toContain(".choice-card-text .choice-text");
    expect(typo).toContain(".choice-tier-medium");
    expect(typo).toContain(".choice-tier-long");
    expect(typo).toContain(".choice-tier-very_long");
    expect(typo).toContain(".choice-tier-overflow");

    expect(typo).toContain("var(--choice-font-size-base");
    expect(typo).toContain("var(--choice-font-size-medium");
    expect(typo).toContain("var(--choice-font-size-long");
    expect(typo).toContain("var(--choice-font-size-very_long");
    expect(typo).toContain("var(--choice-label-font-size-base");
    expect(typo).toContain("var(--choice-label-font-size-medium");
    expect(typo).toContain("var(--choice-fitted-font-size, var(--choice-font-size-base");
    expect(typo).toContain("var(--choice-fitted-font-size, var(--choice-label-font-size-base");
  });

  it("owns decoration in skin CSS without outer layout placement", () => {
    const skins = [glossyArcadeVariant, comicChunkyVariant, glassNeonVariant, minimalSoftVariant];

    for (const skin of skins) {
      const css = skin.renderCss();
      expect(css).toContain(skin.className);

      expect(css).not.toContain("grid-template-columns");
      expect(css).not.toContain("grid-template-areas");
      expect(css).not.toContain("grid-area: hero");
      expect(css).not.toContain("grid-area: answers");
    }
  });

  it("maintains normal cascade with no !important cross-layer dependencies", () => {
    const base = baseChoiceStyles();
    const typo = choiceTypographyStyles();
    const state = choiceStateStyles();
    const mlcr = mediaLeftChoicesRightLayout.css("16:9");
    const vc3 = visualChoicesThreeLayout.css("16:9");
    const glossy = glossyArcadeVariant.renderCss();
    const comic = comicChunkyVariant.renderCss();
    const glass = glassNeonVariant.renderCss();
    const minimal = minimalSoftVariant.renderCss();

    expect(base).not.toContain("!important");
    expect(typo).not.toContain("!important");
    expect(state).not.toContain("!important");
    expect(mlcr).not.toContain("!important");
    expect(vc3).not.toContain("!important");
    expect(glossy).not.toContain("!important");
    expect(comic).not.toContain("!important");
    expect(glass).not.toContain("!important");
    expect(minimal).not.toContain("!important");
  });

  it("serializes identical semantic palette variables for production and sandbox", () => {
    for (const palette of candyArcadePalettes) {
      const vars = serializeQuizPaletteCssVariables(palette);
      const css = serializeQuizPaletteCss(palette);
      const inline = serializeQuizPaletteInlineStyle(palette);

      expect(vars["--bg-primary"]).toBe(palette.backgroundPrimary);
      expect(vars["--bg-secondary"]).toBe(palette.backgroundSecondary);
      expect(vars["--accent"]).toBe(palette.accent);
      expect(vars["--surface-accent"]).toBe(palette.surfaceAccent);
      expect(vars["--on-accent"]).toBe(palette.onAccent);
      expect(vars["--answer-badge"]).toBe(palette.answerBadge);
      expect(vars["--badge"]).toBe(palette.answerBadge);
      expect(vars["--correct"]).toBe(palette.correct);
      expect(vars["--incorrect"]).toBe(palette.incorrect);
      expect(vars["--surface"]).toBe(palette.surface);
      expect(vars["--text"]).toBe(palette.text);
      expect(vars["--ink"]).toBe(palette.text);
      expect(vars["--muted"]).toBe(palette.muted);

      expect(css).toContain(`--bg-primary: ${palette.backgroundPrimary};`);
      expect(css).toContain(`--text: ${palette.text};`);
      expect(inline).toContain(`--bg-primary:${palette.backgroundPrimary};`);
      expect(inline).toContain(`--ink:${palette.text};`);
    }
  });

  it("falls back safely for null or empty palette without emitting invalid CSS", () => {
    const nullVars = serializeQuizPaletteCssVariables(null);
    const emptyVars = serializeQuizPaletteCssVariables({});

    expect(nullVars["--bg-primary"]).toBe(DEFAULT_QUIZ_PALETTE_FALLBACK.backgroundPrimary);
    expect(nullVars["--text"]).toBe(DEFAULT_QUIZ_PALETTE_FALLBACK.text);
    expect(emptyVars["--correct"]).toBe(DEFAULT_QUIZ_PALETTE_FALLBACK.correct);
    expect(emptyVars["--incorrect"]).toBe(DEFAULT_QUIZ_PALETTE_FALLBACK.incorrect);
  });

  it("publishes complete capacity custom properties for 16:9 and 9:16 aspect ratios", () => {
    const mlcr = mediaLeftChoicesRightLayout.css("16:9");
    const vc3 = visualChoicesThreeLayout.css("16:9");

    expect(mlcr).toContain("--choice-card-min-height: 116px;");
    expect(mlcr).toContain("--choice-badge-size: 138px;");
    expect(mlcr).toContain("--choice-font-size-base: 38px;");
    expect(mlcr).toContain("--choice-font-size-medium: 30px;");
    expect(mlcr).toContain("--choice-font-size-long: 24px;");
    expect(mlcr).toContain("--choice-font-size-very_long: 20px;");

    expect(vc3).toContain("--choice-media-height: 320px;");
    expect(vc3).toContain("--choice-badge-size: 72px;");
    expect(vc3).toContain("--choice-label-min-height: 70px;");
    expect(vc3).toContain("--choice-label-font-size-base: 26px;");

    const mlcr916 = mediaLeftChoicesRightLayout.css("9:16");
    const vc3916 = visualChoicesThreeLayout.css("9:16");

    expect(mlcr916).toContain('#stage[data-aspect-ratio="9:16"]');
    expect(mlcr916).toContain("--choice-badge-size: 124px;");
    expect(mlcr916).toContain("--choice-font-size-base: 40px;");

    expect(vc3916).toContain('#stage[data-aspect-ratio="9:16"]');
    expect(vc3916).toContain("--choice-media-height: 360px;");
    expect(vc3916).toContain("--choice-badge-size: 104px;");
    expect(vc3916).toContain("--choice-label-min-height: 74px;");

    const sv2 = splitVersusTwoLayout.css("16:9");
    const vtf = verdictTrueFalseLayout.css("16:9");

    expect(sv2).toContain("--choice-card-min-height: 500px;");
    expect(sv2).toContain("--choice-card-height: 500px;");
    expect(sv2).toContain("--choice-media-height: 410px;");
    expect(sv2).toContain("--choice-badge-size: 116px;");
    expect(sv2).toContain("--choice-badge-font-size: 60px;");
    expect(sv2).toContain("--choice-font-size-base: 40px;");
    expect(sv2).toContain("--choice-font-size-medium: 32px;");
    expect(sv2).toContain("--choice-font-size-long: 25px;");
    expect(sv2).toContain("--choice-font-size-very_long: 21px;");
    expect(sv2).toContain("--choice-font-size-overflow: 20px;");
    expect(sv2).toContain("--choice-fit-min: 20px;");
    expect(sv2).toContain("--choice-fit-max: 56px;");
    expect(sv2).toContain("width: 1420px;");
    expect(sv2).toContain("max-width: 1360px;");
    expect(sv2).not.toContain(".has-mascot");

    expect(vtf).toContain("--choice-card-min-height: 140px;");
    expect(vtf).toContain("--choice-card-height: 140px;");
    expect(vtf).toContain("--choice-badge-size: 148px;");
    expect(vtf).toContain("--choice-badge-font-size: 80px;");
    expect(vtf).toContain("--choice-font-size-base: 46px;");
    expect(vtf).toContain("--choice-font-size-medium: 38px;");
    expect(vtf).toContain("--choice-font-size-long: 30px;");
    expect(vtf).toContain("--choice-font-size-very_long: 24px;");
    expect(vtf).toContain("--choice-font-size-overflow: 22px;");
    expect(vtf).toContain("--choice-fit-min: 24px;");
    expect(vtf).toContain("--choice-fit-max: 68px;");
    expect(vtf).toContain("width: 1420px;");
    expect(vtf).toContain("max-width: 1420px;");
    expect(vtf).toContain("width: min(1260px, 100%);");
    expect(vtf).toContain("width: min(1220px, 100%);");
    expect(vtf).not.toContain(".has-mascot");

    const mr = mysteryRevealLayout.css("16:9");
    const cd = clueDeductionLayout.css("16:9");

    expect(mr).toContain("--mystery-stage-width: 1100px;");
    expect(mr).toContain("--mystery-stage-height: 590px;");
    expect(mr).toContain("width: 1420px;");
    expect(mr).toContain("max-width: 1420px;");
    expect(mr).toContain("max-width: 1380px;");
    expect(mr).toContain("max-width: var(--mystery-stage-width, 1100px);");
    expect(mr).toContain("width: var(--mystery-stage-width, 1100px);");
    expect(mr).toContain("max-width: 1360px;");
    expect(mr).toContain("width: min(75vw, 1100px);");
    expect(mr).toContain("width: min(1080px, 100%);");
    expect(mr).not.toContain(".has-mascot");

    expect(cd).toContain("--clue-stage-width: 1180px;");
    expect(cd).toContain("--clue-stage-height: 560px;");
    expect(cd).toContain("width: var(--mascot-content-width, 1420px);");
    expect(cd).toContain("max-width: 1420px;");
    expect(cd).toContain("max-width: 1380px;");
    expect(cd).toContain("max-width: 1180px;");
    expect(cd).toContain("max-width: 1360px;");
    expect(cd).toContain("width: min(72vw, 1180px);");
    expect(cd).toContain("width: min(1180px, 100%);");
    expect(cd).not.toContain(".has-mascot");
  });

  it("publishes answer card auto-fit tokens for all layouts and aspect ratios", () => {
    const baseline = baselineLayout.css("16:9");
    const mediaLeft = mediaLeftChoicesRightLayout.css("16:9");
    const mediaLeftPortrait = mediaLeftChoicesRightLayout.css("9:16");
    const fullStack = fullStackListLayout.css("16:9");
    const fullStackPortrait = fullStackListLayout.css("9:16");
    const visual = visualChoicesThreeLayout.css("16:9");
    const visualPortrait = visualChoicesThreeLayout.css("9:16");

    expect(baseline).toContain("--choice-fit-max: 64px;");
    expect(mediaLeft).toContain("--choice-fit-max: 64px;");
    expect(mediaLeftPortrait).toContain("--choice-fit-max: 72px;");
    expect(fullStack).toContain("--choice-fit-max: 64px;");
    expect(fullStackPortrait).toContain("--choice-fit-max: 72px;");
    expect(visual).toContain("--choice-fit-max: 30px;");
    expect(visualPortrait).toContain("--choice-fit-max: 42px;");

    for (const css of [baseline, mediaLeft, fullStack, visual]) {
      expect(css).toContain("--choice-fit-min:");
      expect(css).toContain("--choice-fit-max-lines: 2;");
      expect(css).toContain("--choice-fit-leading: 1.08;");
      expect(css).toContain("--choice-fit-multiline-gain: 6px;");
    }
  });
});

describe("Candy Arcade background parity and composition integration", () => {
  it.each<BackgroundId>(["candy_rays", "aurora_glow"])("emits canonical %s layer through both public composition entries", (background) => {
    const production = parityProductionBundle([background, background]);
    const sandbox = paritySandboxComposition(background);
    const variant = resolveBackgroundVariant(background);
    const canonicalProduction = variant.renderHtml({ surface: "production", questionIndex: 0 });
    const canonicalSandbox = variant.renderHtml({ surface: "sandbox", questionIndex: 0 });

    expect(canonicalSandbox).toBe(canonicalProduction);
    expect(canonicalProduction).toContain('class="quiz-scene-background"');
    expect(canonicalProduction).toContain(`data-background-style="${background}"`);
    expect(Object.values(production.files).join("\n")).toContain(canonicalProduction);
    expect(sandbox.html).toContain(canonicalProduction);
  });

  it("bundles each used background and scopes CSS properly without comment counting", () => {
    const candyOnly = candyArcadeCss({ backgroundStyles: ["candy_rays", "candy_rays"] });
    expect(candyOnly).toContain(".bg-rays");
    expect(candyOnly).not.toContain(".bg-aurora-glow");
    expect(candyOnly).toContain(".quiz-scene-background");

    const auroraOnly = paritySandboxComposition("aurora_glow").css;
    expect(auroraOnly).not.toContain(".bg-rays");
    expect(auroraOnly).toContain(".bg-aurora-glow");

    const mixed = parityProductionBundle(["aurora_glow", "candy_rays"]).html;
    expect(mixed).toContain(".bg-rays");
    expect(mixed).toContain(".bg-aurora-glow");
    expect(mixed).toContain(".quiz-scene-background");
  });

  it("exposes the browser font-readiness contract as executable script", () => {
    const sandbox = paritySandboxComposition("candy_rays");
    expect(sandbox.html).toContain("<script>(function(){");
    expect(sandbox.html).toContain("window.__fontReadyPromise=(async()=>");
  });

  it.each<BackgroundId>(["candy_rays", "aurora_glow"])("keeps %s deterministic with a reduced-motion fallback", (background) => {
    const firstProduction = parityProductionBundle([background, background]);
    const secondProduction = parityProductionBundle([background, background]);
    const firstSandbox = paritySandboxComposition(background);
    const secondSandbox = paritySandboxComposition(background);

    expect(secondProduction).toEqual(firstProduction);
    expect(secondSandbox).toEqual(firstSandbox);
    expect(firstProduction.html).toContain("@media (prefers-reduced-motion: reduce)");
    expect(firstSandbox.css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(firstSandbox.css).toContain("animation-duration: var(--mascot-state-span, .04s) !important");
  });
});

describe("Candy Arcade visual and workflow regression", () => {
  it("renders all four skins cleanly across text layouts without geometry collision", () => {
    const skins = ["glossy_arcade", "comic_chunky", "glass_neon", "minimal_soft"] as const;

    for (const skin of skins) {
      const res = buildSandboxComposition({
        answer_card_style: skin,
        layout_id: "media_left_choices_right",
      });

      expect(res.html).toContain(`skin-${skin}`);
      expect(res.html).toContain("layout-media_left_choices_right");
      expect(res.html).toContain("choice-card");
    }
  });

  it("renders 16:9 and 9:16 compositions cleanly with correct aspect markers", () => {
    const res169 = buildSandboxComposition({ aspect_ratio: "16:9" });
    const res916 = buildSandboxComposition({ aspect_ratio: "9:16", layout_id: "portrait_hero_choices" });

    expect(res169.html).toContain('data-aspect-ratio="16:9"');
    expect(res916.html).toContain('data-aspect-ratio="9:16"');
    expect(res916.html).toContain('#stage[data-aspect-ratio="9:16"]');
    expect(res916.css).toContain("--safe-zone-top: 180px;");
    expect(res916.css).toContain("--safe-zone-bottom: 440px;");
    expect(res916.css).toContain("--safe-zone-right: 140px;");
    expect(res916.css).toContain('#stage[data-aspect-ratio="9:16"] .phase-region { left: 36px; right: var(--safe-zone-right, 140px); bottom: var(--safe-zone-bottom, 440px);');
    expect(res916.css).not.toContain('#stage[data-aspect-ratio="9:16"] .phase-region { left: 36px; right: 36px; bottom: 18px;');
  });

  it("suppresses decorative animation under reduced motion while preserving status visibility", () => {
    const css = candyArcadeCss({ aspectRatio: "16:9" });

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: .001ms !important;");
    expect(css).toContain("animation-iteration-count: 1 !important;");
  });

  it("keeps phase states strictly sequenced without premature answer reveal", () => {
    const resChoices = buildSandboxComposition({ phase: "choices" });
    const resReveal = buildSandboxComposition({ phase: "reveal" });

    expect(resChoices.html).toContain("--choices-at: 0s");
    expect(resChoices.html).toContain("--reveal-at: 999s");
    expect(resReveal.html).toContain("--reveal-at: 0s");
  });

  it("standardizes 16:9 base layout geometry directly to canonical Mascot-Ready Standard Grid", () => {
    const css = candyArcadeCss({ aspectRatio: "16:9" });

    // Root tokens default to 1420px mascot-ready capacity
    expect(css).toContain("--mascot-content-width: 1420px;");
    expect(css).toContain("--question-card-width: 1440px;");
    expect(css).toContain("--question-card-left-edge: 360px;");

    // Game stage defaults directly to 1420px width
    expect(css).toContain(".game-stage { position: relative; z-index: 3; display: grid; justify-items: center; align-content: start; width: 1420px; min-height: 945px; margin: 12px 40px 0 auto; contain: layout style; }");

    // Game header defaults directly to x = 180px (centered in 0..360px pillar)
    expect(css).toContain(".game-header { position: absolute; z-index: 6; top: 0; left: 180px; transform: translateX(-50%); contain: layout style; }");

    // Question title and phase region centered/aligned to 1420px stage
    expect(css).toContain(".question-title { position: relative; z-index: 3; width: var(--question-card-width, 1440px); max-width: var(--question-card-width, 1440px);");
    expect(css).toContain(".phase-region { position: absolute; z-index: 5; left: 0; bottom: 10px; width: var(--question-card-width, 1440px);");
    expect(css).toContain(".phase-region > .thinking-bar { position: absolute; z-index: 5; bottom: -15px; left: 50%; margin-top: 0; transform: translateX(-50%); width: min(70vw, 1300px);");

    // Mascot container locked to bottom-left pillar in 16:9
    expect(css).toContain(".candy-mascot-container.anchor-bottom_left { bottom: 18px; left: 32px; }");
    expect(css).toContain(".candy-mascot-container.anchor-bottom_right { bottom: 18px; left: 32px; }");
  });
});
