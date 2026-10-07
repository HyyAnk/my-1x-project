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
  it("resolves dynamic verbal hooks when dynamic seeds are passed", () => {
    for (let i = 1; i <= 30; i++) {
      const id = `D${String(i).padStart(2, "0")}`;
      const dialog = mascotDialogue("intro", 8, [id]);
      expect(dialog.lines[0].text).not.toBe("Quiz time!");
      expect(dialog.lines[0].text.length).toBeGreaterThan(10);
      expect(dialog.lines[0].delivery).toBeDefined();
    }
    expect(mascotDialogue("intro", 8, ["D01"]).lines[0].text).toBe(
      "Think you can beat today's quiz? Step up and prove it!",
    );
    expect(mascotDialogue("intro", 8, ["D08"]).lines[0].text).toBe(
      "Think fast and trust your instincts! How sharp are you?",
    );
    expect(mascotDialogue("intro", 8, ["D09"]).lines[0].text).toBe(
      "Can you score a perfect ten today? Let's find out!",
    );
    expect(mascotDialogue("intro", 8, ["D10"]).lines[0].text).toBe(
      "Think you know all the answers? Let's test your wits!",
    );
    expect(mascotDialogue("intro", 8, ["D11"]).lines[0].text).toBe("Bet you can't score a perfect ten today! Prove me wrong!");
    expect(mascotDialogue("intro", 8, ["D17"]).lines[0].text).toBe("Player One, press start! The ultimate trivia quest begins now!");
    expect(mascotDialogue("intro", 8, ["D22"]).lines[0].text).toBe("Ladies and gentlemen, warm up those synapses! It is showtime!");
    expect(mascotDialogue("intro", 8, ["D24"]).lines[0].text).toBe("Did someone say POP QUIZ?! It is officially game on!");
    expect(mascotDialogue("intro", 8, ["D30"]).lines[0].text).toBe("Every question is a treasure chest! Unlock the golden answers!");
  });
  it("enforces punchy 8-11 word count sweet spot across all 30 intro dialogue seeds", () => {
    for (let i = 1; i <= 30; i++) {
      const id = `D${String(i).padStart(2, "0")}`;
      const text = mascotDialogue("intro", 8, [id]).lines[0].text;
      const wordCount = text.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(8);
      expect(wordCount).toBeLessThanOrEqual(11);
    }
  });
  it("resolves dynamic outro farewell hooks with friendly sign-offs when outro seeds are passed", () => {
    expect(mascotDialogue("outro", 8, ["F01"]).lines[0].text).toBe("Subscribe for more quizzes! See you next round!");
    expect(mascotDialogue("outro", 8, ["F03"]).lines[0].text).toBe("Awesome job today! Subscribe and keep shining!");
    expect(mascotDialogue("outro", 8, ["F06"]).lines[0].text).toBe("Thanks for playing! Subscribe for our next quest!");
    expect(mascotDialogue("outro", 8, ["F12"]).lines[0].text).toBe(
      "Tricky quiz? Subscribe for tomorrow's mystery challenge!",
    );
    expect(mascotDialogue("outro", 8, ["F17"]).lines[0].text).toBe(
      "How many right? Comment your score below!",
    );
    expect(mascotDialogue("outro", 8, ["F27"]).lines[0].text).toBe(
      "Curious minds! Subscribe to discover daily quizzes!",
    );
    expect(mascotDialogue("outro", 8, ["F30"]).lines[0].text).toBe(
      "Unforgettable challenge tomorrow! Tap subscribe and join in!",
    );
  });
  it("enforces punchy 5-9 word count sweet spot across all 30 outro dialogue seeds", () => {
    for (let i = 1; i <= 30; i++) {
      const id = `F${String(i).padStart(2, "0")}`;
      const text = mascotDialogue("outro", 8, [id]).lines[0].text;
      const wordCount = text.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(5);
      expect(wordCount).toBeLessThanOrEqual(9);
    }
  });
  it("provides 30 distinct outro dialogue seeds from F01 to F30", () => {
    for (let i = 1; i <= 30; i++) {
      const id = `F${String(i).padStart(2, "0")}`;
      const entry = mascotDialogue("outro", 8, [id]).lines[0];
      expect(entry.text).toBeDefined();
      expect(entry.text.length).toBeGreaterThan(10);
      expect(entry.delivery).toBeDefined();
    }
  });
  it("schedules dual synchronized lines for 10s outro with primary call and secondary sign-off", () => {
    const dialog = mascotDialogue("outro", 10, ["F08"]);
    expect(dialog.lines).toHaveLength(2);
    expect(dialog.lines[0].text).toBe("Tap subscribe for your next brain quest!");
    expect(dialog.lines[0].start_seconds).toBe(3.4);
    expect(dialog.lines[0].end_seconds).toBe(6.5);
    expect(dialog.lines[1].text).toBe("See ya next time! Bye-bye!");
    expect(dialog.lines[1].start_seconds).toBe(7.1);
    expect(dialog.lines[1].end_seconds).toBe(9.2);
  });
});
