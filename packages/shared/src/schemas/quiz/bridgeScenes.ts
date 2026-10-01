import { z } from "zod";

export const BridgeSceneTimingConfigSchema = z
  .object({
    topicPauseSeconds: z.number().nonnegative().default(0.5),
    ctaPauseSeconds: z.number().nonnegative().default(0.5),
    transitionType: z.string().trim().default("brand_logo_stinger"),
    stingerDurationSeconds: z.number().nonnegative().default(1.3),
  })
  .strict();

export type BridgeSceneTimingConfig = z.infer<typeof BridgeSceneTimingConfigSchema>;

export const BridgeSceneConfigSchema = z
  .object({
    enabled: z.boolean().default(true),
    enableTopicScene: z.boolean().default(true),
    enableCtaScene: z.boolean().default(true),
    timing: BridgeSceneTimingConfigSchema.default({}),
    customCtaText: z.string().trim().optional(),
    channelDisplayName: z.string().trim().optional(),
    customBadgeText: z.string().trim().optional(),
    customSubtitleText: z.string().trim().optional(),
    visualStyle: z.string().trim().optional(),
    ctaMode: z.string().trim().optional(),
  })
  .strict();

export type BridgeSceneConfig = z.infer<typeof BridgeSceneConfigSchema>;

export const BridgeTopicPayloadSchema = z
  .object({
    topic: z.string().trim().min(1),
    questionCount: z.number().int().positive(),
    theme: z.string().trim().optional(),
    subtitle: z.string().trim().optional(),
    badgeText: z.string().trim().optional(),
    mascotAction: z.string().trim().optional(),
    visualStyle: z.string().trim().optional(),
  })
  .strict();

export type BridgeTopicPayload = z.infer<typeof BridgeTopicPayloadSchema>;

export const BridgeCtaButtonStateSchema = z.enum(["idle", "clicking", "subscribed"]);
export type BridgeCtaButtonState = z.infer<typeof BridgeCtaButtonStateSchema>;

export const BridgeCtaPayloadSchema = z
  .object({
    channelName: z.string().trim().min(1),
    buttonState: BridgeCtaButtonStateSchema.default("idle"),
    hasBell: z.boolean().default(true),
    customText: z.string().trim().optional(),
    ctaMode: z.enum(["hero_action", "classic"]).optional().default("hero_action"),
    minimalBranding: z.boolean().optional().default(true),
    subscribersCount: z.string().trim().optional(),
    avatarInitial: z.string().trim().optional(),
  })
  .strict();

export type BridgeCtaPayload = z.infer<typeof BridgeCtaPayloadSchema>;
