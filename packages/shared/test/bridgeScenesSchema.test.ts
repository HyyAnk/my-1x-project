import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BridgeSceneConfigSchema,
  BridgeSceneTimingConfigSchema,
  BridgeTopicPayloadSchema,
  BridgeCtaPayloadSchema,
  QuizTimelineEventTypeSchema,
  VoiceSegmentRoleSchema,
  DEFAULT_QUIZ_VOICE_TEMPO_BY_ROLE,
  ChannelSchema,
} from "../src/index.js";

describe("Bridge Scenes & Pacing Schemas (Stage 1)", () => {
  it("validates VoiceSegmentRoleSchema contains intro_topic, intro_cta, and pre_outro", () => {
    assert.equal(VoiceSegmentRoleSchema.parse("intro_topic"), "intro_topic");
    assert.equal(VoiceSegmentRoleSchema.parse("intro_cta"), "intro_cta");
    assert.equal(VoiceSegmentRoleSchema.parse("pre_outro"), "pre_outro");
    assert.equal(DEFAULT_QUIZ_VOICE_TEMPO_BY_ROLE.intro_topic, 1.12);
    assert.equal(DEFAULT_QUIZ_VOICE_TEMPO_BY_ROLE.intro_cta, 1.12);
    assert.equal(DEFAULT_QUIZ_VOICE_TEMPO_BY_ROLE.pre_outro, 1.12);
  });

  it("validates QuizTimelineEventTypeSchema contains bridge and pre_outro event types", () => {
    assert.equal(QuizTimelineEventTypeSchema.parse("bridge.topic.enter"), "bridge.topic.enter");
    assert.equal(QuizTimelineEventTypeSchema.parse("bridge.cta.enter"), "bridge.cta.enter");
    assert.equal(QuizTimelineEventTypeSchema.parse("pre_outro.enter"), "pre_outro.enter");
  });

  it("validates BridgeSceneTimingConfigSchema default values", () => {
    const timing = BridgeSceneTimingConfigSchema.parse({});
    assert.equal(timing.topicPauseSeconds, 0.5);
    assert.equal(timing.ctaPauseSeconds, 0.5);
    assert.equal(timing.transitionType, "brand_logo_stinger");
    assert.equal(timing.stingerDurationSeconds, 1.3);
  });

  it("validates BridgeSceneConfigSchema default values", () => {
    const config = BridgeSceneConfigSchema.parse({});
    assert.equal(config.enabled, true);
    assert.equal(config.enableTopicScene, true);
    assert.equal(config.enableCtaScene, true);
    assert.equal(config.timing.topicPauseSeconds, 0.5);
    assert.equal(config.timing.ctaPauseSeconds, 0.5);
    assert.equal(config.timing.transitionType, "brand_logo_stinger");
    assert.equal(config.timing.stingerDurationSeconds, 1.3);
    assert.equal(config.customBadgeText, undefined);
    assert.equal(config.customSubtitleText, undefined);
  });

  it("validates BridgeTopicPayloadSchema with extended properties", () => {
    const payload = BridgeTopicPayloadSchema.parse({
      topic: "Global Fashion Mystery",
      questionCount: 8,
      theme: "candy_arcade",
      subtitle: "Can you score 8/8?",
      badgeText: "TODAY'S SPECIAL",
      mascotAction: "cheer",
      visualStyle: "arcade_pop",
    });
    assert.equal(payload.topic, "Global Fashion Mystery");
    assert.equal(payload.questionCount, 8);
    assert.equal(payload.theme, "candy_arcade");
    assert.equal(payload.subtitle, "Can you score 8/8?");
    assert.equal(payload.badgeText, "TODAY'S SPECIAL");
    assert.equal(payload.mascotAction, "cheer");
    assert.equal(payload.visualStyle, "arcade_pop");

    assert.throws(() => BridgeTopicPayloadSchema.parse({ topic: "", questionCount: 0 }));
  });

  it("validates BridgeCtaPayloadSchema", () => {
    const payload = BridgeCtaPayloadSchema.parse({
      channelName: "Felix Quiz",
    });
    assert.equal(payload.channelName, "Felix Quiz");
    assert.equal(payload.buttonState, "idle");
    assert.equal(payload.hasBell, true);
    assert.equal(payload.ctaMode, "hero_action");
    assert.equal(payload.minimalBranding, true);

    const clickedPayload = BridgeCtaPayloadSchema.parse({
      channelName: "Felix Quiz",
      buttonState: "subscribed",
      ctaMode: "classic",
      minimalBranding: false,
      subscribersCount: "100K",
    });
    assert.equal(clickedPayload.buttonState, "subscribed");
    assert.equal(clickedPayload.ctaMode, "classic");
    assert.equal(clickedPayload.minimalBranding, false);
    assert.equal(clickedPayload.subscribersCount, "100K");
  });

  it("ensures ChannelSchema parses with default bridge_scene_config", () => {
    const channel = ChannelSchema.parse({
      channel_id: "ch_123",
      slug: "felix",
      display_name: "Felix",
      channel_dna_path: "channels/felix/dna.md",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    assert.ok(channel.bridge_scene_config);
    assert.equal(channel.bridge_scene_config.enabled, true);
    assert.equal(channel.bridge_scene_config.timing.topicPauseSeconds, 0.5);
  });
});
