import { describe, expect, it } from "vitest";
import { resolveBeatQuizStyle, type ResolvedQuizStyleWithProvenance } from "@studio/shared";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";
import { buildQuizVoicePlan } from "../src/quiz/audio/voicePlan.js";
import { HyperframesRenderer } from "../src/quiz/render/hyperframesRenderer.js";
import { buildQuizRenderStyleContext } from "../src/quiz/render/quizRenderStyleContext.js";
import { compileQuizTimeline } from "../src/quiz/timeline/compileTimeline.js";
import { prepareQuizVideoRender } from "../src/tasks/video/quizVideoRenderPreparation.js";
import { styleAxisCases, styleBoundaryChannel, styleBoundaryEpisode, styleBoundaryQuiz as quiz } from "./quizStyleBoundaryFixtures.js";

describe("Quiz production style contract", () => {
  it("P8B-BND-01 preserves style context through video preparation, HyperframesRenderer, and Composition", async () => {
    const director = createDefaultDirectorPlan(quiz);
    director.beats[0].palette_id = "auto";
    director.beats[1].palette_id = "blue";
    director.beats[1].answer_card_style = "minimal_soft";
    director.beats[1].background_style = "candy_rays";
    const channel = styleBoundaryChannel();
    const episodeQuizConfig = styleBoundaryEpisode({ palette_id: "orange", answer_card_style: "comic_chunky", background_style: "auto" });
    const styleContext = buildQuizRenderStyleContext(channel, episodeQuizConfig);

    const firstStyle = resolveBeatQuizStyle(styleContext, director.beats[0]);
    expect(firstStyle.provenance.backgroundStyle).toBe("channel");
    expect(firstStyle.provenance.answerCardStyle).toBe("episode");
    expect(firstStyle.provenance.paletteId).toBe("episode");
    const secondStyle = resolveBeatQuizStyle(styleContext, director.beats[1]);
    expect(secondStyle.provenance.backgroundStyle).toBe("beat");
    expect(secondStyle.provenance.answerCardStyle).toBe("beat");
    expect(secondStyle.provenance.paletteId).toBe("beat");

    const prepared = await prepareQuizVideoRender({
      ...renderInputWithoutStyleContext(director),
      channel,
      episodeQuizConfig,
    });
    const firstQuestion = questionFile(prepared.compositionFiles, "q1");
    const secondQuestion = questionFile(prepared.compositionFiles, "q2");

    expect(firstQuestion).toContain('class="bg-aurora-glow"');
    expect(firstQuestion).toContain("ac-comic-chunky");
    expect(firstQuestion).toContain("--bg-primary:#FF964F");
    expect(secondQuestion).toContain('class="bg-rays"');
    expect(secondQuestion).toContain("ac-minimal-soft");
    expect(secondQuestion).toContain("--bg-primary:#438CE8");
  });

  it("P8B-BND-04 targets an inherited auto next beat's already-resolved palette", async () => {
    const director = createDefaultDirectorPlan(quiz);
    director.beats[0].palette_id = "orange";
    director.beats[1].palette_id = "auto";
    const styleContext = buildQuizRenderStyleContext(styleBoundaryChannel(), styleBoundaryEpisode());
    const prepared = await new HyperframesRenderer().prepare(renderInput(director, styleContext));
    const transition = Object.values(prepared.compositionFiles).find(
      (html) => html.includes("candy-transition") && html.includes("--from:#3BC7C9"),
    );

    expect(transition).toBeDefined();
    expect(transition).toContain("--to:#9A66E6");
  });

  it("P8B-BND-02 proves Theme < Channel < Episode < Beat for every style axis", () => {
    for (const axis of styleAxisCases) {
      for (const layer of axis.layers) {
        const resolved = resolveBeatQuizStyle(layer.context);
        expect(resolved[axis.field], `${axis.name} value at ${layer.provenance}`).toBe(layer.value);
        expect(resolved.provenance[axis.field], `${axis.name} provenance at ${layer.provenance}`).toBe(layer.provenance);
      }
    }
  });

  it("P8B-BND-03 treats explicit, auto, and missing legacy values as distinct inheritance inputs", () => {
    const resolved = resolveBeatQuizStyle({
      theme: "space_lab",
      channel: {
        default_palette_id: "purple",
        default_thinking_bar_style: "energy_laser",
        default_question_box_style: "comic_bubble",
        default_answer_card_style: "glass_neon",
        default_counter_style: "golden_shield",
        default_background_style: "aurora_glow",
      },
      episode: {
        visual_theme: "space_lab",
        palette_id: "auto",
        question_box_style: "parchment_scroll",
        answer_card_style: "auto",
        background_style: "auto",
      },
      beat: {
        thinking_bar_style: "auto",
        question_box_style: "auto",
        question_counter_style: "auto",
      },
    });

    expect(selectStyleEvidence(resolved)).toEqual({
      paletteId: ["purple", "channel"],
      thinkingBarStyle: ["energy_laser", "channel"],
      questionBoxStyle: ["parchment_scroll", "episode"],
      answerCardStyle: ["glass_neon", "channel"],
      counterStyle: ["golden_shield", "channel"],
      backgroundStyle: ["aurora_glow", "channel"],
    });
  });
});

function selectStyleEvidence(style: ResolvedQuizStyleWithProvenance) {
  return {
    paletteId: [style.paletteId, style.provenance.paletteId],
    thinkingBarStyle: [style.thinkingBarStyle, style.provenance.thinkingBarStyle],
    questionBoxStyle: [style.questionBoxStyle, style.provenance.questionBoxStyle],
    answerCardStyle: [style.answerCardStyle, style.provenance.answerCardStyle],
    counterStyle: [style.counterStyle, style.provenance.counterStyle],
    backgroundStyle: [style.backgroundStyle, style.provenance.backgroundStyle],
  };
}

function renderInput(director: ReturnType<typeof createDefaultDirectorPlan>, styleContext: ReturnType<typeof buildQuizRenderStyleContext>) {
  return { ...renderInputWithoutStyleContext(director), styleContext };
}

function renderInputWithoutStyleContext(director: ReturnType<typeof createDefaultDirectorPlan>) {
  const voicePlan = buildQuizVoicePlan(quiz);
  const timeline = compileQuizTimeline({ quiz, director, voicePlan, targetDurationSeconds: 30 });
  return {
    quiz,
    director,
    timeline,
    scenes: [],
    audioPath: "audio/narration.wav",
    narrationDurationSeconds: timeline.duration_seconds,
  };
}

function questionFile(files: Record<string, string>, questionId: string): string {
  const html = Object.entries(files).find(([path]) => path.includes(`quiz-${questionId}-`))?.[1];
  expect(html).toBeDefined();
  return html ?? "";
}
