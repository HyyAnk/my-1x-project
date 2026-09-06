import { describe, expect, it } from "vitest";
import type { MascotProfile } from "@studio/shared";
import {
  buildMascotActionPrompt,
  buildMascotConceptPrompt,
  buildMascotStyleConceptPrompt,
  validateMascotPromptContract,
  MASCOT_STUDIO_ISOLATION_TAGS,
  MASCOT_STYLE_PROMPTS,
  getMascotPoses,
  getUnusedMascotPoses,
  pickRandomUnusedPose,
  pickShuffledUnusedPoses,
} from "../src/quiz/mascotPromptContract.js";

describe("mascotPromptContract", () => {
  const testMascot: Pick<
    MascotProfile,
    "name" | "description" | "visual_style" | "master_prompt" | "color_theme"
  > = {
    name: "Pip the Penguin",
    description: "A cheerful baby penguin with a tiny scarf and warm smile",
    visual_style: "pixar_3d",
    master_prompt: "Cute stylized baby penguin wearing a golden knitted scarf",
    color_theme: "#06b6d4",
  };

  describe("buildMascotActionPrompt", () => {
    it("builds Core Style action prompt with reference image (@1, character identity, canonical action, studio isolation)", () => {
      const prompt = buildMascotActionPrompt(testMascot, "wave", {
        hasReferenceImage: true,
      });

      expect(prompt).toContain("@1");
      expect(prompt).toContain('Strictly preserve character identity from @1 for "Pip the Penguin"');
      expect(prompt).toContain("face, fur/skin tone, eye shape, and chibi 1:2 head-to-body proportions");
      expect(prompt).toContain("Pose and Action: Playful welcoming wave gesture at opening.");
      expect(prompt).toContain("floating character");
      expect(prompt).toContain("no ground shadow");
      expect(prompt).toContain("high contrast studio rim lighting");
      expect(prompt).toContain("solid neutral light gray background (#E8E8E8)");
      expect(prompt).toContain("single standalone character only");
      expect(prompt).toContain("no character sheet");
      expect(prompt).toContain("no sprite sheet");
      expect(prompt).not.toContain("Theme & Costume:");
      expect(validateMascotPromptContract(prompt, true)).toBe(true);
    });

    it("builds Core Style action prompt without reference image (character DNA, studio isolation)", () => {
      const prompt = buildMascotActionPrompt(testMascot, "idle", {
        hasReferenceImage: false,
      });

      expect(prompt).toContain('Full-body single character pose of "Pip the Penguin"');
      expect(prompt).toContain('Character: "Pip the Penguin"');
      expect(prompt).toContain("Visual Appearance: Cute stylized baby penguin wearing a golden knitted scarf");
      expect(prompt).toContain("Color Palette: Primary theme #06b6d4");
      expect(prompt).toContain("Pose and Action: Natural subtle breathing and blinking pose while questions are read.");
      expect(prompt).toContain(MASCOT_STUDIO_ISOLATION_TAGS);
      expect(prompt).toContain("STRICT CHARACTER CONTINUITY:");
      expect(prompt).not.toContain("Theme & Costume:");
      expect(validateMascotPromptContract(prompt, false)).toBe(true);
    });

    it("injects themed costume description when options.keyword is provided with reference image", () => {
      const keyword = "tactical military uniform, camouflage, beret";
      const prompt = buildMascotActionPrompt(testMascot, "point", {
        hasReferenceImage: true,
        keyword,
      });

      expect(prompt).toContain("@1");
      expect(prompt).toContain('Strictly preserve character identity from @1 for "Pip the Penguin"');
      expect(prompt).toContain(
        "Theme & Costume: Styled in authentic tactical military uniform, camouflage, beret attire and accessories.",
      );
      expect(prompt).toContain("Pose and Action: Pointing hand or pointer stick at question / explanation card.");
      expect(prompt).toContain("floating character");
      expect(prompt).toContain("no ground shadow");
      expect(validateMascotPromptContract(prompt, true)).toBe(true);
    });

    it("injects themed costume description when options.keyword is provided without reference image", () => {
      const keyword = "cyberpunk neon streetwear, glowing visor";
      const prompt = buildMascotActionPrompt(testMascot, "thinking", {
        hasReferenceImage: false,
        keyword,
      });

      expect(prompt).toContain(
        "Theme & Costume: Styled in authentic cyberpunk neon streetwear, glowing visor attire and accessories.",
      );
      expect(prompt).toContain(
        "Pose and Action: Chin-resting, pondering or companion pose while question is presented and timer counts down.",
      );
      // Costume theme wins, but identity continuity for face/colors is preserved
      expect(prompt).not.toContain("Identical face, eyes, head shape, costume, accessories, and colors");
      expect(prompt).toContain(
        "STRICT CHARACTER CONTINUITY: Identical face, eyes, head shape, and colors matching master reference image; only the costume and accessories reflect the cyberpunk neon streetwear, glowing visor theme.",
      );
      expect(validateMascotPromptContract(prompt, false)).toBe(true);
    });

    it("overrides canonical action description when options.prompt is provided", () => {
      const customAction = "Holding a high-tech magnifying glass examining clues with intense curiosity";
      const prompt = buildMascotActionPrompt(testMascot, "thinking", {
        hasReferenceImage: true,
        prompt: customAction,
      });

      expect(prompt).toContain(`Pose and Action: ${customAction}.`);
      expect(prompt).not.toContain("Chin-resting, pondering");
      expect(validateMascotPromptContract(prompt, true)).toBe(true);
    });

    it("supports both options.keyword and options.prompt simultaneously", () => {
      const keyword = "steampunk aviator jacket, brass goggles";
      const customAction = "Saluting sharply while holding flight charts";

      const prompt = buildMascotActionPrompt(testMascot, "celebrate", {
        hasReferenceImage: true,
        keyword,
        prompt: customAction,
      });

      expect(prompt).toContain("@1");
      expect(prompt).toContain('Strictly preserve character identity from @1 for "Pip the Penguin"');
      expect(prompt).toContain(
        "Theme & Costume: Styled in authentic steampunk aviator jacket, brass goggles attire and accessories.",
      );
      expect(prompt).toContain(`Pose and Action: ${customAction}.`);
      expect(validateMascotPromptContract(prompt, true)).toBe(true);
    });

    it("builds style-anchored action prompt with outfit continuity lock and no duplicated costume directive", () => {
      const prompt = buildMascotActionPrompt(testMascot, "thinking", {
        hasReferenceImage: true,
        hasStyleAnchor: true,
        keyword: "stealth cyber armor katana holographic visor",
        prompt: "pondering over encrypted datapad",
      });

      expect(prompt).toContain("@1");
      expect(prompt).toContain(
        `Strictly preserve character identity, outfit, costume details, colors, and accessories from @1 for "${testMascot.name}". The character must wear the exact same costume shown in @1; only modify the pose, action, and facial expression.`,
      );
      expect(prompt).toContain("Pose and Action: pondering over encrypted datapad.");
      expect(prompt).toContain("floating character");
      expect(prompt).toContain("no ground shadow");
      expect(prompt).not.toContain("Theme & Costume:");
      expect(validateMascotPromptContract(prompt, true)).toBe(true);
    });

    it("generates 10 distinct, unique action prompts for Thinking slots 1 through 10 when prompt is omitted", () => {
      const prompts = new Set<string>();
      for (let slot = 1; slot <= 10; slot++) {
        const prompt = buildMascotActionPrompt(testMascot, "thinking", {
          hasReferenceImage: true,
          slotIndex: slot,
        });
        expect(prompt).toContain("@1");
        expect(validateMascotPromptContract(prompt, true)).toBe(true);
        prompts.add(prompt);
      }
      expect(prompts.size).toBe(10);
    });

    it("generates 10 distinct, unique action prompts for Celebrate slots 1 through 10 when prompt is omitted", () => {
      const prompts = new Set<string>();
      for (let slot = 1; slot <= 10; slot++) {
        const prompt = buildMascotActionPrompt(testMascot, "celebrate", {
          hasReferenceImage: true,
          slotIndex: slot,
        });
        expect(prompt).toContain("@1");
        expect(validateMascotPromptContract(prompt, true)).toBe(true);
        prompts.add(prompt);
      }
      expect(prompts.size).toBe(10);
    });
  });

  describe("validateMascotPromptContract", () => {
    it("validates reference image prompts requiring @1, floating character, and no ground shadow", () => {
      const validPrompt =
        'Strictly preserve character identity from @1 for "Pip": chibi proportions. floating character, no ground shadow, clean backdrop.';
      expect(validateMascotPromptContract(validPrompt, true)).toBe(true);

      const missingRef = "Chibi penguin standing. floating character, no ground shadow.";
      expect(validateMascotPromptContract(missingRef, true)).toBe(false);

      const missingFloating = "@1 character pose. standing on floor, no ground shadow.";
      expect(validateMascotPromptContract(missingFloating, true)).toBe(false);

      const missingNoGroundShadow = "@1 character pose. floating character, with dark drop shadow.";
      expect(validateMascotPromptContract(missingNoGroundShadow, true)).toBe(false);
    });

    it("validates standalone prompts requiring floating character, no ground shadow, and rim lighting", () => {
      const validPrompt =
        "Chibi penguin pose. floating character, no ground shadow, high contrast studio rim lighting.";
      expect(validateMascotPromptContract(validPrompt, false)).toBe(true);

      const missingRimLighting = "Chibi penguin pose. floating character, no ground shadow, soft ambient light.";
      expect(validateMascotPromptContract(missingRimLighting, false)).toBe(false);
    });

    it("rejects non-string or empty prompts", () => {
      expect(validateMascotPromptContract("")).toBe(false);
      expect(validateMascotPromptContract(null as unknown as string)).toBe(false);
      expect(validateMascotPromptContract(undefined as unknown as string)).toBe(false);
    });
  });

  describe("buildMascotConceptPrompt", () => {
    it("builds canonical concept prompt with style, theme, and studio isolation tags", () => {
      const prompt = buildMascotConceptPrompt(testMascot);

      expect(prompt).toContain("Full-body single character concept illustration");
      expect(prompt).toContain(testMascot.master_prompt);
      expect(prompt).toContain(`Primary color theme ${testMascot.color_theme}`);
      expect(prompt).toContain(MASCOT_STYLE_PROMPTS.pixar_3d);
      expect(prompt).toContain(MASCOT_STUDIO_ISOLATION_TAGS);
      expect(prompt).toContain("no character sheet");
      expect(prompt).toContain("no sprite sheet");
      expect(validateMascotPromptContract(prompt, false)).toBe(true);
    });

    it("supports prompt override in concept generation", () => {
      const override = "Cybernetic robotic owl with glowing turquoise feathers";
      const prompt = buildMascotConceptPrompt(testMascot, override);

      expect(prompt).toContain(`Full-body single character concept illustration of ${override}.`);
      expect(validateMascotPromptContract(prompt, false)).toBe(true);
    });
  });

  describe("buildMascotStyleConceptPrompt", () => {
    const testStyle = {
      name: "Cyber Ninja",
      keyword: "stealth cyber armor katana holographic visor",
    };

    it("builds canonical style concept prompt without overridePrompt (@1 continuity, costume directive, concept pose, studio isolation)", () => {
      const prompt = buildMascotStyleConceptPrompt(testMascot, testStyle);

      expect(prompt).toContain("@1");
      expect(prompt).toContain('Strictly preserve character identity from @1 for "Pip the Penguin"');
      expect(prompt).toContain("face, fur/skin tone, eye shape, and chibi 1:2 head-to-body proportions matching the master reference image");
      expect(prompt).toContain("Theme & Costume: Styled in authentic stealth cyber armor katana holographic visor attire, costume, and accessories.");
      expect(prompt).toContain('Full-body single character concept illustration of "Pip the Penguin" dressed in Cyber Ninja style.');
      expect(prompt).toContain("Single centered subject standing proudly facing camera, cute chibi proportions (1:2 head-to-body), large expressive sparkling eyes, friendly and joyful expression.");
      expect(prompt).toContain("floating character");
      expect(prompt).toContain("no ground shadow");
      expect(prompt).toContain("high contrast studio rim lighting");
      expect(prompt).toContain("solid neutral light gray background (#E8E8E8)");
      expect(prompt).toContain("single standalone character only");
      expect(prompt).toContain("no character sheet");
      expect(prompt).toContain("no sprite sheet");
      expect(prompt).toContain("no turnaround");
      expect(prompt).toContain("no spritesheet");
      expect(validateMascotPromptContract(prompt, true)).toBe(true);
    });

    it("uses style.name as fallback costume when keyword is empty", () => {
      const prompt = buildMascotStyleConceptPrompt(testMascot, { name: "Victorian Detective" });

      expect(prompt).toContain("@1");
      expect(prompt).toContain("Theme & Costume: Styled in authentic Victorian Detective attire, costume, and accessories.");
      expect(prompt).toContain('Full-body single character concept illustration of "Pip the Penguin" dressed in Victorian Detective style.');
      expect(validateMascotPromptContract(prompt, true)).toBe(true);
    });

    it("incorporates overridePrompt into concept pose when provided", () => {
      const override = "Holding a gleaming golden katana with glowing blue runes";
      const prompt = buildMascotStyleConceptPrompt(testMascot, testStyle, override);

      expect(prompt).toContain("@1");
      expect(prompt).toContain(override);
      expect(prompt).toContain('Full-body single character concept illustration of "Pip the Penguin" dressed in Cyber Ninja style.');
      expect(prompt).toContain("Theme & Costume: Styled in authentic stealth cyber armor katana holographic visor attire, costume, and accessories.");
      expect(prompt).toContain("floating character");
      expect(prompt).toContain("no ground shadow");
      expect(validateMascotPromptContract(prompt, true)).toBe(true);
    });
  });

  describe("20-pose library contract & selection helpers", () => {
    it("returns 20 unique pose presets for thinking and celebrate states", () => {
      const thinkingPoses = getMascotPoses("thinking");
      const celebratePoses = getMascotPoses("celebrate");

      expect(thinkingPoses.length).toBe(20);
      expect(celebratePoses.length).toBe(20);

      const thinkingPrompts = new Set(thinkingPoses.map((p) => p.prompt));
      const celebratePrompts = new Set(celebratePoses.map((p) => p.prompt));

      expect(thinkingPrompts.size).toBe(20);
      expect(celebratePrompts.size).toBe(20);
    });

    it("excludes already used prompts and ids cleanly", () => {
      const allThinking = getMascotPoses("thinking");
      const usedPrompts = [allThinking[0]!.prompt, allThinking[1]!.id];

      const unused = getUnusedMascotPoses("thinking", usedPrompts);
      expect(unused.length).toBe(18);
      expect(unused.find((p) => p.id === allThinking[0]!.id)).toBeUndefined();
      expect(unused.find((p) => p.id === allThinking[1]!.id)).toBeUndefined();
    });

    it("shuffles and picks distinct non-overlapping unused poses", () => {
      const allCelebrate = getMascotPoses("celebrate");
      const usedPrompts = [allCelebrate[0]!.prompt, allCelebrate[1]!.prompt];

      const picked = pickShuffledUnusedPoses("celebrate", usedPrompts, 10);
      expect(picked.length).toBe(10);
      const pickedSet = new Set(picked.map((p) => p.id));
      expect(pickedSet.size).toBe(10);
      expect(pickedSet.has(allCelebrate[0]!.id)).toBe(false);
      expect(pickedSet.has(allCelebrate[1]!.id)).toBe(false);
    });

    it("picks a single random unused pose excluding used poses", () => {
      const allThinking = getMascotPoses("thinking");
      // Use 19 out of 20 poses
      const usedPrompts = allThinking.slice(0, 19).map((p) => p.prompt);
      const chosen = pickRandomUnusedPose("thinking", usedPrompts);
      expect(chosen.id).toBe(allThinking[19]!.id);
      expect(chosen.prompt).toBe(allThinking[19]!.prompt);
    });
  });
});
