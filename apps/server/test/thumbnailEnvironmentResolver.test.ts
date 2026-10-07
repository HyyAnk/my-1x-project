import { describe, expect, it } from "vitest";
import type { MascotProfile } from "@studio/shared";
import {
  compileThumbnailPrompt,
  planThumbnailWithAI,
  resolveFallbackEnvironment,
  resolveThumbnailLayout,
} from "../src/quiz/thumbnail/index.js";
import type { LLMClient } from "../src/utils/promptSanitizer.js";

const sampleMascot: MascotProfile = {
  id: "mascot_hero_1",
  name: "Barnaby",
  species: "bear",
  personality: "friendly and adventurous",
  catchphrase: "Let's discover!",
  visual_description: "A cheerful golden bear wearing blue denim overalls",
  color_theme: "#f59e0b",
};

function createMockLlm(responseObject: unknown): LLMClient {
  return {
    async executePrompt() {
      return JSON.stringify(responseObject);
    },
  };
}

describe("Stage 5: Pixar 3D Environment Atmosphere & Studio Lighting Contextualizer", () => {
  describe("Minimalist Themed 3D Studio Cyclorama & Lighting Resolution across 15+ Domains", () => {
    it("resolves clean mint-teal cyclorama studio backdrop for medical topics", () => {
      const res = resolveFallbackEnvironment(
        "school clinic secrets: first aid heroes",
        "School Clinic Secrets: First Aid Heroes",
      );
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in soft soothing pastel mint-teal gradient");
      expect(res.environmentAtmosphere).toContain("center spotlight halo behind subjects");
      expect(res.environmentAtmosphere).toContain("zero background furniture, shelves, or clutter");
      expect(res.lightingPalette).toContain("Crisp warm daylight with soft clinical fill");
      expect(res.lightingPalette).toContain("turquoise rim light");
    });

    it("resolves deep indigo-purple cyclorama studio backdrop for gaming topics", () => {
      const res = resolveFallbackEnvironment("arcade gaming showdown", "Arcade Gaming Showdown");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in deep indigo and electric purple gradient");
      expect(res.environmentAtmosphere).toContain("glowing neon cyan center spotlight halo");
      expect(res.environmentAtmosphere).toContain("zero background cabinets or furniture clutter");
      expect(res.lightingPalette).toContain("Vibrant neon magenta key");
      expect(res.lightingPalette).toContain("electric cyan rim lighting");
    });

    it("resolves emerald-amber cyclorama studio backdrop for dinosaur topics", () => {
      const res = resolveFallbackEnvironment("jurassic dinosaur fossil hunt", "Jurassic Dinosaur Fossil Hunt");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in warm emerald and earthy amber gradient");
      expect(res.environmentAtmosphere).toContain("soft golden sunbeam center spotlight halo");
      expect(res.environmentAtmosphere).toContain("zero background foliage or landscape clutter");
      expect(res.lightingPalette).toContain("Warm amber sunbeam key");
      expect(res.lightingPalette).toContain("dramatic golden rim light");
    });

    it("resolves azure-aquamarine cyclorama studio backdrop for ocean topics", () => {
      const res = resolveFallbackEnvironment("deep sea ocean creatures", "Deep Sea Ocean Creatures");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in deep luminous azure and aquamarine gradient");
      expect(res.environmentAtmosphere).toContain("soft aqua caustic center spotlight halo");
      expect(res.environmentAtmosphere).toContain("zero background reef clutter");
      expect(res.lightingPalette).toContain("Shimmering aqua caustic key");
      expect(res.lightingPalette).toContain("radiant cyan rim lighting");
    });

    it("resolves violet-amethyst cyclorama studio backdrop for fantasy topics", () => {
      const res = resolveFallbackEnvironment("mythology wizard spell quest", "Mythology Wizard Spell Quest");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in enchanting deep violet and starry amethyst gradient");
      expect(res.environmentAtmosphere).toContain("magical golden center spotlight halo");
      expect(res.environmentAtmosphere).toContain("zero background room clutter");
      expect(res.lightingPalette).toContain("Mystical amethyst key light");
      expect(res.lightingPalette).toContain("warm gold edge backlight");
    });

    it("resolves slate-cyan cyclorama studio backdrop for science topics", () => {
      const res = resolveFallbackEnvironment("atomic chemistry science lab", "Atomic Chemistry Science Lab");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in sleek cool slate and cyan gradient");
      expect(res.environmentAtmosphere).toContain("crisp volumetric center spotlight halo");
      expect(res.environmentAtmosphere).toContain("zero background lab equipment or furniture clutter");
      expect(res.lightingPalette).toContain("Cool crisp daylight key");
      expect(res.lightingPalette).toContain("electric cyan rim lighting");
    });

    it("resolves ochre-terracotta cyclorama studio backdrop for history topics", () => {
      const res = resolveFallbackEnvironment("ancient egypt pharaoh tombs", "Ancient Egypt Pharaoh Tombs");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in majestic warm ochre and terracotta gradient");
      expect(res.environmentAtmosphere).toContain("warm torchlight center spotlight halo");
      expect(res.environmentAtmosphere).toContain("zero background pillar or stone clutter");
      expect(res.lightingPalette).toContain("Dramatic warm torchlight key");
      expect(res.lightingPalette).toContain("shimmering golden rim lighting");
    });

    it("resolves pastel yellow cyclorama studio backdrop for school topics", () => {
      const res = resolveFallbackEnvironment("kindergarten academy classroom", "Kindergarten Academy Classroom");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in cheerful warm pastel yellow and soft cream gradient");
      expect(res.environmentAtmosphere).toContain("bright morning sunbeam center spotlight halo");
      expect(res.environmentAtmosphere).toContain("zero background desks or furniture clutter");
      expect(res.lightingPalette).toContain("Bright sunny morning window key");
      expect(res.lightingPalette).toContain("soft pastel yellow fill");
    });

    it("resolves golden savannah sunset cyclorama studio backdrop for wildlife topics", () => {
      const res = resolveFallbackEnvironment("african safari wildlife animals", "African Safari Wildlife Animals");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in warm golden savannah sunset gradient");
      expect(res.environmentAtmosphere).toContain("radiant amber center spotlight halo");
      expect(res.environmentAtmosphere).toContain("zero background tree or landscape clutter");
      expect(res.lightingPalette).toContain("Warm golden hour key light");
    });

    it("resolves moody emerald-slate cyclorama studio backdrop for mystery topics", () => {
      const res = resolveFallbackEnvironment("sherlock mystery detective clues", "Sherlock Mystery Detective Clues");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in moody deep emerald and slate gradient");
      expect(res.environmentAtmosphere).toContain("warm amber tungsten center spotlight halo");
      expect(res.environmentAtmosphere).toContain("zero background bookshelf or furniture clutter");
      expect(res.lightingPalette).toContain("Warm tungsten desk lamp key");
    });

    it("resolves royal blue and gold cyclorama studio backdrop for sports topics", () => {
      const res = resolveFallbackEnvironment("world soccer champion stadium", "World Soccer Champion Stadium");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in energetic royal blue and vibrant gold gradient");
      expect(res.environmentAtmosphere).toContain("bright stadium floodlight center spotlight halo");
      expect(res.environmentAtmosphere).toContain("zero background crowd clutter");
      expect(res.lightingPalette).toContain("Bright stadium floodlight key");
    });

    it("resolves burgundy-champagne cyclorama studio backdrop for cinema topics", () => {
      const res = resolveFallbackEnvironment("hollywood movie director awards", "Hollywood Movie Director Awards");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in glamorous deep burgundy and champagne gradient");
      expect(res.environmentAtmosphere).toContain("warm golden Hollywood spotlight center halo");
      expect(res.environmentAtmosphere).toContain("zero background room clutter");
      expect(res.lightingPalette).toContain("Warm golden Hollywood spotlight key");
    });

    it("resolves honey-peach cyclorama studio backdrop for culinary topics", () => {
      const res = resolveFallbackEnvironment("french pastry baking secrets", "French Pastry Baking Secrets");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in soft pastel honey-peach and cream gradient");
      expect(res.environmentAtmosphere).toContain("golden center spotlight halo behind subjects");
      expect(res.environmentAtmosphere).toContain("zero background kitchen furniture or clutter");
      expect(res.lightingPalette).toContain("Warm amber and golden honey glow");
    });

    it("resolves graphite and electric orange cyclorama studio backdrop for supercar topics", () => {
      const res = resolveFallbackEnvironment("hypercar racing speedway", "Hypercar Racing Speedway");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in sleek graphite and electric orange gradient");
      expect(res.environmentAtmosphere).toContain("brilliant center spotlight halo");
      expect(res.environmentAtmosphere).toContain("zero background garage or pit clutter");
      expect(res.lightingPalette).toContain("Bright daylight sunbeams");
    });

    it("resolves cosmic midnight cyclorama studio backdrop for space topics", () => {
      const res = resolveFallbackEnvironment("solar system planetary voyage", "Solar System Planetary Voyage");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in deep cerulean and cosmic midnight indigo gradient");
      expect(res.environmentAtmosphere).toContain("radiant cyan-magenta center spotlight halo");
      expect(res.environmentAtmosphere).toContain("zero background room clutter");
      expect(res.lightingPalette).toContain("Luminous cyan and magenta rim lighting");
    });

    it("resolves clean Pixar 3D cyclorama universal fallback for generic topics", () => {
      const res = resolveFallbackEnvironment("general knowledge trivia", "General Knowledge Trivia");
      expect(res.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop tailored to");
      expect(res.environmentAtmosphere).toContain("zero background furniture or structural clutter");
      expect(res.lightingPalette).toContain("Soft warm three-point cinematic studio lighting");
    });
  });

  describe("End-to-End System Integration: Layout Resolution to Prompt Compilation", () => {
    it("embeds clean mint-teal cyclorama studio backdrop into compiled 16:9 prompt for School Clinic episode", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "School Clinic Secrets: First Aid Heroes Quiz",
        questionFormat: "true_false",
        mascotProfile: sampleMascot,
      });

      expect(plan.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in soft soothing pastel mint-teal gradient");
      expect(plan.environmentAtmosphere).toContain("zero background furniture, shelves, or clutter");
      expect(plan.lightingPalette).toContain("turquoise rim light");

      const prompt169 = compileThumbnailPrompt(plan, "16:9", sampleMascot);
      expect(plan.mascotPersona.role).toBe("School Clinic Doctor & First Aid Hero");
      expect(prompt169).toContain("curved 3D Pixar studio cyclorama backdrop in soft soothing pastel mint-teal gradient");
      expect(prompt169).toContain("turquoise rim light");
      expect(prompt169).toContain("Clean white clinic coat over cheerful teal scrubs with red cross badge");
      expect(prompt169).toContain("zero background furniture, shelves, or clutter");
    });

    it("embeds neon indigo-purple cyclorama backdrop & electric rim lighting into compiled prompt for Gaming episode", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "Arcade Masters: Retro Gaming Challenge",
        questionFormat: "standard",
        mascotProfile: sampleMascot,
      });

      const prompt169 = compileThumbnailPrompt(plan, "16:9", sampleMascot);
      expect(prompt169).toContain("curved 3D Pixar studio cyclorama backdrop in deep indigo and electric purple gradient");
      expect(prompt169).toContain("electric cyan rim lighting");
      expect(prompt169).toContain("zero background cabinets or furniture clutter");
    });
  });

  describe("AI Planner Generic Environment Interception", () => {
    it("intercepts generic 'plain white background' from AI planner and substitutes domain cyclorama studio", async () => {
      const mockLlm = createMockLlm({
        hook_text: "CLINIC HEROES!",
        badge_text: "100% PASS 🎯",
        environment_atmosphere: "plain white background with simple gradient",
        lighting_palette: "standard lighting",
        layout: "true_false",
      });

      const plan = await planThumbnailWithAI({
        topicTitle: "School Clinic Secrets: First Aid Heroes",
        language: "English",
        llmClient: mockLlm,
        mascotProfile: sampleMascot,
      });

      expect(plan.environmentAtmosphere).not.toContain("plain white background");
      expect(plan.environmentAtmosphere).toContain("curved 3D Pixar studio cyclorama backdrop in soft soothing pastel mint-teal gradient");
      expect(plan.lightingPalette).toContain("turquoise rim light");
    });
  });
});
