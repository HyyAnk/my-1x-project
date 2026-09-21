import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MASCOT_CELEBRATE_POSES,
  MASCOT_CELEBRATE_SAFE_FALLBACK_PROMPT,
  MASCOT_CELEBRATE_SLOT_PRESETS,
  hasExcludedMascotCelebrateVisual,
  resolveSafeMascotCelebratePrompt,
} from "../src/index.js";

describe("mascot celebrate visual policy", () => {
  it("keeps every built-in celebrate pose free of excluded celebration effects", () => {
    for (const pose of MASCOT_CELEBRATE_POSES) {
      assert.equal(hasExcludedMascotCelebrateVisual(`${pose.label} ${pose.prompt}`), false, pose.id);
    }
  });

  it("keeps every fixed celebrate slot preset free of excluded celebration effects", () => {
    for (const [slotIndex, prompt] of Object.entries(MASCOT_CELEBRATE_SLOT_PRESETS)) {
      assert.equal(hasExcludedMascotCelebrateVisual(prompt), false, `celebrate slot ${slotIndex}`);
    }
  });

  it("replaces excluded custom visuals with the requested safe fallback", () => {
    const safeFallback = MASCOT_CELEBRATE_SLOT_PRESETS[3];
    const resolved = resolveSafeMascotCelebratePrompt("Throwing colorful confetti from a party popper", safeFallback);

    assert.equal(resolved, safeFallback);
    assert.equal(hasExcludedMascotCelebrateVisual(resolved), false);
  });

  it("uses a guaranteed safe fallback when both inputs contain excluded visuals", () => {
    const resolved = resolveSafeMascotCelebratePrompt("Confetti toss", "Party popper with streamers");

    assert.equal(resolved, MASCOT_CELEBRATE_SAFE_FALLBACK_PROMPT);
    assert.equal(hasExcludedMascotCelebrateVisual(resolved), false);
  });
});
