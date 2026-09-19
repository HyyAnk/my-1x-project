import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  UploadMascotConceptInputSchema,
  UploadMascotConceptResponseSchema,
  MascotProfileSchema,
  MascotConceptOriginSchema,
  MascotUploadMimeTypeSchema,
  type UploadMascotConceptInput,
  type UploadMascotConceptResponse,
  type MascotProfile,
  type MascotConceptOrigin,
} from "../src/index.js";
import {
  UploadMascotConceptInputSchema as SchemaFromSchemas,
  UploadMascotConceptResponseSchema as ResponseFromSchemas,
} from "../src/schemas/mascot.js";
import {
  UploadMascotConceptInputSchema as SchemaFromApi,
  UploadMascotConceptResponseSchema as ResponseFromApi,
} from "../src/api/mascot.js";

type TestCallback = () => void | Promise<void>;

const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};

const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

const SAMPLE_BASE64_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const SAMPLE_RAW_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const createValidMascotProfile = (overrides: Partial<MascotProfile> = {}): MascotProfile => ({
  id: "mascot_test_01",
  name: "Luna Fox",
  description: "A playful cybernetic fox assistant",
  visual_style: "pixar_3d",
  master_prompt: "cyber fox with glowing tail",
  master_image_url: "https://storage.example.com/mascot_master.png",
  master_raw_image_url: "https://storage.example.com/mascot_master_raw.png",
  color_theme: "#06b6d4",
  actions: {},
  styles: [],
  assigned_channel_ids: [],
  created_at: "2026-09-19T00:00:00.000Z",
  updated_at: "2026-09-19T00:00:00.000Z",
  ...overrides,
});

describe("Mascot Master Concept Upload Schemas & Contracts (Stage 1)", () => {
  describe("Export parity across modules", () => {
    it("exports identical schema instances across schemas, api, and index entrypoints", () => {
      assert.strictEqual(UploadMascotConceptInputSchema, SchemaFromSchemas);
      assert.strictEqual(UploadMascotConceptInputSchema, SchemaFromApi);
      assert.strictEqual(UploadMascotConceptResponseSchema, ResponseFromSchemas);
      assert.strictEqual(UploadMascotConceptResponseSchema, ResponseFromApi);
    });
  });

  describe("UploadMascotConceptInputSchema", () => {
    it("parses valid payload with data URL image and optional fields omitted", () => {
      const input = {
        image_data: SAMPLE_BASE64_DATA_URL,
      };

      const parsed: UploadMascotConceptInput = UploadMascotConceptInputSchema.parse(input);
      assert.equal(parsed.image_data, SAMPLE_BASE64_DATA_URL);
      assert.equal(parsed.auto_matting, undefined);
      assert.equal(parsed.mime_type, undefined);
      assert.equal(parsed.name, undefined);
      assert.equal(parsed.description, undefined);
      assert.equal(parsed.color_theme, undefined);
      assert.equal(parsed.visual_style, undefined);
    });

    it("parses valid payload with raw base64 string", () => {
      const input = {
        image_data: SAMPLE_RAW_BASE64,
      };

      const parsed = UploadMascotConceptInputSchema.parse(input);
      assert.equal(parsed.image_data, SAMPLE_RAW_BASE64);
      assert.equal(parsed.auto_matting, undefined);
    });

    it("preserves auto_matting when explicitly set to false", () => {
      const input = {
        image_data: SAMPLE_BASE64_DATA_URL,
        auto_matting: false,
      };

      const parsed = UploadMascotConceptInputSchema.parse(input);
      assert.equal(parsed.auto_matting, false);
    });

    it("preserves auto_matting when explicitly set to true", () => {
      const input = {
        image_data: SAMPLE_BASE64_DATA_URL,
        auto_matting: true,
      };

      const parsed = UploadMascotConceptInputSchema.parse(input);
      assert.equal(parsed.auto_matting, true);
    });

    it("parses payload with all optional fields specified", () => {
      const input = {
        image_data: SAMPLE_BASE64_DATA_URL,
        mime_type: "image/webp" as const,
        auto_matting: false,
        name: "Astra",
        description: "A celestial guardian mascot",
        color_theme: "#8b5cf6",
        visual_style: "flat_vector" as const,
      };

      const parsed = UploadMascotConceptInputSchema.parse(input);
      assert.equal(parsed.image_data, SAMPLE_BASE64_DATA_URL);
      assert.equal(parsed.mime_type, "image/webp");
      assert.equal(parsed.auto_matting, false);
      assert.equal(parsed.name, "Astra");
      assert.equal(parsed.description, "A celestial guardian mascot");
      assert.equal(parsed.color_theme, "#8b5cf6");
      assert.equal(parsed.visual_style, "flat_vector");
    });

    it("accepts all valid mime types in MascotUploadMimeTypeSchema", () => {
      const validTypes = ["image/png", "image/jpeg", "image/webp"] as const;
      for (const mimeType of validTypes) {
        const parsed = UploadMascotConceptInputSchema.parse({
          image_data: SAMPLE_BASE64_DATA_URL,
          mime_type: mimeType,
        });
        assert.equal(parsed.mime_type, mimeType);
      }
    });

    it("rejects empty image_data", () => {
      assert.throws(
        () => UploadMascotConceptInputSchema.parse({ image_data: "" }),
        (err: unknown) => {
          assert(err instanceof Error);
          return err.message.includes("image_data");
        },
      );
    });

    it("rejects missing image_data", () => {
      assert.throws(
        () => UploadMascotConceptInputSchema.parse({}),
        (err: unknown) => {
          assert(err instanceof Error);
          return err.message.includes("image_data");
        },
      );
    });

    it("rejects invalid mime_type values", () => {
      const invalidTypes = ["image/gif", "image/bmp", "image/svg+xml", "application/octet-stream"];
      for (const invalidType of invalidTypes) {
        assert.throws(
          () =>
            UploadMascotConceptInputSchema.parse({
              image_data: SAMPLE_BASE64_DATA_URL,
              mime_type: invalidType,
            }),
          (err: unknown) => {
            assert(err instanceof Error);
            return err.message.includes("mime_type");
          },
        );
      }
    });

    it("rejects empty string name", () => {
      assert.throws(
        () =>
          UploadMascotConceptInputSchema.parse({
            image_data: SAMPLE_BASE64_DATA_URL,
            name: "",
          }),
        (err: unknown) => {
          assert(err instanceof Error);
          return err.message.includes("name");
        },
      );
    });

    it("rejects unsupported visual_style values", () => {
      assert.throws(
        () =>
          UploadMascotConceptInputSchema.parse({
            image_data: SAMPLE_BASE64_DATA_URL,
            visual_style: "non_existent_style",
          }),
        (err: unknown) => {
          assert(err instanceof Error);
          return err.message.includes("visual_style");
        },
      );
    });
  });

  describe("UploadMascotConceptResponseSchema", () => {
    it("parses valid response with complete mascot and all metadata", () => {
      const mascot = createValidMascotProfile({ concept_origin: "user_uploaded" });
      const rawResponse = {
        mascot,
        master_image_url: "https://storage.example.com/mascot_master.png",
        master_raw_image_url: "https://storage.example.com/mascot_master_raw.png",
        extracted_color: "#06b6d4",
        extracted_tags: ["cyber", "fox", "mascot"],
      };

      const parsed: UploadMascotConceptResponse = UploadMascotConceptResponseSchema.parse(rawResponse);
      assert.equal(parsed.master_image_url, "https://storage.example.com/mascot_master.png");
      assert.equal(parsed.master_raw_image_url, "https://storage.example.com/mascot_master_raw.png");
      assert.equal(parsed.extracted_color, "#06b6d4");
      assert.deepEqual(parsed.extracted_tags, ["cyber", "fox", "mascot"]);
      assert.equal(parsed.mascot.id, "mascot_test_01");
      assert.equal(parsed.mascot.concept_origin, "user_uploaded");
    });

    it("parses response with master_raw_image_url set to null", () => {
      const mascot = createValidMascotProfile();
      const rawResponse = {
        mascot,
        master_image_url: "https://storage.example.com/mascot_master.png",
        master_raw_image_url: null,
      };

      const parsed = UploadMascotConceptResponseSchema.parse(rawResponse);
      assert.equal(parsed.master_raw_image_url, null);
      assert.equal(parsed.extracted_color, undefined);
      assert.equal(parsed.extracted_tags, undefined);
    });

    it("parses response with optional fields omitted", () => {
      const mascot = createValidMascotProfile();
      const rawResponse = {
        mascot,
        master_image_url: "https://storage.example.com/mascot_master.png",
      };

      const parsed = UploadMascotConceptResponseSchema.parse(rawResponse);
      assert.equal(parsed.master_image_url, "https://storage.example.com/mascot_master.png");
      assert.equal(parsed.master_raw_image_url, undefined);
      assert.equal(parsed.extracted_color, undefined);
      assert.equal(parsed.extracted_tags, undefined);
    });

    it("rejects response when master_image_url is missing", () => {
      const mascot = createValidMascotProfile();
      assert.throws(
        () =>
          UploadMascotConceptResponseSchema.parse({
            mascot,
          }),
        (err: unknown) => {
          assert(err instanceof Error);
          return err.message.includes("master_image_url");
        },
      );
    });

    it("rejects response when mascot payload is invalid", () => {
      assert.throws(
        () =>
          UploadMascotConceptResponseSchema.parse({
            mascot: { id: "" },
            master_image_url: "https://storage.example.com/mascot_master.png",
          }),
        (err: unknown) => {
          assert(err instanceof Error);
          return err.message.includes("name");
        },
      );
    });
  });

  describe("MascotProfileSchema backwards-compatibility & concept_origin", () => {
    it("validates legacy mascot profile without concept_origin field (backwards compatibility)", () => {
      const legacyProfile = {
        id: "mascot_legacy_01",
        name: "Retro Robot",
        description: "Classic robot mascot",
        visual_style: "plastic_toy",
        master_prompt: "vintage robot character",
        master_image_url: "https://storage.example.com/legacy_master.png",
        master_raw_image_url: null,
        color_theme: "#f59e0b",
        actions: {},
        styles: [],
        assigned_channel_ids: ["channel_alpha"],
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      };

      const parsed = MascotProfileSchema.parse(legacyProfile);
      assert.equal(parsed.id, "mascot_legacy_01");
      assert.equal(parsed.concept_origin, undefined);
    });

    it("validates profile with concept_origin set to user_uploaded", () => {
      const profile = createValidMascotProfile({ concept_origin: "user_uploaded" });
      const parsed = MascotProfileSchema.parse(profile);
      assert.equal(parsed.concept_origin, "user_uploaded");
    });

    it("validates profile with concept_origin set to ai_generated", () => {
      const profile = createValidMascotProfile({ concept_origin: "ai_generated" });
      const parsed = MascotProfileSchema.parse(profile);
      assert.equal(parsed.concept_origin, "ai_generated");
    });

    it("rejects invalid concept_origin values", () => {
      const invalidProfile = {
        ...createValidMascotProfile(),
        concept_origin: "hand_painted",
      };

      assert.throws(
        () => MascotProfileSchema.parse(invalidProfile),
        (err: unknown) => {
          assert(err instanceof Error);
          return err.message.includes("concept_origin");
        },
      );
    });

    it("directly validates MascotConceptOriginSchema values", () => {
      const validOrigin1: MascotConceptOrigin = MascotConceptOriginSchema.parse("ai_generated");
      const validOrigin2: MascotConceptOrigin = MascotConceptOriginSchema.parse("user_uploaded");
      assert.equal(validOrigin1, "ai_generated");
      assert.equal(validOrigin2, "user_uploaded");

      assert.throws(() => MascotConceptOriginSchema.parse("custom_upload"));
      assert.throws(() => MascotConceptOriginSchema.parse(""));
    });

    it("directly validates MascotUploadMimeTypeSchema values", () => {
      assert.equal(MascotUploadMimeTypeSchema.parse("image/png"), "image/png");
      assert.equal(MascotUploadMimeTypeSchema.parse("image/jpeg"), "image/jpeg");
      assert.equal(MascotUploadMimeTypeSchema.parse("image/webp"), "image/webp");

      assert.throws(() => MascotUploadMimeTypeSchema.parse("image/gif"));
      assert.throws(() => MascotUploadMimeTypeSchema.parse("application/pdf"));
    });
  });
});
