import { describe, expect, it } from "vitest";
import { IntroOutroScriptContentSchema, type IntroOutroScriptContent } from "@studio/shared";
import { identity, productionContent } from "./fixtures/introOutroDomainFixture.js";
import { CREATIVE_PRODUCTION_POLICY } from "../src/introOutroScripts/creativePolicy.js";
import { assembleCreativeTimeline } from "../src/introOutroScripts/creativeTimeline.js";
import { normalizeGeneratedContent } from "../src/introOutroScripts/generatedNormalization.js";
import { hasBlockingIssues, validateScriptContent } from "../src/introOutroScripts/validation.js";
import { mergeGeneratedContent } from "../src/introOutroScripts/promptCompiler.js";
import { compatibleSeeds } from "../src/introOutroScripts/seedProductionPolicy.js";
import { BUILT_IN_INTRO_OUTRO_SEEDS } from "../src/introOutroScripts/seedCatalog.js";

function creativeContent(): IntroOutroScriptContent {
  const c = productionContent();
  c.production_policy = CREATIVE_PRODUCTION_POLICY;
  c.dialogue_policy = "mascot-direct-speech-v1";
  c.production_directions!.voice_source = "mascot";
  c.production_directions!.end_hold_seconds = 0;
  c.timeline[0].action = "The spotlight moves, then pauses, then returns to the mascot";
  c.timeline[2].action = "Two matching silhouettes exchange a delighted reaction as the last sparkle fades";
  c.voiceover.lines = [
    { start_seconds: 1.8, end_seconds: 2.3, text: "Again?", delivery: "First mascot, curious" },
    { start_seconds: 7.1, end_seconds: 7.8, text: "Again?", delivery: "Second mascot, knowingly repeats the question" },
  ];
  c.audio.events = Array.from({ length: 9 }, (_, index) => ({
    at_seconds: index === 8 ? 7.9 : index * 0.8,
    direction: `Reaction accent ${index + 1}`,
  }));
  return c;
}

describe("creative production policy", () => {
  it("keeps intentional repetition, late speech/SFX, multiple micro-actions and custom endings", () => {
    const c = creativeContent();
    c.timeline[1].action = 'The second silhouette echoes "Again?" during the scheduled reply';
    c.timeline[1].props = ["light", "ribbon"];
    const issues = validateScriptContent(IntroOutroScriptContentSchema.parse(c), identity, []);
    expect(hasBlockingIssues(issues)).toBe(false);
    expect(issues.some((issue) => issue.code === "ACTION_CAPABILITY_MISSING" && issue.severity === "warning")).toBe(true);
    expect(normalizeGeneratedContent(c, identity)).toEqual(c);
  });

  it("preserves long authored text, custom group timing and all identity restrictions", () => {
    const c = creativeContent();
    c.timeline[0].action = "The light changes color while the mascot watches with curiosity. ".repeat(12).trim();
    c.timeline[0].end_seconds = 1.4;
    c.timeline[1].start_seconds = 1.4;
    c.consistency.restrictions = Array.from({ length: 8 }, (_, i) => `Preserve reference detail ${i}`);
    expect(assembleCreativeTimeline(c.timeline, 8, "intro")).toEqual(c.timeline);
    const merged = mergeGeneratedContent({ raw: c, clipKind: "intro", durationSeconds: 8, identity });
    expect(IntroOutroScriptContentSchema.parse(merged).consistency.restrictions).toEqual(c.consistency.restrictions);
    expect(normalizeGeneratedContent(c, identity).timeline[0].action.length).toBeGreaterThan(500);
  });

  it("supplies omitted grouping timestamps but does not hide invalid supplied timestamps", () => {
    const c = creativeContent();
    const groups = c.timeline.map(({ action }) => ({ action }));
    expect(assembleCreativeTimeline(groups, 8, "intro")[2].end_seconds).toBe(8);
    expect(() => assembleCreativeTimeline([{ ...groups[0], start_seconds: -1 }, ...groups.slice(1)], 8, "intro")).toThrow();
  });

  it.each([
    [
      "speech overlap",
      (c: IntroOutroScriptContent) => {
        c.voiceover.lines[1].start_seconds = 2;
      },
    ],
    [
      "out-of-range audio",
      (c: IntroOutroScriptContent) => {
        c.audio.events[0].at_seconds = 8;
      },
    ],
    [
      "timeline gap",
      (c: IntroOutroScriptContent) => {
        c.timeline[1].start_seconds = 2.2;
      },
    ],
    [
      "identity mismatch",
      (c: IntroOutroScriptContent) => {
        c.identity.profile_id = "other";
      },
    ],
    [
      "unsupported capability",
      (c: IntroOutroScriptContent) => {
        c.timeline[0].capability_ids = ["waving"];
      },
    ],
    [
      "unknown feature",
      (c: IntroOutroScriptContent) => {
        c.timeline[0].visible_feature_ids = ["invented"];
      },
    ],
  ] as const)("keeps %s advisory except cross-project identity mismatch", (label, mutate) => {
    const c = creativeContent();
    mutate(c);
    expect(hasBlockingIssues(validateScriptContent(c, identity, []))).toBe(label === "identity mismatch");
  });

  it("warns about pace or uncertain motion without rewriting or rejecting the performance", () => {
    const c = creativeContent();
    c.timeline[0].capability_ids = ["locomotion"];
    c.voiceover.lines[0].text = "Wait what just happened over there?";
    const issues = validateScriptContent(c, identity, []);
    expect(issues.some((issue) => issue.code === "VOICE_PACING_FAST")).toBe(true);
    expect(hasBlockingIssues(issues)).toBe(false);
    expect(normalizeGeneratedContent(c, identity).voiceover).toEqual(c.voiceover);
  });

  it("accepts an authored silent performance", () => {
    const c = creativeContent();
    c.voiceover = { enabled: false, lines: [] };
    c.production_directions!.voice_source = "none";
    expect(hasBlockingIssues(validateScriptContent(c, identity, []))).toBe(false);
  });

  it("allows complex seed combinations but preserves explicit exclusions", () => {
    const seeds = BUILT_IN_INTRO_OUTRO_SEEDS.slice(0, 4).map((seed) => ({ ...seed, complexity: "high" as const, forbidden_seed_ids: [] }));
    expect(compatibleSeeds(seeds.slice(0, 3), seeds[3])).toBe(true);
    expect(compatibleSeeds(seeds.slice(0, 3), { ...seeds[3], forbidden_seed_ids: [seeds[0].id] })).toBe(false);
  });
});
