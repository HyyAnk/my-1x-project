import { describe, expect, it } from "vitest";
import { resolveMascotThemedPersona } from "../src/quiz/thumbnail/thumbnailPersonaResolver.js";
import { THUMBNAIL_LAYOUT_CATALOG } from "@studio/shared";
import { resolveThumbnailLayout } from "../src/quiz/thumbnail/thumbnailLayoutResolver.js";
import { resolveMascotDescription } from "../src/quiz/thumbnail/thumbnailPromptCompiler.js";

const defaultMegaGridPersona = THUMBNAIL_LAYOUT_CATALOG.mega_grid.mascotPersona;

describe("Stage 3: Thematic Mascot Persona & Archetype Engine Expansion", () => {
  describe("Medical & First Aid Domain Mascot Persona", () => {
    it("resolves School Clinic Doctor & First Aid Hero for clinic topics instead of safari explorer", () => {
      const persona = resolveMascotThemedPersona(
        "school clinic secrets: first aid heroes quiz",
        "mega_grid",
        defaultMegaGridPersona,
      );

      expect(persona.role).toBe("School Clinic Doctor & First Aid Hero");
      expect(persona.costume).toContain("white clinic coat");
      expect(persona.costume).toContain("teal scrubs");
      expect(persona.costume).toContain("red cross badge");
      expect(persona.prop).toContain("stethoscope");
      expect(persona.expression).toContain("reassuring");

      // Strictly no safari explorer attire
      expect(persona.costume).not.toContain("safari hat");
      expect(persona.costume).not.toContain("scout vest");
    });

    it("integrates into resolveThumbnailLayout and compileThumbnailPrompt seamlessly", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "School Clinic Secrets: First Aid Heroes Quiz",
        language: "en",
        layoutOverride: "mega_grid",
      });

      expect(plan.mascotPersona.role).toBe("School Clinic Doctor & First Aid Hero");
      const description = resolveMascotDescription(plan);
      expect(description).toContain("white clinic coat");
      expect(description).toContain("stethoscope");
      expect(description).not.toContain("safari hat");
    });
  });

  describe("Expanded 16+ Mascot Persona Domains", () => {
    it("resolves Campus Honors Student for school education topics", () => {
      const persona = resolveMascotThemedPersona("campus classroom homework secrets", "mega_grid", defaultMegaGridPersona);
      expect(persona.role).toBe("Campus Honors Student");
      expect(persona.costume).toContain("academy blazer");
      expect(persona.prop).toContain("notebook");
    });

    it("resolves Pro Esports Champion for gaming topics", () => {
      const persona = resolveMascotThemedPersona("retro arcade gaming tournament", "mega_grid", defaultMegaGridPersona);
      expect(persona.role).toBe("Pro Esports Champion");
      expect(persona.costume).toContain("cyberpunk hoodie");
      expect(persona.prop).toContain("controller");
    });

    it("resolves Mythic Arcane Wizard Apprentice for fantasy topics", () => {
      const persona = resolveMascotThemedPersona("arcane spells and fantasy dragons", "mega_grid", defaultMegaGridPersona);
      expect(persona.role).toBe("Mythic Arcane Wizard Apprentice");
      expect(persona.costume).toContain("wizard robe");
      expect(persona.prop).toContain("star wand");
    });

    it("resolves Norse Viking Hero Explorer for Norse mythology topics", () => {
      const persona = resolveMascotThemedPersona("norse legends & heroes quiz: can you spot every mythical legend?", "mega_grid", defaultMegaGridPersona);
      expect(persona.role).toBe("Norse Viking Hero Explorer");
      expect(persona.costume).toContain("Viking warrior tunic");
      expect(persona.costume).toContain("sheepskin fur-trimmed mantle");
      expect(persona.prop).toContain("Mjolnir");
      expect(persona.costume).not.toContain("wizard robe");
    });

    it("resolves Mythic Olympian Hero for Greek mythology topics", () => {
      const persona = resolveMascotThemedPersona("greek gods and mount olympus", "mega_grid", defaultMegaGridPersona);
      expect(persona.role).toBe("Mythic Olympian Hero");
      expect(persona.costume).toContain("chiton tunic");
      expect(persona.costume).toContain("laurel wreath");
      expect(persona.costume).not.toContain("wizard robe");
    });

    it("resolves Cyber Tech Pioneer for AI and tech topics", () => {
      const persona = resolveMascotThemedPersona("future tech and artificial intelligence", "mega_grid", defaultMegaGridPersona);
      expect(persona.role).toBe("Cyber Tech Pioneer");
      expect(persona.costume).toContain("cybernetic jumpsuit");
      expect(persona.prop).toContain("holographic digital tablet");
    });

    it("resolves Hollywood Film Director for cinema topics", () => {
      const persona = resolveMascotThemedPersona("blockbuster movie films and oscar directors", "mega_grid", defaultMegaGridPersona);
      expect(persona.role).toBe("Hollywood Film Director");
      expect(persona.costume).toContain("beret");
      expect(persona.prop).toContain("clapperboard");
    });

    it("resolves All-Star Team Coach for sports topics", () => {
      const persona = resolveMascotThemedPersona("world sports athletics and football", "mega_grid", defaultMegaGridPersona);
      expect(persona.role).toBe("All-Star Team Coach");
      expect(persona.costume).toContain("varsity athletic track jacket");
      expect(persona.prop).toContain("playbook clipboard");
    });

    it("resolves Wildlife Park Ranger for animals topics", () => {
      const persona = resolveMascotThemedPersona("african wildlife animals and safari creatures", "mega_grid", defaultMegaGridPersona);
      expect(persona.role).toBe("Wildlife Park Ranger");
      expect(persona.costume).toContain("wildlife park ranger");
      expect(persona.prop).toContain("binoculars");
    });
  });

  describe("Layout Signature Persona Guarantees", () => {
    it("preserves Overloaded Genius for difficulty_tier layout", () => {
      const persona = resolveMascotThemedPersona("school clinic secrets", "difficulty_tier", defaultMegaGridPersona);
      expect(persona.role).toBe("Overloaded Genius");
      expect(persona.expression).toContain("shock");
    });

    it("preserves Referee / Confused Judge for split_vs layout", () => {
      const persona = resolveMascotThemedPersona("doctor vs nurse showdown", "split_vs", defaultMegaGridPersona);
      expect(persona.role).toBe("Referee / Confused Judge");
      expect(persona.costume).toContain("referee jersey");
    });

    it("preserves Master Detective for mystery_silhouette layout", () => {
      const persona = resolveMascotThemedPersona(
        "who is the secret hero",
        "mystery_silhouette",
        THUMBNAIL_LAYOUT_CATALOG.mystery_silhouette.mascotPersona,
      );
      expect(persona.role).toBe("Master Detective");
    });

    it("strictly strips True/False paddles from mascot in true_false layout", () => {
      const plan = resolveThumbnailLayout({
        topicTitle: "School Clinic Secrets: First Aid Heroes Quiz",
        questionFormat: "true_false",
        language: "en",
      });

      const description = resolveMascotDescription(plan);
      expect(description).not.toContain("paddle");
      expect(description).not.toContain("checkmark");
    });
  });
});
