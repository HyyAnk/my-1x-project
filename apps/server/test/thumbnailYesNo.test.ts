import { describe, expect, it } from "vitest";
import type { MascotProfile } from "@studio/shared";
import {
  compileDualThumbnailPrompts,
  compileThumbnailPrompt,
  determineThumbnailLayout,
  resolveMascotDescription,
  resolveThumbnailLayout,
  THUMBNAIL_LOCALIZATIONS,
  type MascotVisualAnchor,
} from "../src/quiz/thumbnail/index.js";
import { resolveUniversalTopicHook, cleanRawTitleNoise, isGenericQuizTitle } from "../src/quiz/thumbnail/thumbnailTopicHookExtractor.js";
import { createDefaultDirectorPlan } from "../src/quiz/director/parseDirectorPlan.js";

describe("Thumbnail Yes/No Engine & Asset Pipeline (Stage 6)", () => {
  const sampleMascot: MascotProfile = {
    id: "mascot_kiko",
    name: "Kiko",
    description: "A smart robotic fox",
    visual_style: "pixar_3d",
    master_prompt: "a clever fluffy robotic fox with glowing cyan eyes and chrome accents",
    color_theme: "#10B981",
    master_image_url: "/mascots/kiko/master.png",
    actions: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleVisualAnchor: MascotVisualAnchor = {
    image_url: "/mascots/kiko/anchor.png",
    local_path: "/tmp/anchor.png",
    mime_type: "image/png",
  };

  describe("Layout Resolution", () => {
    it("resolves yes_no layout from questionFormat 'yes_no'", () => {
      const layout = determineThumbnailLayout("yes_no", "space facts challenge");
      expect(layout).toBe("yes_no");
    });

    it("resolves yes_no layout from questionFormat 'verdict_yes_no'", () => {
      const layout = determineThumbnailLayout("verdict_yes_no", "general trivia");
      expect(layout).toBe("yes_no");
    });

    it("resolves yes_no layout from topic containing 'yes or no'", () => {
      const layout = determineThumbnailLayout("standard", "10 Crazy Science Facts: Yes or No?");
      expect(layout).toBe("yes_no");
    });

    it("resolves yes_no layout from topic containing 'yes/no'", () => {
      const layout = determineThumbnailLayout("standard", "Animal Superpowers Yes/No Quiz");
      expect(layout).toBe("yes_no");
    });

    it("honors layoutOverride for yes_no", () => {
      const layout = determineThumbnailLayout("versus", "cats vs dogs", "yes_no");
      expect(layout).toBe("yes_no");
    });
  });

  describe("Multilingual Locales", () => {
    it("provides yes_no hook text and badge template in English", () => {
      const en = THUMBNAIL_LOCALIZATIONS.en;
      expect(en.hookText.yes_no).toBe("YES OR NO?");
      expect(en.badgeTemplate.yes_no(10)).toBe("YES OR NO? ⚡");
    });

    it("provides yes_no hook text across all 12 supported languages", () => {
      const languages = ["en", "ja", "ko", "zh", "es", "de", "fr", "nl", "no", "sv", "da", "fi"] as const;
      for (const lang of languages) {
        const loc = THUMBNAIL_LOCALIZATIONS[lang];
        expect(loc).toBeDefined();
        expect(loc.hookText.yes_no).toBeDefined();
        expect(typeof loc.hookText.yes_no).toBe("string");
        expect(loc.hookText.yes_no.length).toBeGreaterThan(0);
        expect(loc.badgeTemplate.yes_no).toBeDefined();
        expect(typeof loc.badgeTemplate.yes_no(5)).toBe("string");
        expect(loc.badgeTemplate.yes_no(5).length).toBeGreaterThan(0);
      }
    });
  });

  describe("Subject Anchor Resolution for yes_no", () => {
    it("resolves single 3D hero subject anchor for medical domain in yes_no layout", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "Emergency First Aid Yes or No",
        questionFormat: "yes_no",
        mascotProfile: sampleMascot,
      });

      expect(plan.layout).toBe("yes_no");
      expect(plan.subjectAnchors.length).toBe(1);
      expect(plan.subjectAnchors[0].label).toBe("Statement Subject");
      expect(plan.subjectAnchors[0].visualPrompt).toContain("medical first aid metal box");
    });

    it("resolves single 3D hero subject anchor for space domain in yes_no layout", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "Deep Space Planet Mysteries Yes/No",
        questionFormat: "yes_no",
        mascotProfile: sampleMascot,
      });

      expect(plan.layout).toBe("yes_no");
      expect(plan.subjectAnchors.length).toBe(1);
      expect(plan.subjectAnchors[0].visualPrompt).toContain("Planet Saturn");
    });

    it("resolves single 3D hero subject anchor for gaming domain in yes_no layout", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "Arcade Gaming Myths Yes or No",
        questionFormat: "yes_no",
        mascotProfile: sampleMascot,
      });

      expect(plan.layout).toBe("yes_no");
      expect(plan.subjectAnchors.length).toBe(1);
      expect(plan.subjectAnchors[0].visualPrompt).toContain("gaming cartridge");
    });

    it("resolves single 3D hero subject anchor for norse domain in yes_no layout", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "Norse Viking Legends: Yes or No?",
        questionFormat: "yes_no",
        mascotProfile: sampleMascot,
      });

      expect(plan.layout).toBe("yes_no");
      expect(plan.subjectAnchors.length).toBe(1);
      expect(plan.subjectAnchors[0].visualPrompt).toContain("Thor's battle hammer");
    });
  });

  describe("Prompt Compilation for yes_no", () => {
    it("compiles 16:9 prompt with green YES and red NO tactile buttons", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "Ocean Wonders: Yes or No?",
        questionFormat: "yes_no",
        mascotProfile: sampleMascot,
      });

      const prompt = compileThumbnailPrompt(plan, "16:9", sampleMascot, sampleVisualAnchor);
      expect(prompt).toContain("green 'YES' and red 'NO'");
      expect(prompt).toContain("STRICT: The ONLY place displaying 'YES' and 'NO'");
      expect(prompt).toContain("mascot must NOT hold Yes/No paddles");
      expect(prompt).toContain("bottom-right corner clean");
    });

    it("compiles 9:16 vertical prompt with safe zone and 440px bottom buffer", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "Ocean Wonders: Yes or No?",
        questionFormat: "yes_no",
        mascotProfile: sampleMascot,
      });

      const prompt = compileThumbnailPrompt(plan, "9:16", sampleMascot, sampleVisualAnchor);
      expect(prompt).toContain("green 'YES' and red 'NO'");
      expect(prompt).toContain("440px bottom buffer");
      expect(prompt).toContain("Center safe zone showcases an oversized, highly-detailed 3D hero artwork");
    });

    it("sanitizes accidental yes/no paddle props on the mascot", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "Science Facts",
        questionFormat: "yes_no",
        mascotProfile: sampleMascot,
      });

      plan.mascotPersona.prop = "Green 'YES' paddle in right hand, red 'NO' paddle in left hand";
      const desc = resolveMascotDescription(plan, sampleMascot, sampleVisualAnchor);
      expect(desc).not.toContain("paddle");
      expect(desc).toContain("hand resting thoughtfully under chin");
    });

    it("compiles dual prompts simultaneously for yes_no", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "Animal Superpowers Yes or No",
        questionFormat: "yes_no",
        mascotProfile: sampleMascot,
      });

      const dual = compileDualThumbnailPrompts(plan, sampleMascot, sampleVisualAnchor);
      expect(dual.prompt_16_9).toContain("16:9");
      expect(dual.prompt_16_9).toContain("green 'YES' and red 'NO'");
      expect(dual.prompt_9_16).toContain("9:16");
      expect(dual.prompt_9_16).toContain("440px bottom buffer");
    });
  });

  describe("Topic Hook Noise Stripping", () => {
    it("strips 'yes or no' and 'yes/no' noise from titles", () => {
      expect(cleanRawTitleNoise("Solar System Quiz: Yes or No?")).toBe("Solar System");
      expect(cleanRawTitleNoise("Animal Trivia: Yes/No Challenge")).toBe("Animal");
    });

    it("recognizes standalone 'yes or no' as generic quiz title", () => {
      expect(isGenericQuizTitle("Yes or No")).toBe(true);
      expect(isGenericQuizTitle("Yes/No Quiz")).toBe(true);
      expect(isGenericQuizTitle("Deep Ocean Creature Mysteries")).toBe(false);
    });

    it("resolves curated domain hook for yes_no layout", () => {
      const hook = resolveUniversalTopicHook({
        topicTitle: "Deep Space Planets: Yes or No?",
        layout: "yes_no",
        language: "en",
        defaultFallback: "YES OR NO?",
      });

      expect(hook).toBe("SOLAR SYSTEM QUIZ");
    });
  });

  describe("Director Plan Integration", () => {
    it("maps yes_no format questions to 'yes_no' director archetype", () => {
      const mockQuiz = {
        id: "quiz_test",
        title: "Yes No Test Quiz",
        age_band: "family" as const,
        questions: [
          {
            id: "q1",
            question: "Is the sun a star?",
            format: "yes_no" as const,
            choices: ["Yes", "No"],
            answer: "Yes",
            explanation: "The sun is indeed a yellow dwarf star.",
          },
          {
            id: "q2",
            question: "Is Pluto considered a main planet today?",
            format: "yes_no" as const,
            choices: ["Yes", "No"],
            answer: "No",
            explanation: "Pluto is classified as a dwarf planet.",
          },
          {
            id: "q3",
            question: "Can sound travel through empty space vacuum?",
            format: "yes_no" as const,
            choices: ["Yes", "No"],
            answer: "No",
            explanation: "Sound waves require a physical medium to travel.",
          },
        ],
      };

      const plan = createDefaultDirectorPlan(mockQuiz);
      expect(plan.beats[0].archetype).toBe("yes_no");
      expect(plan.beats[1].archetype).toBe("yes_no");
      expect(plan.beats[2].archetype).toBe("final_challenge");
    });
  });
});
