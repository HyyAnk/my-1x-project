import { describe, expect, it } from "vitest";
import type { DirectorPlan, QuizV2 } from "@studio/shared";
import { planQuizAssets } from "../src/quiz/assets/assetPlanner.js";
import { reconcileQuizAssetSizing } from "../src/quiz/assets/reconcileQuizAssetSizing.js";

const mockQuiz: QuizV2 = {
  episode_id: "ep_showcase_test",
  topic: {
    title: "General Knowledge Christ Quiz",
    category: "religion_history",
    target_age: "7-9",
    summary: "Engaging quiz exploring history, sacred symbols, and stories.",
  },
  questions: [
    {
      id: "q1",
      number: 1,
      format: "multiple_choice",
      difficulty: 1,
      question: "Which sacred symbol features angel wings and a golden cross?",
      choices: [
        { id: "c1", text: "Angel Wings Cross" },
        { id: "c2", text: "Olive Branch" },
      ],
      correct_answer: "c1",
      explanation: "Cross with wings.",
      visual_opportunity: "Golden cross with white angel wings emblem",
    },
  ],
};

const mockDirector: DirectorPlan = {
  episode_id: "ep_showcase_test",
  archetype_family: "arcade_pop",
  target_age: "7-9",
  beats: [
    {
      question_id: "q1",
      archetype: "illustrated_multiple_choice",
      layout_id: "media_left_choices_right",
      asset_intents: ["question_illustration"],
      energy: "playful",
      visual_density: "focused",
    },
  ],
};

describe("Bridge Showcase Asset Planning Integration (Phase 3)", () => {
  it("preserves backward compatibility when options are omitted", () => {
    const plan = planQuizAssets(mockQuiz, mockDirector);
    // Only 1 hero illustration planned for q1, zero showcase items
    expect(plan.assets).toHaveLength(1);
    expect(plan.assets[0].purpose).toBe("hero_question_image");
  });

  it("plans 4 showcase items when includeBridgeShowcase is true", () => {
    const plan = planQuizAssets(mockQuiz, mockDirector, "pixar_3d", {
      includeBridgeShowcase: true,
    });

    // 1 hero illustration + 4 showcase items = 5 total
    expect(plan.assets).toHaveLength(5);

    const showcaseAssets = plan.assets.filter((a) => a.purpose === "bridge_topic_item");
    expect(showcaseAssets).toHaveLength(4);

    expect(showcaseAssets[0].asset_id).toBe("asset-bridge-item-1");
    expect(showcaseAssets[0].aspect_ratio).toBe("1:1");
    expect(showcaseAssets[0].transparent_background).toBe(true);
    expect(showcaseAssets[0].required).toBe(false);
    expect(showcaseAssets[0].semantic_key).toBe("bridge:showcase:asset-bridge-item-1");

    expect(showcaseAssets[1].asset_id).toBe("asset-bridge-item-2");
    expect(showcaseAssets[1].aspect_ratio).toBe("4:3");
    expect(showcaseAssets[1].transparent_background).toBe(false);

    expect(showcaseAssets[2].asset_id).toBe("asset-bridge-item-3");
    expect(showcaseAssets[2].aspect_ratio).toBe("4:3");
    expect(showcaseAssets[2].transparent_background).toBe(false);

    expect(showcaseAssets[3].asset_id).toBe("asset-bridge-item-4");
    expect(showcaseAssets[3].aspect_ratio).toBe("1:1");
    expect(showcaseAssets[3].transparent_background).toBe(true);
  });

  it("plans 4 showcase items when bridgeConfig is provided and enabled", () => {
    const plan = planQuizAssets(mockQuiz, mockDirector, "pixar_3d", {
      bridgeConfig: {
        enabled: true,
        enableTopicScene: true,
        enableCtaScene: true,
        enablePreOutroScene: true,
        timing: { topicPauseSeconds: 0.5, ctaPauseSeconds: 0.5, preOutroPauseSeconds: 0.5, transitionType: "brand_logo_stinger", stingerDurationSeconds: 1.3 },
      },
    });

    const showcaseAssets = plan.assets.filter((a) => a.purpose === "bridge_topic_item");
    expect(showcaseAssets).toHaveLength(4);
  });

  it("does not plan showcase items if bridgeConfig disables topic scene", () => {
    const plan = planQuizAssets(mockQuiz, mockDirector, "pixar_3d", {
      bridgeConfig: {
        enabled: true,
        enableTopicScene: false,
        enableCtaScene: true,
        enablePreOutroScene: true,
        timing: { topicPauseSeconds: 0.5, ctaPauseSeconds: 0.5, preOutroPauseSeconds: 0.5, transitionType: "brand_logo_stinger", stingerDurationSeconds: 1.3 },
      },
    });

    const showcaseAssets = plan.assets.filter((a) => a.purpose === "bridge_topic_item");
    expect(showcaseAssets).toHaveLength(0);
  });

  it("preserves showcase items during reconcileQuizAssetSizing", () => {
    const initialPlan = planQuizAssets(mockQuiz, mockDirector, "pixar_3d", {
      includeBridgeShowcase: true,
    });
    expect(initialPlan.assets).toHaveLength(5);

    const reconciled = reconcileQuizAssetSizing(mockQuiz, mockDirector, initialPlan);
    expect(reconciled.plan.assets).toHaveLength(5);

    const showcase = reconciled.plan.assets.filter((a) => a.purpose === "bridge_topic_item");
    expect(showcase).toHaveLength(4);
  });
});
