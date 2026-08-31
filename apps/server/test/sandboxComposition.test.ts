import { describe, expect, it } from "vitest";
import { ALL_QUESTION_BOX_STYLES, ALL_QUESTION_COUNTER_STYLES, ALL_THINKING_BAR_STYLES } from "@studio/shared";
import { getQuestionBoxVariant, resolveQuestionBoxVariant } from "../src/quiz/visual/elements/questionBox/registry.js";
import { getCounterBadgeVariant, resolveCounterBadgeVariant } from "../src/quiz/visual/elements/counterBadge/registry.js";
import { buildSandboxComposition } from "../src/quiz/render/sandboxComposition.js";

describe("QuestionBox and CounterBadge Element Registries", () => {
  it("registers all QuestionBox styles", () => {
    for (const style of ALL_QUESTION_BOX_STYLES) {
      if (style === "auto") continue;
      const variant = getQuestionBoxVariant(style);
      expect(variant).toBeDefined();
      expect(variant.id).toBe(style);
      expect(variant.displayName).toBeTruthy();
      expect(typeof variant.renderHtml).toBe("function");
      expect(typeof variant.renderCss).toBe("function");
    }
  });

  it("resolves auto question box to default candy_pop", () => {
    expect(resolveQuestionBoxVariant("auto").id).toBe("candy_pop");
    expect(resolveQuestionBoxVariant(null).id).toBe("candy_pop");
  });

  it("registers all CounterBadge styles", () => {
    for (const style of ALL_QUESTION_COUNTER_STYLES) {
      if (style === "auto") continue;
      const variant = getCounterBadgeVariant(style);
      expect(variant).toBeDefined();
      expect(variant.id).toBe(style);
      expect(variant.displayName).toBeTruthy();
      expect(typeof variant.renderHtml).toBe("function");
      expect(typeof variant.renderCss).toBe("function");
    }
  });

  it("resolves auto counter badge to default hanging_woodsign", () => {
    expect(resolveCounterBadgeVariant("auto").id).toBe("hanging_woodsign");
    expect(resolveCounterBadgeVariant(null).id).toBe("hanging_woodsign");
  });
});

describe("buildSandboxComposition Preview Engine", () => {
  it("builds a complete HTML composition for the default thinking phase", () => {
    const result = buildSandboxComposition({
      theme: "candy_arcade",
      palette_id: "sunny",
      thinking_bar_style: "capsule_liquid",
      question_box_style: "comic_bubble",
      counter_style: "neon_badge",
      phase: "thinking",
      question_text: "What is the biggest mammal on Earth?",
      choices: ["Elephant", "Blue Whale", "Giraffe"],
      correct_choice_index: 1,
      question_number: 3,
      total_questions: 10,
    });

    expect(result.html).toContain("<!doctype html>");
    expect(result.html).toContain("What is the biggest mammal on Earth?");
    expect(result.html).toContain("Blue Whale");
    expect(result.html).toContain("qb-comic-bubble");
    expect(result.html).toContain("cb-neon-badge");
    expect(result.html).toContain("thinking-bar-capsule-liquid");
    expect(result.contrast_report.ok).toBe(true);
  });

  it("renders reveal and explain phases with correct answer highlights", () => {
    const revealResult = buildSandboxComposition({
      phase: "reveal",
      correct_choice_index: 2,
      choices: ["Option A", "Option B", "Option C"],
    });

    expect(revealResult.html).toContain("answer-correct");
    expect(revealResult.html).toContain("Option C");

    const explainResult = buildSandboxComposition({
      phase: "explain",
      fact_card_text: "Saturn rings are made of ice particles!",
    });
    expect(explainResult.html).toContain("sandbox-explain-card");
    expect(explainResult.html).toContain("Saturn rings are made of ice particles!");
  });

  it("rejects a fourth sandbox answer before rendering HTML", () => {
    expect(() =>
      buildSandboxComposition({
        phase: "reveal",
        correct_choice_index: 2,
        choices: ["Option A", "Option B", "Option C", "Forbidden fourth option"],
      } as never),
    ).toThrow();
  });

  it("supports rendering with all thinking bar, question box, counter, and answer card combinations without error", () => {
    for (const tb of ALL_THINKING_BAR_STYLES) {
      for (const qb of ALL_QUESTION_BOX_STYLES) {
        for (const cb of ALL_QUESTION_COUNTER_STYLES) {
          const res = buildSandboxComposition({
            thinking_bar_style: tb,
            question_box_style: qb,
            counter_style: cb,
            answer_card_style: "comic_chunky",
            layout_id: "media_left_choices_right",
          });
          expect(res.html).toBeTruthy();
          expect(res.css).toBeTruthy();
          expect(res.html).toContain("layout-media_left_choices_right");
          expect(res.html).toContain("ac-comic-chunky");
        }
      }
    }
  });

  it("supports timeline_time_seconds scrubbing", () => {
    const resQuestion = buildSandboxComposition({
      timeline_time_seconds: 0.5,
      choices: ["A", "B", "C"],
    });
    expect(resQuestion.html).toContain('data-choice-visibility="hidden"');

    const resThinking = buildSandboxComposition({
      timeline_time_seconds: 4.5,
      choices: ["A", "B", "C"],
    });
    expect(resThinking.html).toContain('data-choice-visibility="visible"');

    const resReveal = buildSandboxComposition({
      timeline_time_seconds: 8.0,
      correct_choice_index: 1,
      choices: ["A", "B", "C"],
    });
    expect(resReveal.html).toContain('data-answer-state="correct"');
  });

  describe("Mascot rendering in Sandbox", () => {
    const mockMascotProfile = {
      id: "mascot_test_123",
      name: "Robo Fox",
      description: "Smart orange robot fox",
      visual_style: "pixar_3d" as const,
      master_prompt: "cute robo fox",
      master_image_url: "/api/mascots/mascot_test_123/assets/concept.png",
      color_theme: "#f97316",
      actions: {
        thinking: {
          action: "thinking" as const,
          sprite_url: "/api/mascots/mascot_test_123/assets/thinking_sprite.png",
          frames_count: 6,
          fps: 12,
          loop: true,
          motion_preset: "sway" as const,
        },
        celebrate: {
          action: "celebrate" as const,
          sprite_url: "/api/mascots/mascot_test_123/assets/celebrate_sprite.png",
          frames_count: 8,
          fps: 15,
          loop: true,
          motion_preset: "jump" as const,
        },
      },
      assigned_channel_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it("renders real mascot with sprite URL and action animation metadata", () => {
      const res = buildSandboxComposition(
        {
          mascot_id: "mascot_test_123",
          mascot_enabled: true,
          mascot_action: "thinking",
          mascot_position: "bottom_left",
          mascot_scale: 1.25,
          mascot_offset_x: 20,
          mascot_offset_y: -10,
        },
        mockMascotProfile,
      );

      expect(res.html).toContain('<div class="candy-mascot-container');
      expect(res.html).toContain("anchor-bottom_left");
      expect(res.html).toContain("state-thinking");
      expect(res.html).toContain("/api/mascots/mascot_test_123/assets/thinking_sprite.png");
      expect(res.html).toContain("--mascot-scale:1.25");
      expect(res.html).toContain('data-mascot-contract-version="2"');
      expect(res.html).toContain('data-mascot-legacy-frames="6"');
      expect(res.html).toContain('data-mascot-legacy-fps="12"');
      expect(res.html).toContain('data-mascot-offset-x="20"');
      expect(res.html).toContain('data-mascot-offset-y="-10"');
      expect(res.html).toContain('<base href="/">');
      expect(res.html).toContain("mascot-v2-preview");
    });

    it("falls back to master_image_url when selected action does not have a dedicated sprite", () => {
      const res = buildSandboxComposition(
        {
          mascot_id: "mascot_test_123",
          mascot_enabled: true,
          mascot_action: "point",
          mascot_position: "bottom_right",
        },
        { ...mockMascotProfile, actions: {} },
      );

      expect(res.html).toContain('<div class="candy-mascot-container');
      expect(res.html).toContain("anchor-bottom_right");
      expect(res.html).toContain("state-point");
      expect(res.html).toContain("/api/mascots/mascot_test_123/assets/concept.png");
    });

    it("does not render mascot when mascotProfile is missing or unassigned", () => {
      const res = buildSandboxComposition({
        mascot_id: "non_existent_mascot",
        mascot_enabled: true,
        mascot_action: "celebrate",
        mascot_position: "bottom_left",
      });

      expect(res.html).not.toContain('<div class="candy-mascot-container');
      expect(res.html).not.toContain("sandbox-mascot-fallback");
      expect(res.html).not.toContain("fallback-mascot-badge");
      expect(res.html).not.toContain("🎉");
    });

    it("does not render mascot when mascot_enabled is false or mascot_id is none", () => {
      const resDisabled = buildSandboxComposition(
        {
          mascot_id: "mascot_test_123",
          mascot_enabled: false,
        },
        mockMascotProfile,
      );
      expect(resDisabled.html).not.toContain('<div class="candy-mascot-container');

      const resNone = buildSandboxComposition({
        mascot_id: "none",
        mascot_enabled: true,
      });
      expect(resNone.html).not.toContain('<div class="candy-mascot-container');
    });

    it("uses one fixed Mascot-on content layout regardless of mascot anchor", () => {
      const resLeft = buildSandboxComposition(
        { mascot_id: "mascot_test_123", mascot_position: "bottom_left", layout_id: "media_left_choices_right" },
        mockMascotProfile,
      );

      expect(resLeft.html).toContain("layout-media_left_choices_right has-mascot sandbox-preview-stage");
      expect(resLeft.html).toContain("layout-media_left_choices_right");
      expect(resLeft.html).toContain(
        ".has-mascot { --mascot-content-width: 1420px; --question-card-width: 1440px; --question-card-left-edge: 360px; }",
      );
      expect(resLeft.html).toContain(
        ".has-mascot .game-header { left: calc(var(--question-card-left-edge) / 2); transform: translateX(-50%); }",
      );
      expect(resLeft.html).toContain(".has-mascot .game-stage { width: var(--mascot-content-width); margin-right: 40px; }");
      expect(resLeft.html).toContain(
        ".has-mascot .question-title { width: var(--question-card-width); max-width: var(--question-card-width); }",
      );
      expect(resLeft.html).toContain(".has-mascot .phase-region { left: 0; width: var(--question-card-width); transform: none; }");
      expect(resLeft.html).toContain(
        ".has-mascot .phase-region > .thinking-bar, .has-mascot .phase-region > .fact-card { width: min(70vw, 1300px); left: 50%; }",
      );
      expect(resLeft.html).not.toContain("has-mascot-left");
      expect(resLeft.html).not.toContain("has-mascot-right");
      expect(resLeft.html).toContain('<div class="candy-mascot-container');

      const resRight = buildSandboxComposition(
        { mascot_id: "mascot_test_123", mascot_position: "bottom_right", layout_id: "media_left_choices_right" },
        mockMascotProfile,
      );

      expect(resRight.html).toContain("layout-media_left_choices_right has-mascot sandbox-preview-stage");
      expect(resRight.html).toContain("anchor-bottom_right");
      expect(resRight.html).toContain('<div class="candy-mascot-container');
    });

    it("renders Channel Brand Mark in sandbox when mascot is present and respects channel_brand_name", () => {
      const res = buildSandboxComposition(
        {
          mascot_id: "mascot_test_123",
          mascot_enabled: true,
          channel_brand_name: "Robot World",
        },
        mockMascotProfile,
      );

      expect(res.html).toContain('<div class="channel-brand-mark"');
      expect(res.html).toContain("Robot World");
      expect(res.html).toContain("QUIZ");
    });

    it("does not render Channel Brand Mark in sandbox when mascot is disabled", () => {
      const res = buildSandboxComposition(
        {
          mascot_id: "mascot_test_123",
          mascot_enabled: false,
          channel_brand_name: "Robot World",
        },
        mockMascotProfile,
      );

      expect(res.html).not.toContain('<div class="channel-brand-mark"');
    });
  });
});
