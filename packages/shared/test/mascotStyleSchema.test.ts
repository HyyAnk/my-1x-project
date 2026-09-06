import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MascotStyleSchema,
  synthesizeLegacyCoreStyle,
  getMascotStyleReadiness,
  GenerateMascotStyleConceptRequestSchema,
  GenerateMascotStyleConceptResponseSchema,
  type MascotStyle,
  type MascotProfile,
} from "../src/index.js";

describe("MascotStyleSchema and style readiness", () => {
  describe("MascotStyleSchema parsing", () => {
    it("parses style with explicit anchor_image_url", () => {
      const parsed = MascotStyleSchema.parse({
        id: "style_cyberpunk",
        name: "Cyberpunk",
        keyword: "neon visor",
        anchor_image_url: "https://example.com/cyberpunk-anchor.png",
        is_default: false,
        states: {
          thinking: [],
          celebrate: [],
        },
        created_at: "2026-09-06T00:00:00.000Z",
        updated_at: "2026-09-06T00:00:00.000Z",
      });

      assert.equal(parsed.anchor_image_url, "https://example.com/cyberpunk-anchor.png");
      assert.equal(parsed.id, "style_cyberpunk");
    });

    it("parses style without anchor_image_url and defaults to null", () => {
      const parsed = MascotStyleSchema.parse({
        id: "style_classic",
        name: "Classic",
        states: {
          thinking: [],
          celebrate: [],
        },
        created_at: "2026-09-06T00:00:00.000Z",
        updated_at: "2026-09-06T00:00:00.000Z",
      });

      assert.equal(parsed.anchor_image_url, null);
      assert.equal(parsed.is_default, false);
      assert.deepEqual(parsed.states, { thinking: [], celebrate: [] });
    });

    it("allows null as anchor_image_url explicitly", () => {
      const parsed = MascotStyleSchema.parse({
        id: "style_classic",
        name: "Classic",
        anchor_image_url: null,
        states: {
          thinking: [],
          celebrate: [],
        },
        created_at: "2026-09-06T00:00:00.000Z",
        updated_at: "2026-09-06T00:00:00.000Z",
      });

      assert.equal(parsed.anchor_image_url, null);
    });
  });

  describe("synthesizeLegacyCoreStyle", () => {
    it("copies master_image_url to anchor_image_url", () => {
      const profile: Partial<MascotProfile> = {
        id: "mascot_1",
        name: "Robo Fox",
        master_image_url: "https://example.com/master-fox.png",
        created_at: "2026-09-06T00:00:00.000Z",
        updated_at: "2026-09-06T00:00:00.000Z",
      };

      const style = synthesizeLegacyCoreStyle(profile);
      assert.equal(style.id, "core");
      assert.equal(style.anchor_image_url, "https://example.com/master-fox.png");
    });

    it("defaults anchor_image_url to null when master_image_url is null or empty", () => {
      const profileNull: Partial<MascotProfile> = {
        id: "mascot_2",
        name: "Robo Cat",
        master_image_url: null,
      };
      const styleNull = synthesizeLegacyCoreStyle(profileNull);
      assert.equal(styleNull.anchor_image_url, null);

      const profileEmpty: Partial<MascotProfile> = {
        id: "mascot_3",
        name: "Robo Bear",
        master_image_url: "",
      };
      const styleEmpty = synthesizeLegacyCoreStyle(profileEmpty);
      assert.equal(styleEmpty.anchor_image_url, null);
    });
  });

  describe("getMascotStyleReadiness", () => {
    it("returns 'empty' for null or undefined style", () => {
      assert.equal(getMascotStyleReadiness(null), "empty");
      assert.equal(getMascotStyleReadiness(undefined), "empty");
    });

    it("returns 'empty' when style has no anchor_image_url and empty state slots", () => {
      const style: MascotStyle = {
        id: "test_style",
        name: "Test Style",
        keyword: "",
        anchor_image_url: null,
        is_default: false,
        states: {
          thinking: [],
          celebrate: [],
        },
        created_at: "2026-09-06T00:00:00.000Z",
        updated_at: "2026-09-06T00:00:00.000Z",
      };

      assert.equal(getMascotStyleReadiness(style), "empty");
    });

    it("returns 'empty' when style states have empty image URLs and whitespace anchor", () => {
      const style: MascotStyle = {
        id: "test_style",
        name: "Test Style",
        keyword: "",
        anchor_image_url: "   ",
        is_default: false,
        states: {
          thinking: [{ id: "t1", slot_index: 1, image_url: "  " }],
          celebrate: [{ id: "c1", slot_index: 1, image_url: "" }],
        },
        created_at: "2026-09-06T00:00:00.000Z",
        updated_at: "2026-09-06T00:00:00.000Z",
      };

      assert.equal(getMascotStyleReadiness(style), "empty");
    });

    it("returns 'concept_locked' when anchor_image_url is present but slots are not fully expressive", () => {
      const style: MascotStyle = {
        id: "test_style",
        name: "Test Style",
        keyword: "",
        anchor_image_url: "https://example.com/anchor.png",
        is_default: false,
        states: {
          thinking: [],
          celebrate: [],
        },
        created_at: "2026-09-06T00:00:00.000Z",
        updated_at: "2026-09-06T00:00:00.000Z",
      };

      assert.equal(getMascotStyleReadiness(style), "concept_locked");
    });

    it("returns 'concept_locked' when partial state slots exist without anchor", () => {
      const style: MascotStyle = {
        id: "test_style",
        name: "Test Style",
        keyword: "",
        anchor_image_url: null,
        is_default: false,
        states: {
          thinking: [{ id: "t1", slot_index: 1, image_url: "https://example.com/t1.png" }],
          celebrate: [],
        },
        created_at: "2026-09-06T00:00:00.000Z",
        updated_at: "2026-09-06T00:00:00.000Z",
      };

      assert.equal(getMascotStyleReadiness(style), "concept_locked");
    });

    it("returns 'fully_expressive' when all 10 thinking and 10 celebrate slots are filled", () => {
      const makeSlots = (prefix: string, count: number) =>
        Array.from({ length: count }, (_, i) => ({
          id: `${prefix}_${i + 1}`,
          slot_index: i + 1,
          image_url: `https://example.com/${prefix}_${i + 1}.png`,
        }));

      const style: MascotStyle = {
        id: "test_style",
        name: "Test Style",
        keyword: "",
        anchor_image_url: "https://example.com/anchor.png",
        is_default: false,
        states: {
          thinking: makeSlots("thinking", 10),
          celebrate: makeSlots("celebrate", 10),
        },
        created_at: "2026-09-06T00:00:00.000Z",
        updated_at: "2026-09-06T00:00:00.000Z",
      };

      assert.equal(getMascotStyleReadiness(style), "fully_expressive");
    });

    it("returns 'concept_locked' if thinking has 10 but celebrate has only 9", () => {
      const makeSlots = (prefix: string, count: number) =>
        Array.from({ length: count }, (_, i) => ({
          id: `${prefix}_${i + 1}`,
          slot_index: i + 1,
          image_url: `https://example.com/${prefix}_${i + 1}.png`,
        }));

      const style: MascotStyle = {
        id: "test_style",
        name: "Test Style",
        keyword: "",
        anchor_image_url: null,
        is_default: false,
        states: {
          thinking: makeSlots("thinking", 10),
          celebrate: makeSlots("celebrate", 9),
        },
        created_at: "2026-09-06T00:00:00.000Z",
        updated_at: "2026-09-06T00:00:00.000Z",
      };

      assert.equal(getMascotStyleReadiness(style), "concept_locked");
    });
  });

  describe("GenerateMascotStyleConcept schemas", () => {
    it("parses request schema with optional fields", () => {
      const parsedEmpty = GenerateMascotStyleConceptRequestSchema.parse({});
      assert.deepEqual(parsedEmpty, {});

      const parsedWithData = GenerateMascotStyleConceptRequestSchema.parse({
        prompt: "A cyberpunk fox with goggles",
        options: { seed: 1234, negative_prompt: "blurry" },
      });
      assert.equal(parsedWithData.prompt, "A cyberpunk fox with goggles");
      assert.deepEqual(parsedWithData.options, { seed: 1234, negative_prompt: "blurry" });
    });

    it("parses response schema with valid style and mascot profile", () => {
      const rawData = {
        style: {
          id: "style_test",
          name: "Cyberpunk",
          keyword: "neon",
          anchor_image_url: "https://example.com/anchor.png",
          is_default: true,
          states: { thinking: [], celebrate: [] },
          created_at: "2026-09-06T00:00:00.000Z",
          updated_at: "2026-09-06T00:00:00.000Z",
        },
        mascot: {
          id: "mascot_1",
          name: "Robo Fox",
          description: "Fox",
          visual_style: "pixar_3d",
          master_prompt: "fox",
          master_image_url: null,
          color_theme: "#06b6d4",
          actions: {},
          styles: [],
          assigned_channel_ids: [],
          created_at: "2026-09-06T00:00:00.000Z",
          updated_at: "2026-09-06T00:00:00.000Z",
        },
      };

      const parsed = GenerateMascotStyleConceptResponseSchema.parse(rawData);
      assert.equal(parsed.style.id, "style_test");
      assert.equal(parsed.style.anchor_image_url, "https://example.com/anchor.png");
      assert.equal(parsed.mascot.id, "mascot_1");
    });
  });
});
