import assert from "node:assert/strict";
import test from "node:test";
import {
  MotionPromptOutputSchema,
  MotionPromptRequestSchema,
  MotionPromptStyleMoodSchema,
} from "../src/index.js";

test("MotionPromptStyleMoodSchema parses all valid moods", () => {
  const moods = [
    "cyberpunk",
    "high_energy",
    "minimal_luxury",
    "arcade_playful",
    "epic_cinematic",
    "educational_clean",
  ] as const;

  for (const mood of moods) {
    assert.equal(MotionPromptStyleMoodSchema.parse(mood), mood);
  }

  assert.throws(() => MotionPromptStyleMoodSchema.parse("invalid_mood"));
});

test("MotionPromptRequestSchema applies default placement and validates required fields", () => {
  const minimal = MotionPromptRequestSchema.parse({
    topicTitle: "Solar System Exploration",
  });
  assert.equal(minimal.topicTitle, "Solar System Exploration");
  assert.equal(minimal.placement, "intro");

  const full = MotionPromptRequestSchema.parse({
    topicTitle: "World History Trivia",
    channelName: "History Buffs",
    placement: "outro",
    mood: "minimal_luxury",
    preferredTemplateId: "minimal_sleek",
    targetDurationSeconds: 3.5,
    audienceAgeBand: "10-12",
    hasCustomLogo: true,
  });
  assert.equal(full.topicTitle, "World History Trivia");
  assert.equal(full.channelName, "History Buffs");
  assert.equal(full.placement, "outro");
  assert.equal(full.mood, "minimal_luxury");
  assert.equal(full.preferredTemplateId, "minimal_sleek");
  assert.equal(full.targetDurationSeconds, 3.5);
});

test("MotionPromptOutputSchema validates full generation output shape", () => {
  const validOutput = MotionPromptOutputSchema.parse({
    recommendedTemplateId: "kinetic_punch",
    placement: "intro",
    mood: "high_energy",
    generatedOptions: {
      accentColor: "#FF007F",
      headlineText: "READY STEADY GO",
      subheadlineText: "SOLAR SYSTEM QUIZ",
      showMascot: true,
    },
    animationPhilosophy: "Explosive entry with 120ms staggered typography snap to retain attention in the first 2 seconds.",
    llmPromptRecipe: "SYSTEM: Generate a deterministic 60fps kinetic motion graphic...",
  });

  assert.equal(validOutput.recommendedTemplateId, "kinetic_punch");
  assert.equal(validOutput.generatedOptions.accentColor, "#FF007F");
  assert.ok(validOutput.animationPhilosophy.length > 0);
  assert.ok(validOutput.llmPromptRecipe.includes("SYSTEM:"));
});
