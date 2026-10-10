import { describe, expect, it } from "vitest";
import { getQuizImageSlotGeometry, recommendImageSizing } from "@studio/shared";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { QUIZ_PORTRAIT_MAX_CHOICE_IMAGES } from "../src/quiz/assets/visualAnswerSetGroup.js";
import { getRecommendationForAssetRequirement, resolveAssetRequirementCanvas } from "../src/quiz/assets/imageMetadataValidator.js";
import { createQuizShortDirectorPlan } from "../src/quiz/director/quizShortDirectorPlan.js";
import { buildImageQuizShortQuiz, buildQuizShortConfig, buildQuizShortQuiz } from "./fixtures/quizShortFixtures.js";

describe("Quiz Short asset plan", () => {
  it("sizes hero and choice images from the portrait slot geometry", () => {
    const quiz = buildImageQuizShortQuiz();
    const director = createQuizShortDirectorPlan(quiz, buildQuizShortConfig());
    const plan = planQuizAssets(quiz, director, "pixar_3d", { aspectRatio: "9:16" });

    const hero = plan.assets.find((asset) => asset.question_id === "q1" && asset.purpose === "hero_question_image");
    const portraitHero = getQuizImageSlotGeometry({
      layoutId: "short_media_top_choices",
      purpose: "hero_question_image",
      presentation: "text",
      choiceCount: 3,
      canvasAspectRatio: "9:16",
    });
    const heroRecommendation = portraitHero ? recommendImageSizing(portraitHero) : null;
    expect(hero?.sizing?.layout_id).toBe("short_media_top_choices");
    expect(heroRecommendation?.ok).toBe(true);
    if (heroRecommendation?.ok) {
      expect(hero?.sizing?.recommended_width).toBe(heroRecommendation.value.recommended.width);
      expect(hero?.sizing?.recommended_height).toBe(heroRecommendation.value.recommended.height);
      expect(hero?.aspect_ratio).toBe(heroRecommendation.value.aspectRatio);
    }

    const versusChoices = plan.assets.filter((asset) => asset.question_id === "q2" && asset.purpose === "answer_option");
    expect(versusChoices).toHaveLength(2);
    expect(versusChoices.every((asset) => asset.sizing?.layout_id === "short_versus_two")).toBe(true);
    expect(versusChoices.every((asset) => asset.aspect_ratio === "3:4")).toBe(true);
  });

  it("infers the portrait canvas from the beat layouts when no aspect ratio is given", () => {
    const quiz = buildImageQuizShortQuiz();
    const director = createQuizShortDirectorPlan(quiz, buildQuizShortConfig());
    expect(planQuizAssets(quiz, director)).toEqual(planQuizAssets(quiz, director, "pixar_3d", { aspectRatio: "9:16" }));
  });

  it("never plans three choice images for a portrait beat", () => {
    const quiz = buildQuizShortQuiz([{ visual: "Jupiter" }, { visual: "Mars" }, { visual: "Venus" }]);
    const director = createQuizShortDirectorPlan(
      quiz,
      buildQuizShortConfig({ layout_pair: { primary: "short_media_top_choices", secondary: "short_versus_two" } }),
    );
    const plan = planQuizAssets(quiz, director, "pixar_3d", { aspectRatio: "9:16" });
    for (const question of quiz.questions) {
      const choiceImages = plan.assets.filter((asset) => asset.question_id === question.id && asset.purpose === "answer_option");
      expect(choiceImages.length).toBeLessThanOrEqual(QUIZ_PORTRAIT_MAX_CHOICE_IMAGES);
    }
    expect(QUIZ_PORTRAIT_MAX_CHOICE_IMAGES).toBe(2);
  });

  it("validates portrait assets against the portrait canvas", () => {
    const requirement = {
      asset_id: "asset-q2-q2-c0",
      question_id: "q2",
      subject: "Mars",
      purpose: "answer_option" as const,
      style: "cute_illustration" as const,
      aspect_ratio: "3:4" as const,
      transparent_background: true,
      required: true,
      semantic_key: "q2:choice:q2-c0",
      consistency_group_id: null,
      sizing: {
        policy_version: 1 as const,
        layout_id: "short_versus_two" as const,
        geometry_key: "key",
        recommended_width: 648,
        recommended_height: 864,
      },
    };
    expect(resolveAssetRequirementCanvas(requirement)).toBe("9:16");
    const recommendation = getRecommendationForAssetRequirement(requirement);
    expect(recommendation.geometry.canvas).toEqual({ width: 1080, height: 1920 });
    expect(recommendation.aspectRatio).toBe("3:4");
    expect(getRecommendationForAssetRequirement({ ...requirement, sizing: undefined }, "9:16").geometry.canvas).toEqual({
      width: 1080,
      height: 1920,
    });
    expect(getRecommendationForAssetRequirement({ ...requirement, sizing: undefined }).geometry.canvas).toEqual({
      width: 1920,
      height: 1080,
    });
  });
});
