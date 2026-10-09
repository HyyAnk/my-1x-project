import { describe, expect, it } from "vitest";
import {
  contextualizeChoiceSubject,
  detectSubjectDomain,
  resolveSubjectAnchors,
} from "../src/quiz/thumbnail/thumbnailSubjectAnchorResolver.js";

describe("Stage 2: Dynamic Subject Anchor Resolution & Visual Entity Intelligence", () => {
  describe("detectSubjectDomain", () => {
    it("accurately detects subject domains from topic text", () => {
      expect(detectSubjectDomain("school clinic secrets: first aid heroes quiz")).toBe("medical");
      expect(detectSubjectDomain("solar system planets & space exploration")).toBe("space");
      expect(detectSubjectDomain("arcade gaming legends showdown")).toBe("gaming");
      expect(detectSubjectDomain("chemistry and physics science lab")).toBe("science");
      expect(detectSubjectDomain("norse legends & heroes quiz: can you spot every mythical legend?")).toBe("norse");
      expect(detectSubjectDomain("greek mythology and olympian gods")).toBe("greek");
      expect(detectSubjectDomain("ancient egyptian pharaohs and pyramids")).toBe("history");
      expect(detectSubjectDomain("deep ocean marine creatures")).toBe("ocean");
      expect(detectSubjectDomain("world cookie tour and pastries")).toBe("food");
      expect(detectSubjectDomain("african safari wildlife animals")).toBe("animals");
      expect(detectSubjectDomain("classroom school secrets")).toBe("school");
      expect(detectSubjectDomain("general knowledge trivia")).toBe("general");
    });
  });

  describe("contextualizeChoiceSubject", () => {
    it("contextualizes medical choices into clean 3D physical tools", () => {
      const result = contextualizeChoiceSubject("Stethoscope", "school clinic secrets: first aid heroes");
      expect(result).toBe("essential emergency medical clinic item or tool: Stethoscope");
    });

    it("contextualizes school classroom choices", () => {
      const result = contextualizeChoiceSubject("Desktop Globe", "school campus classroom secrets");
      expect(result).toBe("essential school classroom educational item: Desktop Globe");
    });

    it("contextualizes food & pastry choices", () => {
      const result = contextualizeChoiceSubject("France", "world cookie tour & baking");
      expect(result).toContain("specialty cookie or pastry representing France");
    });

    it("contextualizes gaming choices", () => {
      const result = contextualizeChoiceSubject("Power Glove", "arcade gaming showdown");
      expect(result).toBe("vibrant 3D arcade gaming artifact: Power Glove");
    });

    it("contextualizes norse choices into authentic Norse mythical artifacts", () => {
      const result = contextualizeChoiceSubject("Mjolnir Hammer", "norse legends and heroes quiz");
      expect(result).toBe("authentic Norse mythical artifact or legendary figure: Mjolnir Hammer");
    });

    it("contextualizes greek choices into authentic Olympian artifacts", () => {
      const result = contextualizeChoiceSubject("Aegis Shield", "greek mythology and olympian gods");
      expect(result).toBe("authentic Greek mythical Olympian artifact or hero: Aegis Shield");
    });
  });

  describe("School Clinic Secrets: First Aid Heroes Resolution Across All Layouts", () => {
    const clinicInput = {
      topicTitle: "School Clinic Secrets: First Aid Heroes Quiz",
      topicSummary: "Test your emergency medical knowledge with school clinic situations",
    };

    it("resolves medical 3D items in mega_grid layout and eliminates Giza Pyramids, Einstein, Shark, Saturn", () => {
      const anchors = resolveSubjectAnchors(clinicInput, "mega_grid");

      expect(anchors).toHaveLength(4);
      const combinedPrompts = anchors.map((a) => a.visualPrompt).join(" ");

      // Must contain medical objects
      expect(combinedPrompts).toContain("first aid");
      expect(combinedPrompts).toContain("stethoscope");
      expect(combinedPrompts).toContain("medicine");
      expect(combinedPrompts).toContain("thermometer");

      // Strictly zero Giza Pyramids, Einstein, Shark, or Saturn
      expect(combinedPrompts).not.toContain("Giza Pyramids");
      expect(combinedPrompts).not.toContain("Albert Einstein");
      expect(combinedPrompts).not.toContain("Great white shark");
      expect(combinedPrompts).not.toContain("Planet Saturn");
    });

    it("resolves medical hero 3D case in yes_no layout and eliminates zero-gravity goldfish", () => {
      const anchors = resolveSubjectAnchors(clinicInput, "yes_no");

      expect(anchors).toHaveLength(1);
      const prompt = anchors[0].visualPrompt;

      expect(prompt).toContain("first aid");
      expect(prompt).toContain("red cross");
      expect(prompt).not.toContain("goldfish");
      expect(prompt).not.toContain("zero-gravity");
    });

    it("resolves nurse vs doctor in split_vs layout and eliminates T-Rex vs Mecha Robot", () => {
      const anchors = resolveSubjectAnchors(clinicInput, "split_vs");

      expect(anchors).toHaveLength(2);
      const combinedPrompts = anchors.map((a) => a.visualPrompt).join(" ");

      expect(combinedPrompts).toContain("nurse");
      expect(combinedPrompts).toContain("doctor");
      expect(combinedPrompts).not.toContain("Tyrannosaurus Rex");
      expect(combinedPrompts).not.toContain("Mecha Robot");
    });

    it("resolves medical emergency hero in mystery_silhouette layout", () => {
      const anchors = resolveSubjectAnchors(clinicInput, "mystery_silhouette");

      expect(anchors).toHaveLength(1);
      expect(anchors[0].visualPrompt).toContain("first aid hero");
      expect(anchors[0].visualPrompt).toContain("medical cross");
    });

    it("resolves medical first aid boxes matrix in odd_one_out layout", () => {
      const anchors = resolveSubjectAnchors(clinicInput, "odd_one_out");

      expect(anchors).toHaveLength(1);
      expect(anchors[0].visualPrompt).toContain("first aid kit boxes");
    });

    it("resolves medical care progression in difficulty_tier layout", () => {
      const anchors = resolveSubjectAnchors(clinicInput, "difficulty_tier");

      expect(anchors).toHaveLength(4);
      expect(anchors[0].visualPrompt).toContain("bandage");
      expect(anchors[1].visualPrompt).toContain("stethoscope");
      expect(anchors[2].visualPrompt).toContain("defibrillator");
      expect(anchors[3].visualPrompt).toContain("surgical");
    });
  });

  describe("Other Domain Themed Anchor Resolutions", () => {
    it("resolves space anchors for astronomy topics in mega_grid and yes_no", () => {
      const spaceInput = { topicTitle: "Solar System Planets and Deep Space Mysteries" };
      const gridAnchors = resolveSubjectAnchors(spaceInput, "mega_grid");
      const gridPrompts = gridAnchors.map((a) => a.visualPrompt).join(" ");

      expect(gridPrompts).toContain("Saturn");
      expect(gridPrompts).toContain("Mars");
      expect(gridPrompts).toContain("telescope");
      expect(gridPrompts).toContain("astronaut");

      const tfAnchors = resolveSubjectAnchors(spaceInput, "yes_no");
      expect(tfAnchors[0].visualPrompt).toContain("Saturn");
    });

    it("resolves arcade gaming anchors for gaming topics", () => {
      const gamingInput = { topicTitle: "Retro Arcade Gaming Classics" };
      const anchors = resolveSubjectAnchors(gamingInput, "mega_grid");
      const combined = anchors.map((a) => a.visualPrompt).join(" ");

      expect(combined).toContain("arcade cabinet");
      expect(combined).toContain("controller");
      expect(combined).toContain("power-up");
    });

    it("resolves ocean marine anchors for ocean topics", () => {
      const oceanInput = { topicTitle: "Deep Sea Ocean Creatures and Secrets" };
      const anchors = resolveSubjectAnchors(oceanInput, "mega_grid");
      const combined = anchors.map((a) => a.visualPrompt).join(" ");

      expect(combined).toContain("whale");
      expect(combined).toContain("coral reef");
      expect(combined).toContain("submarine");
    });

    it("resolves authentic Norse mythical anchors for Norse topics in mega_grid and eliminates Egyptian/Roman artifacts", () => {
      const norseInput = { topicTitle: "Norse Legends & Heroes Quiz: Can You Spot Every Mythical Legend?" };
      const anchors = resolveSubjectAnchors(norseInput, "mega_grid");
      expect(anchors).toHaveLength(4);
      const combined = anchors.map((a) => a.visualPrompt).join(" ");

      // Must contain Norse authentic anchors
      expect(combined).toContain("Mjolnir");
      expect(combined.toLowerCase()).toContain("longship");
      expect(combined).toContain("Valkyrie");
      expect(combined.toLowerCase()).toContain("runestone");

      // Strictly no Egyptian Pharaoh or Roman gladiator
      expect(combined).not.toContain("Pharaoh");
      expect(combined).not.toContain("gladiator");
      expect(combined).not.toContain("Einstein");
    });

    it("resolves authentic Greek mythical anchors for Greek topics in mega_grid", () => {
      const greekInput = { topicTitle: "Greek Mythology and Olympian Legends Quiz" };
      const anchors = resolveSubjectAnchors(greekInput, "mega_grid");
      expect(anchors).toHaveLength(4);
      const combined = anchors.map((a) => a.visualPrompt).join(" ");

      expect(combined).toContain("Olympian");
      expect(combined).toContain("Poseidon");
      expect(combined).toContain("Spartan");
      expect(combined).toContain("Parthenon");
    });

    it("preserves general knowledge baseline anchors for truly generic quizzes", () => {
      const generalInput = { topicTitle: "General Knowledge Trivia Quiz" };
      const anchors = resolveSubjectAnchors(generalInput, "mega_grid");
      const combined = anchors.map((a) => a.visualPrompt).join(" ");

      expect(combined).toContain("Giza Pyramids");
      expect(combined).toContain("Albert Einstein");
      expect(combined).toContain("Great white shark");
      expect(combined).toContain("Planet Saturn");
    });
  });
});
