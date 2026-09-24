import { describe, expect, it } from "vitest";
import { EpisodeSchema, QuizConfigSchema, type QuizConfig } from "@studio/shared";
import { buildDirectQuizOutputContract } from "../src/context/quizDirectPromptBuilder.js";

function prompt(config: Partial<QuizConfig>) {
  const episode = EpisodeSchema.parse({
    episode_id: "ep-layout",
    channel_id: "ch-layout",
    slug: "layout",
    topic: { title: "Layout test", premise: "Test", hook: "Guess?" },
    stage: "SELECTED",
    target_duration_minutes: 3,
    target_word_count: 200,
    script_path: "script.md",
    research_path: "research.md",
    treatment_path: "treatment.md",
    visual_bible_path: "visual_bible.md",
    scene_plan_path: "scene_plan.md",
    dialogue_script_path: "dialogue_script.md",
    video_prompts_path: "video_prompts.md",
    quiz_config: QuizConfigSchema.parse(config),
    created_at: "2026-09-24T00:00:00.000Z",
    updated_at: "2026-09-24T00:00:00.000Z",
  });
  return buildDirectQuizOutputContract({
    taskType: "GENERATE_QUIZ",
    episode,
    quizQuestionCount: 3,
    quizLastClaimId: "C03",
    quizSourceMinimum: 2,
  });
}

describe("layout-aware quiz generation contracts", () => {
  it("requests exactly two named entities with explicit Versus gameplay", () => {
    const contract = prompt({ archetype: "versus_faceoff", target_layout: "split_versus_two", quiz_format: "multiple_choice" });
    expect(contract).toContain('"format": "multiple_choice"');
    expect(contract).toContain('"gameplay_id": "versus_faceoff"');
    expect(contract).toContain("exactly 2 choices");
    expect(contract).toContain("First compared entity");
    expect(contract).not.toContain("choice-c");
  });

  it("does not turn a visual identification question into Mystery just because it uses image_guess", () => {
    const contract = prompt({ archetype: "visual_identification", target_layout: "visual_choices_three", quiz_format: "image_guess" });
    expect(contract).toContain('"answer_mode": "choice_selection"');
    expect(contract).toContain("exactly 3 choices");
  });

  it("does not request impossible answer-position variation for Mystery", () => {
    const contract = prompt({ archetype: "mystery_reveal", quiz_format: "image_guess" });
    expect(contract).toContain("exactly 1 choice");
    expect(contract).not.toContain("never place the correct answer in the same letter position");
  });

  it("includes GRAPHIC_IDENTITY_MANDATE and instructs vector logos without products", () => {
    const contract = prompt({ archetype: "mystery_reveal", quiz_format: "image_guess" });
    expect(contract).toContain("GRAPHIC IDENTITY & LOGO MANDATE");
    expect(contract).toContain("ZERO PRODUCTS / MOCKUPS");
    expect(contract).toContain("NEVER substitute the logo with a physical commercial product");
    expect(contract).toContain("GRAPHIC IDENTITIES (Brand Logos, Superhero Insignias, Emblems, Flags, Symbols)");
  });
});
