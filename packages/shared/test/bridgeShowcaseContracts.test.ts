import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  QuizAssetPurposeSchema,
  BridgeShowcaseItemPresentationSchema,
  BridgeShowcaseItemSchema,
  BridgeTopicPayloadSchema,
  BridgeSceneConfigSchema,
} from "../src/index.js";

describe("Bridge Showcase Items Contracts (Phase 1)", () => {
  it("validates QuizAssetPurposeSchema includes bridge_topic_item", () => {
    assert.equal(QuizAssetPurposeSchema.parse("bridge_topic_item"), "bridge_topic_item");
    assert.equal(QuizAssetPurposeSchema.parse("hero_question_image"), "hero_question_image");
    assert.equal(QuizAssetPurposeSchema.parse("answer_option"), "answer_option");
  });

  it("validates BridgeShowcaseItemPresentationSchema values", () => {
    assert.equal(BridgeShowcaseItemPresentationSchema.parse("die_cut_sticker"), "die_cut_sticker");
    assert.equal(BridgeShowcaseItemPresentationSchema.parse("photo_card"), "photo_card");
    assert.throws(() => BridgeShowcaseItemPresentationSchema.parse("unknown_mode"));
  });

  it("validates BridgeShowcaseItemSchema with default values", () => {
    const parsed = BridgeShowcaseItemSchema.parse({
      asset_id: "asset-bridge-item-1",
      subject: "Angel Wings Golden Cross",
    });

    assert.equal(parsed.asset_id, "asset-bridge-item-1");
    assert.equal(parsed.subject, "Angel Wings Golden Cross");
    assert.equal(parsed.presentation, "die_cut_sticker");
    assert.equal(parsed.rotation_deg, 0);
    assert.equal(parsed.transparent_background, true);
    assert.equal(parsed.caption, undefined);
  });

  it("validates BridgeShowcaseItemSchema with custom values", () => {
    const parsed = BridgeShowcaseItemSchema.parse({
      asset_id: "asset-bridge-item-2",
      subject: "Christ at Sunset",
      presentation: "photo_card",
      rotation_deg: -3,
      transparent_background: false,
      caption: "Sacred Sunset",
      asset_path: "./quiz-images/asset-bridge-item-2.webp",
    });

    assert.equal(parsed.asset_id, "asset-bridge-item-2");
    assert.equal(parsed.presentation, "photo_card");
    assert.equal(parsed.rotation_deg, -3);
    assert.equal(parsed.transparent_background, false);
    assert.equal(parsed.caption, "Sacred Sunset");
    assert.equal(parsed.asset_path, "./quiz-images/asset-bridge-item-2.webp");
  });

  it("validates rotation_deg boundary constraints in BridgeShowcaseItemSchema", () => {
    assert.throws(() =>
      BridgeShowcaseItemSchema.parse({
        asset_id: "asset-1",
        subject: "Item",
        rotation_deg: -20, // out of [-15, 15] bounds
      }),
    );
    assert.throws(() =>
      BridgeShowcaseItemSchema.parse({
        asset_id: "asset-1",
        subject: "Item",
        rotation_deg: 20, // out of [-15, 15] bounds
      }),
    );
  });

  it("validates BridgeTopicPayloadSchema accepting 4 showcase items", () => {
    const payload = BridgeTopicPayloadSchema.parse({
      topic: "General Knowledge Christ Quiz",
      questionCount: 10,
      showcaseItems: [
        { asset_id: "asset-bridge-1", subject: "Angel Cross", presentation: "die_cut_sticker", rotation_deg: -2 },
        { asset_id: "asset-bridge-2", subject: "Portrait of Christ", presentation: "photo_card", rotation_deg: 1 },
        { asset_id: "asset-bridge-3", subject: "Sunset Crucifix", presentation: "photo_card", rotation_deg: -3 },
        { asset_id: "asset-bridge-4", subject: "Cartoon Avatar", presentation: "die_cut_sticker", rotation_deg: 2 },
      ],
    });

    assert.equal(payload.topic, "General Knowledge Christ Quiz");
    assert.equal(payload.showcaseItems?.length, 4);
    assert.equal(payload.showcaseItems?.[0]?.presentation, "die_cut_sticker");
    assert.equal(payload.showcaseItems?.[1]?.presentation, "photo_card");
  });

  it("validates BridgeTopicPayloadSchema rejects more than 4 showcase items", () => {
    assert.throws(() =>
      BridgeTopicPayloadSchema.parse({
        topic: "Topic",
        questionCount: 5,
        showcaseItems: [
          { asset_id: "asset-1", subject: "Item 1" },
          { asset_id: "asset-2", subject: "Item 2" },
          { asset_id: "asset-3", subject: "Item 3" },
          { asset_id: "asset-4", subject: "Item 4" },
          { asset_id: "asset-5", subject: "Item 5" },
        ],
      }),
    );
  });

  it("maintains 100% backward compatibility when showcaseItems is omitted", () => {
    const legacyPayload = BridgeTopicPayloadSchema.parse({
      topic: "Bible Trivia",
      questionCount: 8,
    });
    assert.equal(legacyPayload.showcaseItems, undefined);

    const legacyConfig = BridgeSceneConfigSchema.parse({});
    assert.equal(legacyConfig.showcaseItems, undefined);
  });
});
