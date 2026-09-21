import { describe, expect, it } from "vitest";
import type { MascotStyle } from "@studio/shared";
import { buildMascotActionPrompt, buildMascotSourceImagePrompt } from "../src/quiz/mascotPromptContract.js";
import { resolveSlotPromptModifier } from "../src/quiz/mascot/generation/artGeneratorHelpers.js";

const mascot = {
  name: "Pip",
  description: "Friendly penguin mascot",
  visual_style: "pixar_3d" as const,
  master_prompt: "Cute blue penguin",
  color_theme: "#06b6d4",
};

const exclusionText = "Strictly no confetti, party poppers, party cannons, party horns";

const emptyStyle: MascotStyle = {
  id: "core",
  name: "Core Style",
  keyword: "",
  anchor_image_url: null,
  raw_anchor_image_url: null,
  states: { thinking: [], celebrate: [] },
  is_default: true,
  style_revision: 1,
};

describe("mascot celebrate prompt visual policy", () => {
  it.each([
    { hasReferenceImage: false, hasStyleAnchor: false },
    { hasReferenceImage: true, hasStyleAnchor: false },
    { hasReferenceImage: true, hasStyleAnchor: true },
  ])("adds the exclusion directive to every action prompt branch", (options) => {
    const prompt = buildMascotActionPrompt(mascot, "celebrate", {
      ...options,
      prompt: "Joyful victory pose with both arms raised",
    });

    expect(prompt).toContain(exclusionText);
    expect(prompt).toContain("This exclusion overrides pose text, style direction, and reference imagery.");
  });

  it("replaces an excluded custom action before building the final prompt", () => {
    const prompt = buildMascotSourceImagePrompt(mascot, "celebrate", {
      hasReferenceImage: true,
      hasStyleAnchor: true,
      slotIndex: 5,
      prompt: "Throwing colorful confetti from a party popper with ribbon streamers",
    });

    expect(prompt).toContain("Pose and Action: Leaping excitedly with one arm reaching high for a celebratory high-five");
    expect(prompt).not.toContain("Pose and Action: Throwing colorful confetti");
    expect(prompt).toContain(exclusionText);
  });

  it("does not apply the celebrate-only policy to thinking prompts", () => {
    const prompt = buildMascotActionPrompt(mascot, "thinking", {
      prompt: "Studying a colorful paper clue",
    });

    expect(prompt).toContain("Pose and Action: Studying a colorful paper clue.");
    expect(prompt).not.toContain(exclusionText);
  });

  it("normalizes an excluded slot modifier before generation persists it", () => {
    const promptModifier = resolveSlotPromptModifier(
      emptyStyle,
      "celebrate",
      3,
      "Throwing colorful confetti from a party popper with ribbon streamers",
    );

    expect(promptModifier).toBe("Playful wink with double victory V-signs, beaming with joyful charming energy");
  });
});
