import { describe, expect, it } from "vitest";
import { mascotDialogue, MASCOT_SPEECH_DIRECTION } from "../src/introOutroScripts/mascotDialogue.js";
import { validateScriptContent } from "../src/introOutroScripts/validation.js";
import { identity, productionContent } from "./fixtures/introOutroDomainFixture.js";

describe("authored mascot dialogue", () => {
  it("uses a focused joyful intro and a short warm outro, without countdowns", () => {
    expect(mascotDialogue("intro").lines[0].text).toBe("Quiz time!");
    expect(mascotDialogue("intro").lines[0].delivery).toContain("enthusiastically");
    expect(mascotDialogue("outro").lines[0].text).toBe("See you next quiz!");
    expect(MASCOT_SPEECH_DIRECTION).toContain("synchronized mouth movement");
    expect(MASCOT_SPEECH_DIRECTION).toContain("no off-screen narrator");
  });
  it("allows explicitly authored speech without changing uncertain visual identity", () => {
    const content = productionContent();
    content.dialogue_policy = "mascot-direct-speech-v1";
    content.voiceover = mascotDialogue("intro");
    content.production_directions!.voice_source = "mascot";
    content.timeline[1].capability_ids.push("speech");
    const uncertain = { ...identity, capabilities: { ...identity.capabilities, speech: "unknown" as const } };
    const issues = validateScriptContent(content, uncertain, []);
    expect(
      issues.filter((issue) =>
        ["SPEECH_UNCONFIRMED", "CAPABILITY_REFERENCE_UNSUPPORTED", "VOICE_BUDGET_EXCEEDED", "VOICE_OVERLAP_OR_HOLD"].includes(issue.code),
      ),
    ).toEqual([]);
    expect(uncertain.capabilities.speech).toBe("unknown");
    delete content.dialogue_policy;
    expect(validateScriptContent(content, uncertain, []).some((issue) => issue.code === "SPEECH_UNCONFIRMED")).toBe(true);
  });
  it("rejects narrator or silent content under the new policy", () => {
    const content = productionContent();
    content.dialogue_policy = "mascot-direct-speech-v1";
    content.production_directions!.voice_source = "narrator";
    expect(validateScriptContent(content, identity, []).some((issue) => issue.code === "MASCOT_DIALOGUE_REQUIRED")).toBe(true);
  });
});
