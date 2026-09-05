import { describe, expect, it, vi } from "vitest";
import {
  MASCOT_ARCHETYPES_CATALOG,
  selectRandomArchetypes,
  selectRandomVariation,
} from "../src/quiz/thumbnail/thumbnailArchetypes.js";
import { buildAiPlannerPrompt, planThumbnailWithAI } from "../src/quiz/thumbnail/thumbnailAiPlanner.js";
import { compileThumbnailPrompt } from "../src/quiz/thumbnail/thumbnailPromptCompiler.js";
import { resolveThumbnailLayout } from "../src/quiz/thumbnail/thumbnailLayoutResolver.js";
import {
  AUTO_CURIOSITY_BADGE_PRESETS,
  getCuriosityBadgeText,
  getRandomCuriosityBadge,
} from "../src/quiz/thumbnail/thumbnailLocale.js";
import type { QuizThumbnailPlan } from "../src/quiz/thumbnail/thumbnailTypes.js";
import * as promptSanitizer from "../src/utils/promptSanitizer.js";

describe("Thumbnail Mascot 10 Abstract Archetypes & Random Selection", () => {
  describe("MASCOT_ARCHETYPES_CATALOG Definition", () => {
    it("defines exactly 10 distinct archetypes with IDs 1 to 10", () => {
      expect(MASCOT_ARCHETYPES_CATALOG).toHaveLength(10);

      const ids = MASCOT_ARCHETYPES_CATALOG.map((a) => a.id);
      expect(new Set(ids).size).toBe(10);
      expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const codes = MASCOT_ARCHETYPES_CATALOG.map((a) => a.code);
      expect(new Set(codes).size).toBe(10);
    });

    it("enforces zero concrete examples in archetype guidelines to avoid semantic bias", () => {
      const concreteForbiddenWords = [
        "cookie",
        "biscuit",
        "cake",
        "magnifying glass",
        "rolling pin",
        "trench coat",
        "whistle",
        "space helmet",
        "finger",
      ];

      for (const archetype of MASCOT_ARCHETYPES_CATALOG) {
        const lowerGuideline = archetype.guideline.toLowerCase();
        for (const forbidden of concreteForbiddenWords) {
          expect(lowerGuideline).not.toContain(forbidden);
        }
      }
    });
  });

  describe("selectRandomArchetypes", () => {
    it("selects exactly 5 distinct archetypes without replacement", () => {
      const selected = selectRandomArchetypes(MASCOT_ARCHETYPES_CATALOG, 5);
      expect(selected).toHaveLength(5);

      const uniqueIds = new Set(selected.map((s) => s.id));
      expect(uniqueIds.size).toBe(5);
    });

    it("handles count limits and deterministic rng mocks", () => {
      const customMockRng = vi.fn().mockReturnValue(0.25);
      const selected = selectRandomArchetypes(MASCOT_ARCHETYPES_CATALOG, 3, customMockRng);
      expect(selected).toHaveLength(3);
    });

    it("exercises uniform distribution across multiple stochastic runs", () => {
      const frequencyMap: Record<number, number> = {};
      const iterations = 200;

      for (let i = 0; i < iterations; i++) {
        const sample = selectRandomArchetypes(MASCOT_ARCHETYPES_CATALOG, 5);
        for (const item of sample) {
          frequencyMap[item.id] = (frequencyMap[item.id] || 0) + 1;
        }
      }

      // Every archetype (1-10) should have been selected multiple times
      for (let id = 1; id <= 10; id++) {
        expect(frequencyMap[id]).toBeGreaterThan(20);
      }
    });
  });

  describe("selectRandomVariation", () => {
    it("returns null for empty arrays", () => {
      expect(selectRandomVariation([])).toBeNull();
    });

    it("returns a valid variation and index for non-empty arrays", () => {
      const items = ["alpha", "beta", "gamma", "delta", "epsilon"];
      const result = selectRandomVariation(items);
      expect(result).not.toBeNull();
      expect(items).toContain(result!.selected);
      expect(result!.index).toBeGreaterThanOrEqual(0);
      expect(result!.index).toBeLessThan(items.length);
    });
  });

  describe("buildAiPlannerPrompt", () => {
    it("formats prompt with 5 directed archetypes and strict anti-bias directives", () => {
      const prompt = buildAiPlannerPrompt(
        {
          topicTitle: "World Flags Trivia",
          language: "English",
          questionCount: 10,
        },
        MASCOT_ARCHETYPES_CATALOG.slice(0, 5),
      );

      expect(prompt).toContain("[SELECTED MASCOT ARCHETYPES FOR THIS EPISODE]:");
      expect(prompt).toContain("Archetype ID 1:");
      expect(prompt).toContain("Archetype ID 5:");
      expect(prompt).toContain("STRICT ZERO-COPY & ANTI-BIAS RULES");
      expect(prompt).toContain("mascot_persona_variations");
      // Zero concrete examples in prompt schema
      expect(prompt).not.toContain("Pastry Chef");
      expect(prompt).not.toContain("delicious cookie challenge");
    });
  });

  describe("planThumbnailWithAI integration", () => {
    it("parses 5 variations, selects 1 randomly, and preserves all 5 in the plan", async () => {
      const mockVariations = [
        {
          id: 1,
          archetypeId: 1,
          archetypeName: "The Mind-Blown / Shocked Reactor",
          role: "Stunned Historian",
          costume: "vintage scholar spectacles and tweed vest",
          prop: "ancient scroll unraveling in surprise",
          expression: "wide open mouth, disbelieving eyes",
          poseDescription: "hands gripping sides of head in sheer astonishment",
        },
        {
          id: 2,
          archetypeId: 2,
          archetypeName: "The Deep Investigator",
          role: "Archive Detective",
          costume: "classic detective trenchcoat",
          prop: "brass magnifying glass",
          expression: "narrowed scrutinizing gaze with focused smirk",
          poseDescription: "crouching low to examine the evidence closely",
        },
        {
          id: 3,
          archetypeId: 3,
          archetypeName: "The Dilemma Agonizer",
          role: "Torn Judge",
          costume: "two-tone referee vest",
          prop: "balance scales",
          expression: "comedically conflicted sweatdrop",
          poseDescription: "scratching head while looking back and forth",
        },
        {
          id: 4,
          archetypeId: 4,
          archetypeName: "The Cheeky Challenger",
          role: "Riddle Master",
          costume: "velvet magician cape",
          prop: "golden enigma key",
          expression: "knowing wink and mysterious grin",
          poseDescription: "putting finger to lips in hush gesture",
        },
        {
          id: 5,
          archetypeId: 7,
          archetypeName: "The Euphoric Celebrator",
          role: "Quiz Champion",
          costume: "gold medal ribbon and celebratory sash",
          prop: "sparkling trophy cup",
          expression: "beaming radiant triumphant smile",
          poseDescription: "leaping with both arms raised in victory",
        },
      ];

      const fakeJsonResponse = JSON.stringify({
        hook_text: "FLAG SECRETS REVEALED!",
        badge_text: "ONLY 1% KNOW! 🔥",
        layout: "split_vs",
        environment_atmosphere: "Atmospheric royal map room with warm spotlighting",
        lighting_palette: "Rich warm cinematic amber and blue rim light",
        mascot_persona_variations: mockVariations,
        subject_anchors: [
          { label: "Option A", visualPrompt: "3D golden dragon crest" },
          { label: "Option B", visualPrompt: "3D silver eagle insignia" },
        ],
      });

      const sanitizerSpy = vi.spyOn(promptSanitizer, "executeSinglePromptText").mockResolvedValue(fakeJsonResponse);

      const dummyClient = { isDummy: true };

      const plan = await planThumbnailWithAI({
        topicTitle: "World Flags Trivia",
        language: "English",
        llmClient: dummyClient as any,
      });

      sanitizerSpy.mockRestore();

      expect(plan.hookText).toBe("FLAG SECRETS REVEALED!");
      expect(plan.mascotVariations).toHaveLength(5);
      expect(plan.selectedVariationId).toBeDefined();
      expect(plan.selectedVariationId).toBeGreaterThanOrEqual(1);
      expect(plan.selectedVariationId).toBeLessThanOrEqual(5);

      // Verify the active persona was chosen from the variations
      const matching = mockVariations.find((v) => v.id === plan.selectedVariationId);
      expect(matching).toBeDefined();
      expect(plan.mascotPersona.role).toBe(matching!.role);
      expect(plan.mascotPersona.poseDescription).toBe(matching!.poseDescription);
      expect(plan.mascotPersona.expression).toBe(matching!.expression);

      // Verify prompt compiler reflects the dynamic selected persona without pointing
      const prompt = compileThumbnailPrompt(plan, "16:9");
      expect(prompt).toContain(matching!.poseDescription);
      expect(prompt).toContain(matching!.expression);
      expect(prompt).toContain("FLAG SECRETS REVEALED!");
    });
  });

  describe("Curiosity Badge Stochastic Selection", () => {
    it("has distinct presets defined in AUTO_CURIOSITY_BADGE_PRESETS", () => {
      expect(AUTO_CURIOSITY_BADGE_PRESETS.length).toBeGreaterThanOrEqual(6);
      expect(AUTO_CURIOSITY_BADGE_PRESETS).toContain("layout_default");
      expect(AUTO_CURIOSITY_BADGE_PRESETS).toContain("99_percent_fail");
      expect(AUTO_CURIOSITY_BADGE_PRESETS).toContain("genius_only");
      expect(AUTO_CURIOSITY_BADGE_PRESETS).toContain("iq_test");
      expect(AUTO_CURIOSITY_BADGE_PRESETS).toContain("only_1_percent");
    });

    it("resolves random curiosity badge in target language when auto is specified", () => {
      // Mock deterministic index 1 ("99_percent_fail")
      const mockRng1 = () => 1 / AUTO_CURIOSITY_BADGE_PRESETS.length;
      const esBadge = getRandomCuriosityBadge(10, "es", "10 PREGUNTAS", mockRng1);
      expect(esBadge).toBe("¡99% FALLA! 🔥");

      const enBadge = getRandomCuriosityBadge(10, "en", "10 QUESTIONS", mockRng1);
      expect(enBadge).toBe("99% FAIL! 🔥");

      // Mock deterministic index 2 ("genius_only")
      const mockRng2 = () => 2 / AUTO_CURIOSITY_BADGE_PRESETS.length;
      const jaBadge = getRandomCuriosityBadge(10, "ja", "全10問", mockRng2);
      expect(jaBadge).toBe("天才専用 🧠");
    });

    it("preserves backwards compatibility when badgeType is undefined", () => {
      const defaultBadge = getCuriosityBadgeText(undefined, 10, "en", "10 QUESTIONS");
      expect(defaultBadge).toBe("10 QUESTIONS");
    });

    it("generates varied badges across stochastic runs when badgeOverride is auto", () => {
      const badges = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const plan = resolveThumbnailLayout({
          topicTitle: "World Trivia Challenge",
          questionCount: 10,
          language: "English",
          badgeOverride: "auto",
        });
        badges.add(plan.badgeText);
      }
      // With 7 options in the pool, 50 runs must yield multiple distinct badge texts
      expect(badges.size).toBeGreaterThan(1);
    });

    it("verifies AI planner prompt does not contain biased few-shot examples in badge_text instruction", () => {
      const prompt = buildAiPlannerPrompt({
        topicTitle: "Space Odyssey",
        language: "English",
      });

      expect(prompt).not.toContain('e.g. "99% FAIL! 🔥"');
      expect(prompt).toContain("Dynamically pick ONE psychological hook");
    });
  });
});
