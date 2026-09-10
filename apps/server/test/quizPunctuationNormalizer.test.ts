import { describe, expect, it } from "vitest";
import type { Episode, QuizSceneRenderModel } from "@studio/shared";
import { normalizeQuestionPunctuation } from "../src/quiz/formatting/questionPunctuationNormalizer.js";
import { buildDirectQuizOutputContract } from "../src/context/quizDirectPromptBuilder.js";
import { buildOutputContract } from "../src/context/taskInstructions.js";
import { buildQuizSceneParts } from "../src/quiz/render/scene/buildQuizSceneParts.js";
import { renderStableQuizSceneParts } from "../src/quiz/render/scene/renderQuizSceneParts.js";

function makeMockEpisode(format: "multiple_choice" | "true_false" = "multiple_choice"): Episode {
  return {
    episode_id: "ep_stage4_001",
    quiz_config: {
      question_count: 5,
      quiz_format: format,
      age_band: "7-9",
      resolved_visual_style: "pixar_3d",
    },
    topic: { title: "Arcade Gaming History" },
  } as unknown as Episode;
}

function makeMockSceneModel(questionText: string, format: "multiple_choice" | "true_false" = "true_false"): QuizSceneRenderModel {
  return {
    id: "question-01",
    question: {
      id: "question-01",
      number: 1,
      total: 5,
      format,
      text: questionText,
      visualOpportunity: "A glowing arcade cabinet in retro 80s arcade room",
      factText: "Light guns detect screen refresh light raster scans.",
      correctChoiceId: "choice-true",
    },
    choices: [
      { id: "choice-true", order: 0, text: "True", media: { source: null, altText: "True", fallback: { subject: "True", seed: 1 } } },
      { id: "choice-false", order: 1, text: "False", media: { source: null, altText: "False", fallback: { subject: "False", seed: 2 } } },
    ],
    state: { phase: "question", choices: "visible", thinking: "hidden", fact: "hidden", reward: "hidden" },
    layout: {
      id: "media_left_choices_right",
      source: "explicit",
      capability: {
        id: "media_left_choices_right",
        name: "Media Left Choices Right",
        supportedFormats: ["multiple_choice", "true_false"],
        supportedAspectRatios: ["16:9"],
        choiceCapacities: [2, 3],
        description: "Standard layout",
      },
      presentation: { orientation: "stacked", layoutVariant: "compact_stack", columns: 1, cardsSelectable: true },
    },
    aspectRatio: "16:9",
    mascot: { occupied: false, anchor: null },
    assets: { hero: { source: null, altText: "Arcade", fallback: { subject: "Arcade", seed: 1 } } },
    palette: { accent: "#FF5722", primary: "#2196F3", secondary: "#4CAF50", surface: "#FFFFFF", background: "#121212", text: "#FFFFFF" },
    styles: { questionBox: "candy_pop", counter: "pill_modern", answerCard: "retro_arcade", thinkingBar: "star_slider", background: "arcade_grid" },
    styleCatalogRevision: "rev_1",
    visual: {} as any,
    channelBrandName: "Retro Arcade Lab",
    brandVisible: true,
    isFinal: false,
  };
}

describe("normalizeQuestionPunctuation", () => {
  describe("multiple choice normalization", () => {
    it("appends ? when punctuation is missing", () => {
      expect(normalizeQuestionPunctuation("Which planet is the largest", "multiple_choice")).toBe("Which planet is the largest?");
    });

    it("preserves an existing clean question mark", () => {
      expect(normalizeQuestionPunctuation("Which planet is the largest?", "multiple_choice")).toBe("Which planet is the largest?");
    });

    it("replaces a trailing period with ?", () => {
      expect(normalizeQuestionPunctuation("Which planet is the largest.", "multiple_choice")).toBe("Which planet is the largest?");
    });

    it("strips multiple trailing periods and appends ?", () => {
      expect(normalizeQuestionPunctuation("Which planet is the largest...", "multiple_choice")).toBe("Which planet is the largest?");
    });

    it("handles whitespace before and after terminal punctuation", () => {
      expect(normalizeQuestionPunctuation("  Which planet is the largest.   ", "multiple_choice")).toBe("Which planet is the largest?");
      expect(normalizeQuestionPunctuation("Which planet is the largest?   ", "multiple_choice")).toBe("Which planet is the largest?");
    });

    it("cleans redundant duplicate question marks", () => {
      expect(normalizeQuestionPunctuation("Which planet is the largest??", "multiple_choice")).toBe("Which planet is the largest?");
    });

    it("replaces trailing exclamation marks and colons with ?", () => {
      expect(normalizeQuestionPunctuation("Which planet is the largest!", "multiple_choice")).toBe("Which planet is the largest?");
      expect(normalizeQuestionPunctuation("Which planet is the largest:", "multiple_choice")).toBe("Which planet is the largest?");
    });
  });

  describe("true/false normalization", () => {
    it("converts a declarative period ending to a clean question mark", () => {
      expect(normalizeQuestionPunctuation("Classic arcade light guns shoot real laser beams.", "true_false")).toBe(
        "Classic arcade light guns shoot real laser beams?",
      );
      expect(normalizeQuestionPunctuation("Player two could steer the ducks in Duck Hunt.", "true_false")).toBe(
        "Player two could steer the ducks in Duck Hunt?",
      );
    });

    it("ensures ? on flat statements without terminal period", () => {
      expect(normalizeQuestionPunctuation("Pac-Man was inspired by a pizza missing one slice", "true_false")).toBe(
        "Pac-Man was inspired by a pizza missing one slice?",
      );
    });

    it("preserves interrogative challenges", () => {
      expect(normalizeQuestionPunctuation("Did player two steer the ducks in Duck Hunt?", "true_false")).toBe(
        "Did player two steer the ducks in Duck Hunt?",
      );
      expect(normalizeQuestionPunctuation("Do classic arcade light guns shoot real laser beams?", "true_false")).toBe(
        "Do classic arcade light guns shoot real laser beams?",
      );
    });

    it("preserves engaging True/False question prompts", () => {
      expect(normalizeQuestionPunctuation("Is it true that player two could steer the ducks in Duck Hunt?", "true_false")).toBe(
        "Is it true that player two could steer the ducks in Duck Hunt?",
      );
    });

    it("handles True or False prefix statements", () => {
      expect(normalizeQuestionPunctuation("True or False: Sharks are mammals.", "true_false")).toBe(
        "True or False: Sharks are mammals?",
      );
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty or whitespace-only inputs", () => {
      expect(normalizeQuestionPunctuation("")).toBe("");
      expect(normalizeQuestionPunctuation("   ")).toBe("");
      expect(normalizeQuestionPunctuation(null as unknown as string)).toBe("");
    });

    it("preserves internal sentence punctuation across multi-sentence prompts", () => {
      expect(normalizeQuestionPunctuation("Look closely. Which animal runs faster.")).toBe(
        "Look closely. Which animal runs faster?",
      );
    });

    it("handles non-English interrogatives", () => {
      expect(normalizeQuestionPunctuation("¿Los rayos láser son reales.")).toBe("¿Los rayos láser son reales?");
      expect(normalizeQuestionPunctuation("¿Los rayos láser son reales?")).toBe("¿Los rayos láser son reales?");
    });
  });
});

describe("Prompt Builder Hardening Contract Tests", () => {
  it("buildDirectQuizOutputContract requires ? for multiple_choice", () => {
    const contract = buildDirectQuizOutputContract({
      taskType: "GENERATE_QUIZ",
      episode: makeMockEpisode("multiple_choice"),
      quizQuestionCount: 5,
      quizLastClaimId: "C05",
      quizSourceMinimum: 3,
    });

    expect(contract).toContain("Question phrasing & punctuation: Every question MUST always be an interrogative sentence ending with a question mark '?'");
    expect(contract).toContain("Never omit the question mark or end with a period");
    expect(contract).toContain("Ultra-concise child-friendly question ending with '?'");
  });

  it("buildDirectQuizOutputContract enforces ? and interrogative challenge for true_false", () => {
    const contract = buildDirectQuizOutputContract({
      taskType: "GENERATE_QUIZ",
      episode: makeMockEpisode("true_false"),
      quizQuestionCount: 5,
      quizLastClaimId: "C05",
      quizSourceMinimum: 3,
    });

    expect(contract).toContain("Question phrasing & punctuation: Every question MUST end with a question mark '?'");
    expect(contract).toContain("Never write a flat declarative statement ending with a period");
    expect(contract).toContain("interrogative challenge");
    expect(contract).toContain("Did player two steer the ducks in Duck Hunt?");
    expect(contract).toContain("Is it true that...?");
  });

  it("buildOutputContract enforces ? phrasing in GENERATE_TREATMENT, GENERATE_SCRIPT, GENERATE_SCENES", () => {
    const treatmentPrompt = buildOutputContract({
      taskType: "GENERATE_TREATMENT",
      episode: makeMockEpisode("true_false"),
      quizQuestionCount: 5,
      quizLastClaimId: "C05",
      quizSourceMinimum: 3,
    });
    expect(treatmentPrompt).toContain("Questions must end with a question mark '?'");
    expect(treatmentPrompt).toContain("never a flat statement ending in a period");

    const scriptPrompt = buildOutputContract({
      taskType: "GENERATE_SCRIPT",
      episode: makeMockEpisode("multiple_choice"),
      quizQuestionCount: 5,
      quizLastClaimId: "C05",
      quizSourceMinimum: 3,
    });
    expect(scriptPrompt).toContain("Questions must always be an interrogative ending with a question mark '?'");

    const scenesPrompt = buildOutputContract({
      taskType: "GENERATE_SCENES",
      episode: makeMockEpisode("true_false"),
      quizQuestionCount: 5,
      quizLastClaimId: "C05",
      quizSourceMinimum: 3,
    });
    expect(scenesPrompt).toContain("Questions must end with a question mark '?'");
  });
});

describe("Rendering Layer Integration", () => {
  it("guarantees question text in scene parts ends with ? even when model text ends in a period", () => {
    const model = makeMockSceneModel("Classic arcade light guns shoot real laser beams.", "true_false");
    const parts = buildQuizSceneParts(model);

    expect(parts.question.text).toBe("Classic arcade light guns shoot real laser beams?");
    expect(parts.question.highlightedHtml).toContain("laser beams?");
    expect(parts.question.highlightedHtml).not.toContain("laser beams.");
  });

  it("renders question box HTML with ? and no trailing period", () => {
    const model = makeMockSceneModel("Pac-Man was inspired by a pizza missing one slice.", "true_false");
    const parts = buildQuizSceneParts(model);
    const rendered = renderStableQuizSceneParts(parts);

    expect(rendered.questionBoxHtml).toContain("Pac-Man was inspired by a pizza missing one slice?");
    expect(rendered.questionBoxHtml).not.toContain("Pac-Man was inspired by a pizza missing one slice.");
  });
});
