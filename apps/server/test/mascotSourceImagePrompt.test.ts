import { describe, expect, it } from "vitest";
import type { MascotProfile } from "@studio/shared";
import {
  buildMascotActionPrompt,
  buildMascotConceptPrompt,
  buildMascotSourceImagePrompt,
  buildMascotStyleConceptPrompt,
  validateMascotPromptContract,
  validateMascotSourceImagePrompt,
} from "../src/quiz/mascotPromptContract.js";
import { generateProceduralSourceArt, generateProceduralStateArt } from "../src/quiz/mascot/proceduralArt.js";

describe("Stage 02: Step 2 Source Image Prompt Contract", () => {
  const testMascot: Pick<MascotProfile, "name" | "description" | "visual_style" | "master_prompt" | "color_theme"> = {
    name: "Pip the Penguin",
    description: "A cheerful baby penguin with a tiny scarf and warm smile",
    visual_style: "pixar_3d",
    master_prompt: "Cute stylized baby penguin wearing a golden knitted scarf",
    color_theme: "#06b6d4",
  };

  describe("buildMascotSourceImagePrompt (16:9 Large Half-Body Composition)", () => {
    it("builds 16:9 half-body prompt with @1 reference image and costume continuity", () => {
      const prompt = buildMascotSourceImagePrompt(testMascot, "thinking", {
        hasReferenceImage: true,
        keyword: "cyberpunk neon streetwear, glowing visor",
        slotIndex: 1,
      });

      // 1. Identity and costume continuity
      expect(prompt).toContain("@1");
      expect(prompt).toContain('Strictly preserve character identity from @1 for "Pip the Penguin"');
      expect(prompt).toContain("Theme & Costume: Styled in authentic cyberpunk neon streetwear, glowing visor attire and accessories.");

      // 2. 16:9 canvas and composition invariants
      expect(prompt).toContain("16:9 widescreen canvas");
      expect(prompt).toContain("1280x720 composition");
      expect(prompt).toContain("large half-body subject positioned in lower-middle frame");
      expect(prompt).toContain("generous upper headroom with top one-third of frame kept as empty flat chroma key green space (#00FF00)");
      expect(prompt).toContain("at least 30 percent open headspace above head and ears for animation jumping clearance");
      expect(prompt).toContain("head, ears, hands, and expressive features safely inside frame margins below upper one-third boundary");
      expect(prompt).toContain("lower body and torso continue cleanly beyond bottom edge of canvas by design");
      expect(prompt).toContain("not a floating portrait");

      // 3. Neutral framing with explicit exclusion of final corner/bottom-left placement
      expect(prompt).toContain("centered neutral composition");
      expect(prompt).toContain("no bottom-left placement");
      expect(prompt).toContain("no corner placement");
      expect(prompt).not.toContain("bottom_left");
      expect(prompt).not.toContain("bottom-left corner");

      // 4. Studio isolation and negative constraints
      expect(prompt).toContain("solid flat chroma key green background (#00FF00)");
      expect(prompt).toContain("no floor");
      expect(prompt).toContain("no pedestal");
      expect(prompt).toContain("no ground shadow");
      expect(prompt).toContain("no scenery");
      expect(prompt).toContain("no text");
      expect(prompt).toContain("no watermark");

      // 5. Must NOT describe a full-body or floating character
      expect(prompt).not.toContain("full-body view from head to toe");
      expect(prompt).not.toContain("floating character");

      // 6. Validation passes
      expect(validateMascotSourceImagePrompt(prompt, true)).toBe(true);
      expect(validateMascotPromptContract(prompt, true)).toBe(true);
    });

    it("builds style-anchored 16:9 half-body prompt with exact outfit lock", () => {
      const prompt = buildMascotSourceImagePrompt(testMascot, "celebrate", {
        hasReferenceImage: true,
        hasStyleAnchor: true,
        slotIndex: 3,
        prompt: "triumphant arms raised high with a radiant victory smile",
      });

      expect(prompt).toContain("@1");
      expect(prompt).toContain(
        'Strictly preserve character identity, outfit, costume details, colors, and accessories from @1 for "Pip the Penguin"',
      );
      expect(prompt).toContain("Pose and Action: triumphant arms raised high with a radiant victory smile.");
      expect(prompt).toContain("16:9 widescreen canvas (1280x720)");
      expect(prompt).toContain("centered and neutral with respect to final placement");
      expect(prompt).toContain("lower torso continues beyond the bottom edge of the frame");
      expect(prompt).toContain("head, ears, and hands remain within safe margins");
      expect(prompt).toContain(
        "top one-third of the frame must remain empty flat chroma key green background to allow character animation jumps",
      );
      expect(prompt).toContain("Strictly no corner placement");
      expect(prompt).toContain("no bottom-left anchoring");
      expect(prompt).toContain("no floor");
      expect(prompt).toContain("no pedestal");

      expect(validateMascotSourceImagePrompt(prompt, true)).toBe(true);
      expect(validateMascotPromptContract(prompt, true)).toBe(true);
    });

    it("builds standalone 16:9 half-body prompt without reference image", () => {
      const prompt = buildMascotSourceImagePrompt(testMascot, "thinking", {
        hasReferenceImage: false,
        slotIndex: 5,
      });

      expect(prompt).toContain('Large half-body single character pose of "Pip the Penguin" on a 16:9 canvas.');
      expect(prompt).toContain('Character: "Pip the Penguin"');
      expect(prompt).toContain("16:9 widescreen canvas");
      expect(prompt).toContain("centered neutral composition");
      expect(prompt).toContain("no bottom-left placement");
      expect(prompt).toContain("solid flat chroma key green background (#00FF00)");
      expect(prompt).toContain("no floor");
      expect(prompt).toContain("no pedestal");
      expect(prompt).toContain("no ground shadow");
      expect(prompt).toContain("high contrast studio rim lighting");

      expect(validateMascotSourceImagePrompt(prompt, false)).toBe(true);
      expect(validateMascotPromptContract(prompt, false)).toBe(true);
    });

    it("generates 10 distinct, unique 16:9 source prompts for Thinking slots 1 through 10", () => {
      const prompts = new Set<string>();
      for (let slot = 1; slot <= 10; slot++) {
        const prompt = buildMascotSourceImagePrompt(testMascot, "thinking", {
          hasReferenceImage: true,
          slotIndex: slot,
        });

        expect(prompt).toContain("@1");
        expect(prompt).toContain("16:9 widescreen canvas");
        expect(prompt).toContain("large half-body subject");
        expect(prompt).toContain("no bottom-left placement");
        expect(validateMascotSourceImagePrompt(prompt, true)).toBe(true);
        prompts.add(prompt);
      }
      expect(prompts.size).toBe(10);
    });

    it("generates 10 distinct, unique 16:9 source prompts for Celebrate slots 1 through 10", () => {
      const prompts = new Set<string>();
      for (let slot = 1; slot <= 10; slot++) {
        const prompt = buildMascotSourceImagePrompt(testMascot, "celebrate", {
          hasReferenceImage: true,
          slotIndex: slot,
        });

        expect(prompt).toContain("@1");
        expect(prompt).toContain("16:9 widescreen canvas");
        expect(prompt).toContain("large half-body subject");
        expect(prompt).toContain("no corner placement");
        expect(validateMascotSourceImagePrompt(prompt, true)).toBe(true);
        prompts.add(prompt);
      }
      expect(prompts.size).toBe(10);
    });

    it("supports buildMascotActionPrompt with explicit composition 'half_body_16_9'", () => {
      const prompt = buildMascotActionPrompt(testMascot, "thinking", {
        hasReferenceImage: true,
        composition: "half_body_16_9",
        slotIndex: 1,
      });

      expect(prompt).toContain("16:9 widescreen canvas");
      expect(prompt).toContain("large half-body subject");
      expect(prompt).toContain("no bottom-left placement");
      expect(validateMascotSourceImagePrompt(prompt, true)).toBe(true);
    });

    it("preserves full-body default when composition is omitted in buildMascotActionPrompt", () => {
      const prompt = buildMascotActionPrompt(testMascot, "wave", {
        hasReferenceImage: true,
      });

      expect(prompt).toContain("floating character");
      expect(prompt).toContain("no ground shadow");
      expect(prompt).not.toContain("16:9 widescreen canvas");
      expect(prompt).not.toContain("large half-body subject");
      expect(validateMascotPromptContract(prompt, true)).toBe(true);
    });
  });

  describe("Step 1 Concept Prompt Immutability (Unchanged Behavior)", () => {
    it("preserves exact Step 1 Concept Prompt without alteration", () => {
      const prompt = buildMascotConceptPrompt(testMascot);

      expect(prompt).toContain("Full-body single character concept illustration");
      expect(prompt).toContain("Single centered subject standing proudly facing camera");
      expect(prompt).toContain("floating character");
      expect(prompt).toContain("no ground shadow");
      expect(prompt).not.toContain("16:9");
      expect(prompt).not.toContain("half-body");
      expect(validateMascotPromptContract(prompt, false)).toBe(true);
    });

    it("preserves exact Step 1 Style Concept Prompt without alteration", () => {
      const prompt = buildMascotStyleConceptPrompt(testMascot, "stealth cyber armor katana holographic visor");

      expect(prompt).toContain("@1");
      expect(prompt).toContain("Strictly preserve character identity from @1");
      expect(prompt).toContain("Full-body single character concept illustration");
      expect(prompt).toContain("floating character");
      expect(prompt).toContain("no ground shadow");
      expect(prompt).not.toContain("16:9");
      expect(prompt).not.toContain("half-body");
      expect(validateMascotPromptContract(prompt, true)).toBe(true);
    });
  });

  describe("validateMascotSourceImagePrompt validation rules", () => {
    it("accepts a well-formed 16:9 half-body prompt", () => {
      const validPrompt = [
        "@1 character reference.",
        "16:9 widescreen canvas, large half-body subject, safe margins,",
        "centered neutral composition, no corner placement, no bottom-left placement,",
        "no floor, no pedestal, no ground shadow.",
      ].join(" ");

      expect(validateMascotSourceImagePrompt(validPrompt, true)).toBe(true);
    });

    it("rejects prompt lacking 16:9 aspect ratio", () => {
      const missing16x9 = "@1 half-body subject, safe margins, neutral, no corner placement, no floor, no pedestal, no ground shadow.";
      expect(validateMascotSourceImagePrompt(missing16x9, true)).toBe(false);
    });

    it("rejects prompt lacking safe margins specification", () => {
      const missingMargins = "@1 16:9 half-body subject, neutral, no corner placement, no floor, no pedestal, no ground shadow.";
      expect(validateMascotSourceImagePrompt(missingMargins, true)).toBe(false);
    });

    it("rejects prompt lacking neutral or non-corner directives", () => {
      const missingNoCorner =
        "@1 16:9 half-body subject, safe margins, place at bottom-left corner, no floor, no pedestal, no ground shadow.";
      expect(validateMascotSourceImagePrompt(missingNoCorner, true)).toBe(false);
    });

    it("rejects prompt missing @1 reference when hasReferenceImage is true", () => {
      const missingRef = "16:9 half-body subject, safe margins, neutral, no corner placement, no floor, no pedestal, no ground shadow.";
      expect(validateMascotSourceImagePrompt(missingRef, true)).toBe(false);
    });
  });

  describe("Source Preview / Procedural 16:9 Half-Body Art", () => {
    it("generates 1280x720 16:9 half-body SVG for thinking state", () => {
      const bytes = generateProceduralSourceArt("Pip", "#06b6d4", "thinking");
      const svg = Buffer.from(bytes).toString("utf8");

      expect(svg).toContain('viewBox="0 0 1280 720"');
      expect(svg).toContain('width="1280"');
      expect(svg).toContain('height="720"');
      expect(svg).toContain('fill="#00FF00"'); // Flat chroma key green background
      expect(svg).toContain('cx="640"'); // Centered horizontal mascot
      expect(svg).toContain("❓"); // Thinking prompt cue
      expect(svg).not.toContain("no pedestal"); // SVG art contains visual elements, not prompt text
    });

    it("generates 1280x720 16:9 half-body SVG for celebrate state", () => {
      const bytes = generateProceduralSourceArt("Pip", "#06b6d4", "celebrate");
      const svg = Buffer.from(bytes).toString("utf8");

      expect(svg).toContain('viewBox="0 0 1280 720"');
      expect(svg).toContain('width="1280"');
      expect(svg).toContain('height="720"');
      expect(svg).toContain('fill="#00FF00"'); // Flat chroma key green background
      expect(svg).toContain('cx="640"'); // Centered horizontal mascot
      expect(svg).not.toContain("🎉");
      expect(svg).not.toContain("⭐");
    });

    it("preserves 512x512 full-body SVG without celebrate decorations", () => {
      const thinkingSvg = Buffer.from(generateProceduralStateArt("Pip", "#06b6d4", "thinking", 1, { composition: "full_body" })).toString(
        "utf8",
      );
      const celebrateSvg = Buffer.from(generateProceduralStateArt("Pip", "#06b6d4", "celebrate", 1, { composition: "full_body" })).toString(
        "utf8",
      );

      expect(thinkingSvg).toContain('viewBox="0 0 512 512"');
      expect(thinkingSvg).toContain('width="512"');
      expect(thinkingSvg).toContain('height="512"');
      expect(celebrateSvg).not.toContain("🎉");
      expect(celebrateSvg).not.toContain("⭐");
    });
  });
});
