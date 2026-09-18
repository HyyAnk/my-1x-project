import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_RECIPES,
  THINKING_RECIPES,
  CELEBRATE_RECIPES,
  getAllRecipes,
  getRecipesByState,
  getRecipeById,
  getRecipeBySlot,
  buildAnimationPrompt,
  containsProhibitedTerms,
  computeAnimationSourceFingerprint,
  computeAnimationContentFingerprint,
  computeAnimationJobIdempotencyKey,
  REQUIRED_FRAME_COUNT,
  REQUIRED_FPS,
  FRAME_DURATION_MS,
  type AnimationFingerprintInput,
  type AnimationContentFingerprintInput,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;
const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};
const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

const EXPECTED_THINKING_RECIPE_IDS = [
  "thinking-01-head-tilt-left",
  "thinking-02-head-tilt-right",
  "thinking-03-look-up",
  "thinking-04-look-down",
  "thinking-05-paw-near-chin",
  "thinking-06-gentle-sway",
  "thinking-07-focused-blink",
  "thinking-08-curious-lean-left",
  "thinking-09-curious-lean-right",
  "thinking-10-calm-breathing",
] as const;

const EXPECTED_CELEBRATE_RECIPE_IDS = [
  "celebrate-01-both-hands-up",
  "celebrate-02-small-jump",
  "celebrate-03-clap",
  "celebrate-04-lean-left-smile",
  "celebrate-05-lean-right-smile",
  "celebrate-06-excited-bounce",
  "celebrate-07-one-hand-victory",
  "celebrate-08-joyful-wave",
  "celebrate-09-excited-turn",
  "celebrate-10-happy-bow",
] as const;

describe("Mascot Animation Recipe Catalog & Fingerprinting (Stage 04)", () => {
  describe("Recipe stability and presence", () => {
    it("contains exactly 20 recipes in the global catalog", () => {
      assert.equal(ALL_RECIPES.length, 20);
      assert.equal(getAllRecipes().length, 20);
    });

    it("contains exactly 10 thinking recipes with matching IDs and slots 1..10", () => {
      const thinking = getRecipesByState("thinking");
      assert.equal(thinking.length, 10);
      assert.equal(THINKING_RECIPES.length, 10);

      EXPECTED_THINKING_RECIPE_IDS.forEach((expectedId, index) => {
        const expectedSlot = index + 1;
        const recipe = thinking[index];
        assert.equal(recipe.id, expectedId);
        assert.equal(recipe.state, "thinking");
        assert.equal(recipe.slot_index, expectedSlot);

        const byId = getRecipeById(expectedId);
        assert.ok(byId);
        assert.equal(byId?.id, expectedId);

        const bySlot = getRecipeBySlot("thinking", expectedSlot);
        assert.ok(bySlot);
        assert.equal(bySlot?.id, expectedId);
      });
    });

    it("contains exactly 10 celebrate recipes with matching IDs and slots 1..10", () => {
      const celebrate = getRecipesByState("celebrate");
      assert.equal(celebrate.length, 10);
      assert.equal(CELEBRATE_RECIPES.length, 10);

      EXPECTED_CELEBRATE_RECIPE_IDS.forEach((expectedId, index) => {
        const expectedSlot = index + 1;
        const recipe = celebrate[index];
        assert.equal(recipe.id, expectedId);
        assert.equal(recipe.state, "celebrate");
        assert.equal(recipe.slot_index, expectedSlot);

        const byId = getRecipeById(expectedId);
        assert.ok(byId);
        assert.equal(byId?.id, expectedId);

        const bySlot = getRecipeBySlot("celebrate", expectedSlot);
        assert.ok(bySlot);
        assert.equal(bySlot?.id, expectedId);
      });
    });

    it("guarantees all 20 recipe IDs are unique", () => {
      const ids = ALL_RECIPES.map((r) => r.id);
      const uniqueIds = new Set(ids);
      assert.equal(uniqueIds.size, 20);
    });
  });

  describe("Recipe state-separation and mood integrity", () => {
    it("guarantees thinking recipes remain calm, focused, and loop seamlessly", () => {
      THINKING_RECIPES.forEach((recipe) => {
        assert.equal(recipe.state, "thinking");
        assert.equal(recipe.loop_policy, "loop");
        assert.equal(recipe.energy_level, "low");
        assert.match(recipe.movement_intent, /(calm|thoughtful|reflect|focused|contemplative|inquisitive|poise|peaceful)/i);
      });
    });

    it("guarantees celebrate recipes remain joyful, energetic, and return to rest", () => {
      CELEBRATE_RECIPES.forEach((recipe) => {
        assert.equal(recipe.state, "celebrate");
        assert.equal(recipe.loop_policy, "one_shot_rest");
        assert.ok(recipe.energy_level === "moderate" || recipe.energy_level === "high");
        assert.match(recipe.movement_intent, /(victory|cheer|bounce|applause|proud|celebration|greeting|spin|accomplishment|champion)/i);
      });
    });

    it("ensures no recipe descriptions or action instructions contain prohibited terms", () => {
      ALL_RECIPES.forEach((recipe) => {
        assert.equal(
          containsProhibitedTerms(recipe.description),
          false,
          `Recipe ${recipe.id} description contains prohibited terms: ${recipe.description}`,
        );
        assert.equal(
          containsProhibitedTerms(recipe.action_instruction),
          false,
          `Recipe ${recipe.id} action instruction contains prohibited terms: ${recipe.action_instruction}`,
        );
      });
    });
  });

  describe("Prompt builder function", () => {
    it("builds a comprehensive prompt with style anchor, traits, and strict negative constraints", () => {
      const prompt = buildAnimationPrompt("thinking-01-head-tilt-left", {
        characterName: "Professor Hoot",
        characterDescription: "Cute scholarly blue owl with gold spectacles and brown tweed vest",
        visualStyle: "3d cute pixar render",
        anchorKeyword: "smart owl",
      });

      // Style and character
      assert.match(prompt, /Professor Hoot/);
      assert.match(prompt, /Cute scholarly blue owl/);
      assert.match(prompt, /3d cute pixar render/);
      assert.match(prompt, /smart owl/);

      // Frame specs
      assert.match(prompt, /Exactly 12 sequential animation frames at 8 fps/);
      assert.match(prompt, /Exactly one centered character at fixed scale/);

      // Chroma key
      assert.match(prompt, /Solid flat chroma key background \(#00FF00\)/);

      // Prohibited elements
      assert.match(prompt, /Strict Negative Constraints/);
      assert.match(prompt, /no text/);
      assert.match(prompt, /no background scenery/);
      assert.match(prompt, /no multiple characters/);
      assert.match(prompt, /no detached effects/);
      assert.match(prompt, /no motion lines/);
      assert.match(prompt, /no model-generated atlas/);
    });

    it("generates 20 distinct prompts for all 20 recipes", () => {
      const prompts = ALL_RECIPES.map((recipe) =>
        buildAnimationPrompt(recipe, {
          characterDescription: "A brave little red fox",
          visualStyle: "claymation style",
        }),
      );

      const uniquePrompts = new Set(prompts);
      assert.equal(uniquePrompts.size, 20);
    });

    it("throws when unknown recipe id is provided", () => {
      assert.throws(
        () => buildAnimationPrompt("unknown-action", { characterDescription: "Test" }),
        /Unknown animation recipe: unknown-action/,
      );
    });
  });

  describe("Fingerprint determinism and content-addressed hashing", () => {
    const baseSourceInput: AnimationFingerprintInput = {
      styleAnchorIdOrUrl: "https://example.com/mascot_anchor.png",
      recipeId: "thinking-01-head-tilt-left",
      prompt: "Character: Blue owl. Action: head tilt left.",
      frameCount: REQUIRED_FRAME_COUNT,
      fps: REQUIRED_FPS,
      providerRevision: "sprite-gen@v1.4.0",
      toolVersion: "2.1.0",
    };

    it("computes identical SHA-256 source fingerprints for identical inputs", () => {
      const hash1 = computeAnimationSourceFingerprint(baseSourceInput);
      const hash2 = computeAnimationSourceFingerprint({ ...baseSourceInput });

      assert.equal(hash1, hash2);
      assert.equal(hash1.length, 64);
      assert.match(hash1, /^[0-9a-f]{64}$/);
    });

    it("produces distinct fingerprints when any critical input parameter changes", () => {
      const baseHash = computeAnimationSourceFingerprint(baseSourceInput);

      const changedPromptHash = computeAnimationSourceFingerprint({
        ...baseSourceInput,
        prompt: "Character: Red fox. Action: head tilt left.",
      });
      assert.notEqual(baseHash, changedPromptHash);

      const changedRecipeHash = computeAnimationSourceFingerprint({
        ...baseSourceInput,
        recipeId: "thinking-02-head-tilt-right",
      });
      assert.notEqual(baseHash, changedRecipeHash);

      const changedAnchorHash = computeAnimationSourceFingerprint({
        ...baseSourceInput,
        styleAnchorIdOrUrl: "https://example.com/different_anchor.png",
      });
      assert.notEqual(baseHash, changedAnchorHash);

      const changedRevisionHash = computeAnimationSourceFingerprint({
        ...baseSourceInput,
        providerRevision: "sprite-gen@v1.5.0",
      });
      assert.notEqual(baseHash, changedRevisionHash);
    });

    it("computes identical content fingerprints for identical artifact structures", () => {
      const frames = Array.from({ length: 12 }, (_, index) => ({
        index,
        x: index * 128,
        y: 0,
        width: 128,
        height: 128,
        duration_ms: FRAME_DURATION_MS,
      }));

      const baseContentInput: AnimationContentFingerprintInput = {
        recipeId: "celebrate-01-both-hands-up",
        atlasChecksumOrUrl: "sha256:abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234",
        frames,
        registration: {
          source_width: 1536,
          source_height: 128,
          content_bounds: { x: 10, y: 10, width: 100, height: 100 },
          pivot: { x: 64, y: 120 },
          offset_x: 0,
          offset_y: 0,
        },
        sourceFingerprint: "src_fp_12345",
      };

      const contentHash1 = computeAnimationContentFingerprint(baseContentInput);
      const contentHash2 = computeAnimationContentFingerprint({ ...baseContentInput });

      assert.equal(contentHash1, contentHash2);
      assert.equal(contentHash1.length, 64);

      // Modifying frame coordinates changes the content hash
      const modifiedFrames = [...frames];
      modifiedFrames[0] = { ...modifiedFrames[0], width: 130 };
      const changedContentHash = computeAnimationContentFingerprint({
        ...baseContentInput,
        frames: modifiedFrames,
      });
      assert.notEqual(contentHash1, changedContentHash);
    });

    it("computes deterministic job idempotency key", () => {
      const key1 = computeAnimationJobIdempotencyKey("mascot_1", "style_pixel", "thinking", 1, "fp_abc123");
      const key2 = computeAnimationJobIdempotencyKey("mascot_1", "style_pixel", "thinking", 1, "fp_abc123");
      const key3 = computeAnimationJobIdempotencyKey("mascot_1", "style_pixel", "thinking", 2, "fp_abc123");

      assert.equal(key1, key2);
      assert.notEqual(key1, key3);
      assert.equal(key1.length, 64);
    });
  });
});
