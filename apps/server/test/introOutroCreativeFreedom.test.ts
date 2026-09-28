import { describe, expect, it } from "vitest";
import { IntroOutroScriptContentSchema } from "@studio/shared";
import { identity, productionContent } from "./fixtures/introOutroDomainFixture.js";
import { assembleCreativeTimeline } from "../src/introOutroScripts/creativeTimeline.js";
import { normalizeGeneratedContent } from "../src/introOutroScripts/generatedNormalization.js";
import { mergeGeneratedContent } from "../src/introOutroScripts/promptCompiler.js";
import { hasBlockingIssues, validateScriptContent } from "../src/introOutroScripts/validation.js";

describe("creative freedom at persistence boundaries", () => {
  it.each([1, 5, 12])("preserves %i scenes and open-ended performance descriptions", (count) => {
    const content = productionContent();
    content.production_policy = "creative-performance-v3";
    content.timeline = assembleCreativeTimeline(
      Array.from({ length: count }, () => ({
        action: "A playful unexpected reaction. ".repeat(80),
        choreography: { primary_action: "cartwheel into a floating somersault", end_pose: "upside down, laughing" },
        props: ["ball", "ribbon", "hat", "bell"],
      })),
      8,
      "intro",
    );
    content.voiceover.lines = Array.from({ length: 6 }, (_, index) => ({
      start_seconds: index,
      end_seconds: index + 1.5,
      text: `Reaction ${index}`,
      delivery: "Overlapping playful exchange",
    }));
    content.audio.events = Array.from({ length: 20 }, (_, index) => ({ at_seconds: index / 3, direction: `Accent ${index}` }));
    content.audio.music_direction = "A playful musical phrase evolves with the action. ".repeat(30).trim();
    content.camera = Array.from({ length: 10 }, (_, index) => ({
      start_seconds: index * 0.8,
      end_seconds: (index + 1) * 0.8,
      framing: "Wide",
      movement: "Follow the performance",
    }));
    content.consistency.restrictions = Array.from({ length: 35 }, (_, index) => `Authored continuity note ${index}`);
    const saved = IntroOutroScriptContentSchema.parse(
      mergeGeneratedContent({ raw: content, clipKind: "intro", durationSeconds: 8, identity }),
    );
    expect(saved.timeline).toEqual(content.timeline);
    expect(saved.voiceover).toEqual(content.voiceover);
    expect(saved.audio).toEqual(content.audio);
    expect(saved.camera).toEqual(content.camera);
    expect(saved.consistency.restrictions).toEqual(content.consistency.restrictions);
    expect(normalizeGeneratedContent(saved, identity)).toEqual(saved);
    expect(hasBlockingIssues(validateScriptContent(saved, identity, []))).toBe(false);
  });
});
