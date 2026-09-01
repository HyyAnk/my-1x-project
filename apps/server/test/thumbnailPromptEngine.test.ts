import { describe, expect, it } from "vitest";
import {
  compileDualThumbnailPrompts,
  compileThumbnailPrompt,
  resolveThumbnailLayout,
} from "../src/quiz/thumbnail/index.js";
import type { MascotProfile } from "@studio/shared";

describe("Thumbnail Layout Resolver & Prompt Compiler (Step 2)", () => {
  const sampleMascot: MascotProfile = {
    id: "mascot_kiko",
    name: "Kiko",
    description: "A smart robotic fox",
    visual_style: "pixar_3d",
    master_prompt: "a clever fluffy robotic fox with glowing cyan eyes and chrome accents",
    color_theme: "#06b6d4",
    master_image_url: "/mascots/kiko/master.png",
    actions: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("auto-resolves 'split_vs' layout for versus topics and formats", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "T-Rex vs Giant Mecha Robot: Would You Rather?",
      questionFormat: "versus",
      mascotProfile: sampleMascot,
    });

    expect(plan.layout).toBe("split_vs");
    expect(plan.hookText).toBe("WHICH WOULD YOU CHOOSE?");
    expect(plan.mascotPersona.role).toBe("Referee / Confused Judge");
    expect(plan.subjectAnchors.length).toBeGreaterThanOrEqual(2);
  });

  it("auto-resolves 'mystery_silhouette' layout for mystery and guess topics", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "Guess The Superhero By Shadow - Can You Guess Who?",
      questionFormat: "guess_image",
      mascotProfile: sampleMascot,
    });

    expect(plan.layout).toBe("mystery_silhouette");
    expect(plan.hookText).toBe("WHO IS THIS?");
    expect(plan.badgeText).toContain("ONLY 1% KNOW");
    expect(plan.mascotPersona.role).toBe("Master Detective");
  });

  it("auto-resolves 'odd_one_out' for spot the difference topics", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "Spot The Difference: Find The Odd Imposter Duck",
      questionFormat: "spot_difference",
      mascotProfile: sampleMascot,
    });

    expect(plan.layout).toBe("odd_one_out");
    expect(plan.hookText).toBe("FIND THE ODD ONE!");
    expect(plan.mascotPersona.role).toBe("Sharp Investigator");
  });

  it("auto-resolves 'difficulty_tier' for IQ level progression", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "IQ Test: 4 Levels From Easy To Impossible",
      questionFormat: "difficulty_tier",
      mascotProfile: sampleMascot,
    });

    expect(plan.layout).toBe("difficulty_tier");
    expect(plan.badgeText).toContain("IQ 140+");
    expect(plan.mascotPersona.expression).toContain("dizzy");
  });

  it("auto-resolves 'true_false' for myths and facts", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "10 Biggest Scientific Myths: True or False?",
      questionFormat: "true_false",
      mascotProfile: sampleMascot,
    });

    expect(plan.layout).toBe("true_false");
    expect(plan.hookText).toBe("TRUE OR FALSE?");
  });

  it("defaults to 'mega_grid' for general knowledge quizzes", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "General Knowledge Trivia Quiz",
      questionCount: 100,
      mascotProfile: sampleMascot,
    });

    expect(plan.layout).toBe("mega_grid");
    expect(plan.badgeText).toBe("100 QUESTIONS");
  });

  it("adapts mascot costume and props to space topic", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "Deep Space Astronomy & Solar System Secrets",
      questionCount: 50,
      mascotProfile: sampleMascot,
    });

    expect(plan.mascotPersona.role).toBe("Space Explorer");
    expect(plan.mascotPersona.costume).toContain("space helmet");
    expect(plan.mascotPersona.prop).toContain("moon");
  });

  it("compiles 16:9 prompt with YouTube timestamp safe zone directive", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "General Knowledge 100",
      questionCount: 100,
      mascotProfile: sampleMascot,
    });

    const prompt169 = compileThumbnailPrompt(plan, "16:9", sampleMascot);
    expect(prompt169).toContain("16:9");
    expect(prompt169).toContain("bottom-right corner");
    expect(prompt169).toContain("Kiko");
    expect(prompt169).toContain("GENERAL KNOWLEDGE");
  });

  it("compiles 9:16 prompt with Shorts UI overlay safe zone directive", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "General Knowledge 100",
      questionCount: 100,
      mascotProfile: sampleMascot,
    });

    const prompt916 = compileThumbnailPrompt(plan, "9:16", sampleMascot);
    expect(prompt916).toContain("9:16");
    expect(prompt916).toContain("middle 60% vertical safe zone");
    expect(prompt916).toContain("bottom 25%");
  });

  it("compiles dual prompts simultaneously", () => {
    const plan = resolveThumbnailLayout({
      topicTitle: "Dinosaur vs Alien Mech",
      questionFormat: "versus",
      mascotProfile: sampleMascot,
    });

    const dual = compileDualThumbnailPrompts(plan, sampleMascot);
    expect(dual.prompt_16_9).toContain("16:9");
    expect(dual.prompt_9_16).toContain("9:16");
    expect(dual.plan.layout).toBe("split_vs");
  });
});
