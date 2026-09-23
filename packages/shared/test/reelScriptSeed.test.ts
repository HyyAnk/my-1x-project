import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALL_REEL_SCRIPT_SEEDS,
  ReelScriptSeedSchema,
  getScriptSeedsForArchetype,
  getScriptSeedById,
  resolveDefaultSeedForArchetype,
  resolveScriptSeed,
} from "../src/shortReel/index.js";

describe("Short-Reel Script Seeds Contract and Catalog", () => {
  it("validates all 12 curated seeds conform to ReelScriptSeedSchema", () => {
    assert.equal(ALL_REEL_SCRIPT_SEEDS.length, 12);
    for (const seed of ALL_REEL_SCRIPT_SEEDS) {
      const parsed = ReelScriptSeedSchema.parse(seed);
      assert.equal(parsed.id, seed.id);
      assert.ok(parsed.name.length > 0);
      assert.ok(parsed.tagline.length > 0);
      assert.ok(parsed.narrative_intent.length > 0);
      assert.ok(parsed.visual_staging_guidance.length > 0);
      assert.ok(parsed.segment_beats.segment_1.length > 0);
      assert.ok(parsed.segment_beats.segment_2.length > 0);
      assert.ok(parsed.segment_beats.segment_3.length > 0);
      assert.ok(parsed.pacing_tone.length > 0);
      assert.ok(parsed.preferred_ending_motifs.length >= 1);
    }
  });

  it("provides exactly 4 curated seeds for each archetype", () => {
    const vfSeeds = getScriptSeedsForArchetype("versus_faceoff");
    const dtSeeds = getScriptSeedsForArchetype("deep_trivia");
    const tfSeeds = getScriptSeedsForArchetype("verdict_true_false");

    assert.equal(vfSeeds.length, 4);
    assert.equal(dtSeeds.length, 4);
    assert.equal(tfSeeds.length, 4);

    assert.ok(vfSeeds.every((s) => s.archetype === "versus_faceoff"));
    assert.ok(dtSeeds.every((s) => s.archetype === "deep_trivia"));
    assert.ok(tfSeeds.every((s) => s.archetype === "verdict_true_false"));
  });

  it("resolves seeds by id correctly", () => {
    const arena = getScriptSeedById("vf_arena_clash");
    assert.ok(arena);
    assert.equal(arena?.name, "Arena Clash");

    const nonExistent = getScriptSeedById("unknown_seed_id");
    assert.equal(nonExistent, undefined);
  });

  it("resolves default seed per archetype", () => {
    assert.equal(resolveDefaultSeedForArchetype("versus_faceoff").id, "vf_arena_clash");
    assert.equal(resolveDefaultSeedForArchetype("deep_trivia").id, "dt_mystery_investigation");
    assert.equal(resolveDefaultSeedForArchetype("verdict_true_false").id, "tf_mythbusters_lab");
  });

  it("resolves script seed by explicit matching ID", () => {
    const seed = resolveScriptSeed("versus_faceoff", "vf_tale_of_the_tape");
    assert.equal(seed.id, "vf_tale_of_the_tape");
  });

  it("falls back to default or hash when requested ID belongs to a different archetype", () => {
    const seed = resolveScriptSeed("versus_faceoff", "tf_mythbusters_lab");
    assert.equal(seed.id, "vf_arena_clash");
  });

  it("deterministically resolves seed from key without repeats when keys vary", () => {
    const key1 = "reel_abc_123";
    const key2 = "reel_xyz_789";

    const s1A = resolveScriptSeed("deep_trivia", null, key1);
    const s1B = resolveScriptSeed("deep_trivia", null, key1);
    assert.equal(s1A.id, s1B.id);

    const s2 = resolveScriptSeed("deep_trivia", null, key2);
    assert.ok(s2);
  });
});
