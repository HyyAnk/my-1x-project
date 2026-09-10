import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";

type TestCallback = () => void | Promise<void>;

const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};

const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};
import {
  parseCompatibleShortReelRecord,
  normalizeLegacyPublishing,
  normalizeReelGenerationMode,
  ReelProgressPayloadSchema,
  GeneratedReelPublishingSchema,
  ReelPublishingPayloadSchema,
} from "../src/shortReel/index.js";
import { createSourceSnapshot } from "../src/shortReel/shortReelSource.js";

import { BankQuestionSchema } from "../src/index.js";

const validQuestion = BankQuestionSchema.parse({
  id: "bank-q-versus-001",
  archetype_id: "versus_faceoff",
  domain_id: "yard_tools",
  subtopic_id: "leaf_removal",
  language: "English",
  question: "Which yard tool is faster for clearing leaves?",
  format: "multiple_choice",
  choices: [
    { id: "A", text: "Rake", is_correct: false },
    { id: "B", text: "Leaf blower", is_correct: true },
  ],
  correct_choice_id: "B",
  explanation: "Leaf blowers move high air volume quickly.",
  age_band: "family",
  status: "approved",
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-02T00:00:00.000Z",
});

const sourceSnapshot = createSourceSnapshot(validQuestion);

const legacyV1Record = {
  schema_version: 1,
  reel_id: "sreel_legacy12345",
  channel_id: "ch_test",
  topic_id: "top_test",
  topic: {
    topic_id: "top_test",
    channel_id: "ch_test",
    title: "Yard Tool Face-off: Rake vs. Leaf Blower",
    premise: "Comparing speed of yard tools",
    hook: "Which tool wins?",
    origin: "keyword" as const,
  },
  aspect_ratio: "9:16" as const,
  source: sourceSnapshot,
  revision: 3,
  model_note: "Omni 1.1 Flash",
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T01:00:00.000Z",
  script: null,
  units: {
    references: {
      state: "ready" as const,
      last_accepted_payload: {
        references: [
          {
            asset_id: "ast_mascot",
            role: "mascot" as const,
            path: "references/mascot.png",
            mime_type: "image/png",
            width: 1080,
            height: 1920,
            checksum: "chk_m1",
          },
        ],
      },
      current_attempt: null,
    },
    script: {
      state: "missing" as const,
      last_accepted_payload: null,
      current_attempt: null,
    },
    cover: {
      state: "ready" as const,
      last_accepted_payload: {
        asset_id: "ast_cover",
        path: "cover/cover.png",
        mime_type: "image/png",
        width: 1080 as const,
        height: 1920 as const,
        checksum: "chk_c1",
      },
      current_attempt: null,
    },
    publishing: {
      state: "ready" as const,
      last_accepted_payload: {
        hook: "Which tool wins?",
        description: "Watch the comparison.",
        cta: "Share your guess.",
        hashtags: ["#Quiz", "#Tools"],
      },
      current_attempt: null,
    },
  },
};

describe("Short-Reel V1 to V2 Compatibility", () => {
  it("preserves legacy publishing and normalizes only once", () => {
    const next = parseCompatibleShortReelRecord(legacyV1Record);
    assert.strictEqual(next.schema_version, 2);
    assert.deepStrictEqual(next.units.publishing.last_accepted_payload, {
      title: "Which tool wins?",
      description: "Watch the comparison.\n\nShare your guess.\n\n#Quiz #Tools",
    });
    assert.deepStrictEqual(parseCompatibleShortReelRecord(next), next);
  });

  it("handles legacy publishing edge cases without text loss or duplicate appends", () => {
    // Existing hashtag in description
    const withExistingTag = normalizeLegacyPublishing({
      hook: "Tool Showdown",
      description: "Check out this #Quiz on garden tools.",
      cta: "Share your guess.",
      hashtags: ["#quiz", "#Tools"],
    });
    assert.strictEqual(withExistingTag.description, "Check out this #Quiz on garden tools.\n\nShare your guess.\n\n#Tools");

    // Repeated CTA already present in description
    const withRepeatedCta = normalizeLegacyPublishing({
      hook: "Tool Showdown",
      description: "Watch now. Share your guess.",
      cta: "Share your guess.",
      hashtags: ["#Quiz"],
    });
    assert.strictEqual(withRepeatedCta.description, "Watch now. Share your guess.\n\n#Quiz");

    // Empty / null CTA
    const withNullCta = normalizeLegacyPublishing({
      hook: "Tool Showdown",
      description: "Watch now.",
      cta: null,
      hashtags: ["#Tools"],
    });
    assert.strictEqual(withNullCta.description, "Watch now.\n\n#Tools");

    // 500-character hook
    const longHook = "A".repeat(500);
    const withLongHook = normalizeLegacyPublishing({
      hook: longHook,
      description: "Short desc",
      cta: null,
      hashtags: [],
    });
    assert.strictEqual(withLongHook.title, longHook);
    assert.strictEqual(ReelPublishingPayloadSchema.parse(withLongHook).title, longHook);

    // Case-insensitive duplicate hashtags
    const withDuplicateTags = normalizeLegacyPublishing({
      hook: "Tool Showdown",
      description: "Overview",
      cta: null,
      hashtags: ["#Quiz", "#quiz", "#QUIZ", "#Tools"],
    });
    assert.strictEqual(withDuplicateTags.description, "Overview\n\n#Quiz #Tools");
  });

  it("enforces separate generation bounds from persistence bounds", () => {
    // Persistence allows up to 500 title and 8000 desc
    const largePayload = {
      title: "T".repeat(450),
      description: "D".repeat(5000),
    };
    assert.deepStrictEqual(ReelPublishingPayloadSchema.parse(largePayload), largePayload);

    // Generation schema rejects title > 80 or description > 600
    assert.throws(() => GeneratedReelPublishingSchema.parse(largePayload));

    const validGenerated = {
      title: "Rake vs Leaf Blower",
      description: "Fast yard tool showdown! Which one is better? #quiz #tools",
    };
    assert.deepStrictEqual(GeneratedReelPublishingSchema.parse(validGenerated), validGenerated);
  });

  it("marks legacy visual/publishing units as stale and sets accepted_dependency_fingerprint to null", () => {
    const next = parseCompatibleShortReelRecord(legacyV1Record);
    assert.strictEqual(next.units.references.state, "stale");
    assert.strictEqual(next.units.references.accepted_dependency_fingerprint, null);
    assert.strictEqual(next.units.cover.state, "stale");
    assert.strictEqual(next.units.cover.accepted_dependency_fingerprint, null);
    assert.strictEqual(next.units.publishing.state, "stale");
    assert.strictEqual(next.units.publishing.accepted_dependency_fingerprint, null);
    assert.strictEqual(next.visual_context, null);
  });

  it("rejects unknown schema version and invalid v2 records", () => {
    assert.throws(() => parseCompatibleShortReelRecord({ ...legacyV1Record, schema_version: 99 }));
    assert.throws(() => parseCompatibleShortReelRecord({ ...legacyV1Record, schema_version: 2, invalid_prop: 123 }));
  });

  it("normalizes generation mode correctly", () => {
    assert.strictEqual(normalizeReelGenerationMode("package", undefined), "repair");
    assert.strictEqual(normalizeReelGenerationMode("cover", undefined), "regenerate");
    assert.strictEqual(normalizeReelGenerationMode("package", "regenerate"), "regenerate");
    assert.strictEqual(normalizeReelGenerationMode("script", "repair"), "repair");
  });

  it("validates ReelProgressPayloadSchema rejecting duplicate stage keys", () => {
    const valid = {
      stages: [
        { stage: "preflight" as const, state: "completed" as const, message: "Checked" },
        { stage: "script" as const, state: "running" as const, message: "Generating" },
      ],
      record_revision: 2,
    };
    assert.deepStrictEqual(ReelProgressPayloadSchema.parse(valid), valid);

    const duplicate = {
      stages: [
        { stage: "preflight" as const, state: "completed" as const, message: "Checked" },
        { stage: "preflight" as const, state: "running" as const, message: "Again" },
      ],
      record_revision: 2,
    };
    assert.throws(() => ReelProgressPayloadSchema.parse(duplicate));
  });
});
