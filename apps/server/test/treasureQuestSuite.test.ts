import { describe, expect, it } from "vitest";
import {
  findBuiltInPresetById,
  ALL_ANSWER_CARD_STYLES,
  ALL_QUESTION_COUNTER_STYLES,
  ALL_THINKING_BAR_STYLES,
  ALL_BACKGROUND_STYLES,
  ALL_QUESTION_BOX_STYLES,
} from "@studio/shared";
import { answerCardRegistry, resolveAnswerCardSkin } from "../src/quiz/visual/elements/answerCard/registry.js";
import { COUNTER_BADGE_VARIANTS, resolveCounterBadgeVariant } from "../src/quiz/visual/elements/counterBadge/index.js";
import { THINKING_BAR_VARIANTS, resolveThinkingBarVariant } from "../src/quiz/visual/elements/thinkingBar/index.js";
import { backgroundRegistry, resolveBackgroundVariant } from "../src/quiz/visual/elements/background/index.js";
import { resolveQuestionBoxVariant } from "../src/quiz/visual/elements/questionBox/registry.js";
import { rusticWoodPlankVariant } from "../src/quiz/visual/elements/answerCard/variants/rusticWoodPlank.js";
import { goldenCompassVariant } from "../src/quiz/visual/elements/counterBadge/variants/goldenCompass.js";
import { treasureTrailVariant } from "../src/quiz/visual/elements/thinkingBar/variants/treasureTrail.js";
import { treasureMapVariant } from "../src/quiz/visual/elements/background/variants/treasureMap.js";
import { parchmentScrollVariant } from "../src/quiz/visual/elements/questionBox/variants/parchmentScroll.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

describe("Treasure Quest Dedicated Style Suite Integration", () => {
  it("verifies symmetry: all 5 visual slots have exactly 7 built-in styles", () => {
    expect(ALL_QUESTION_BOX_STYLES.length).toBe(7);
    expect(ALL_ANSWER_CARD_STYLES.length).toBe(7);
    expect(ALL_QUESTION_COUNTER_STYLES.length).toBe(7);
    expect(ALL_THINKING_BAR_STYLES.length).toBe(7);
    expect(ALL_BACKGROUND_STYLES.length).toBe(7);
  });

  it("registers all 4 new variants and binds parchment_scroll in preset_treasure_quest", () => {
    const preset = findBuiltInPresetById("preset_treasure_quest");
    expect(preset).toBeDefined();
    expect(preset?.name).toBe("Treasure Quest");
    expect(preset?.icon).toBe("🧭");
    expect(preset?.palette_id).toBe("sunny");
    expect(preset?.question_box_style).toBe("parchment_scroll");
    expect(preset?.answer_card_style).toBe("rustic_wood_plank");
    expect(preset?.counter_style).toBe("golden_compass");
    expect(preset?.thinking_bar_style).toBe("treasure_trail");
    expect(preset?.background_style).toBe("treasure_map");
  });

  it("resolves each new variant from its corresponding registry", () => {
    expect(answerCardRegistry.get("rustic_wood_plank")).toBe(rusticWoodPlankVariant);
    expect(COUNTER_BADGE_VARIANTS.golden_compass).toBe(goldenCompassVariant);
    expect(THINKING_BAR_VARIANTS.treasure_trail).toBe(treasureTrailVariant);
    expect(backgroundRegistry.get("treasure_map")).toBe(treasureMapVariant);

    expect(resolveAnswerCardSkin("rustic_wood_plank")).toBe(rusticWoodPlankVariant);
    expect(resolveCounterBadgeVariant("golden_compass")).toBe(goldenCompassVariant);
    expect(resolveThinkingBarVariant("treasure_trail")).toBe(treasureTrailVariant);
    expect(resolveBackgroundVariant("treasure_map")).toBe(treasureMapVariant);
    expect(resolveQuestionBoxVariant("parchment_scroll")).toBe(parchmentScrollVariant);
  });

  it("renders complete end-to-end sandbox composition with all 5 Treasure Quest elements", () => {
    const composition = buildSandboxComposition({
      layout_id: "media_left_choices_right",
      question_box_style: "parchment_scroll",
      answer_card_style: "rustic_wood_plank",
      counter_style: "golden_compass",
      thinking_bar_style: "treasure_trail",
      background_style: "treasure_map",
      palette_id: "sunny",
      phase: "thinking",
      question_text: "Where is the legendary Lost City of Gold located?",
      choices: ["Amazon Basin", "Himalayas", "Sahara Desert"],
      correct_choice_index: 0,
      explanation_text: "Legends describe El Dorado hidden deep within the Amazon rainforest.",
      question_number: 3,
      total_questions: 5,
      elapsed_seconds: 2.0,
    });

    // 1. Question Box: Adventure Parchment Scroll
    expect(composition.html).toContain("qb-parchment-scroll");
    expect(composition.html).toContain("scroll-seal");
    expect(composition.css).toContain(".qb-parchment-scroll");

    // 2. Answer Card: Rustic Wood Plank
    expect(composition.html).toContain("ac-rustic-wood-plank");
    expect(composition.html).toContain("wood-bracket");
    expect(composition.css).toContain(".ac-rustic-wood-plank");

    // 3. Counter Badge: Ancient Golden Compass
    expect(composition.html).toContain("cb-golden-compass");
    expect(composition.html).toContain("compass-housing");
    expect(composition.html).toContain("question-number-val");
    expect(composition.html).toContain(">3</span>");
    expect(composition.css).toContain(".cb-golden-compass");

    // 4. Thinking Bar: Expedition Map Trail
    expect(composition.html).toContain("thinking-bar-treasure-trail");
    expect(composition.html).toContain("trail-destination");
    expect(composition.html).toContain("trail-ship-marker");
    expect(composition.css).toContain(".thinking-bar-treasure-trail");

    // 5. Background: Antique Treasure Map
    expect(composition.html).toContain("bg-treasure-map");
    expect(composition.html).toContain("compass-rose-svg");
    expect(composition.css).toContain(".bg-treasure-map");
  });

  it("renders correct reveal state decorations and styling in choices_reveal phase", () => {
    const composition = buildSandboxComposition({
      layout_id: "media_left_choices_right",
      question_box_style: "parchment_scroll",
      answer_card_style: "rustic_wood_plank",
      counter_style: "golden_compass",
      thinking_bar_style: "treasure_trail",
      background_style: "treasure_map",
      palette_id: "sunny",
      phase: "reveal",
      question_text: "Which map tool measures distances at sea?",
      choices: ["Astrolabe", "Compass Dividers", "Sundial"],
      correct_choice_index: 1,
      explanation_text: "Dividers are nautical tools for stepping off distances on marine charts.",
      question_number: 1,
      total_questions: 3,
      elapsed_seconds: 7.0,
    });

    expect(composition.html).toContain("ac-rustic-wood-plank");
    expect(composition.css).toContain("ac-rustic-wood-plank-win");
  });

  it("ensures rustic_wood_plank does not leak answer state before reveal in scheduled mode", () => {
    const css = rusticWoodPlankVariant.renderCss();
    // 1. .answer-reveal-correct must NOT be bundled into static golden badge background/color rules
    expect(css).not.toMatch(/\.answer-reveal-correct[^{}]*\{[^}]*#FFF385/);
    expect(css).not.toMatch(/\.answer-reveal-correct[^{}]*\{[^}]*#FEF08A/);
    // 2. Scheduled badge must use animation ac-wood-seal-slam
    expect(css).toContain(".choice-card.answer-reveal-correct .ac-rustic-wood-plank .choice-label");
    expect(css).toContain("ac-wood-seal-slam");
    // 3. Choice text in scheduled mode must use ac-rustic-wood-text-win animation instead of static gold color
    expect(css).toContain("ac-rustic-wood-text-win");
    // 4. Initial 0% keyframes should preserve unrevealed state
    expect(css).toContain("@keyframes ac-wood-seal-slam");
    expect(css).toContain("@keyframes ac-rustic-wood-plank-win");
  });
});
