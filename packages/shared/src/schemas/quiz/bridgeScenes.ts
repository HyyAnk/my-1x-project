import { z } from "zod";

export const BridgeSceneTimingConfigSchema = z
  .object({
    topicPauseSeconds: z.number().nonnegative().default(0.5),
    ctaPauseSeconds: z.number().nonnegative().default(0.5),
    preOutroPauseSeconds: z.number().nonnegative().default(0.5),
    transitionType: z.string().trim().default("brand_logo_stinger"),
    stingerDurationSeconds: z.number().nonnegative().default(1.3),
  })
  .strict();

export type BridgeSceneTimingConfig = z.infer<typeof BridgeSceneTimingConfigSchema>;

export const BridgeShowcaseItemPresentationSchema = z.enum(["die_cut_sticker", "photo_card"]);
export type BridgeShowcaseItemPresentation = z.infer<typeof BridgeShowcaseItemPresentationSchema>;

export const BridgeShowcaseItemSchema = z
  .object({
    asset_id: z.string().trim().min(1),
    subject: z.string().trim().min(1),
    presentation: BridgeShowcaseItemPresentationSchema.default("die_cut_sticker"),
    rotation_deg: z.number().min(-15).max(15).default(0),
    transparent_background: z.boolean().default(true),
    caption: z.string().trim().optional(),
    asset_path: z.string().trim().optional(),
  })
  .strict();

export type BridgeShowcaseItem = z.infer<typeof BridgeShowcaseItemSchema>;

export const BridgeSceneConfigSchema = z
  .object({
    enabled: z.boolean().default(true),
    enableTopicScene: z.boolean().default(true),
    enableCtaScene: z.boolean().default(true),
    enablePreOutroScene: z.boolean().default(true),
    timing: BridgeSceneTimingConfigSchema.default({}),
    customCtaText: z.string().trim().optional(),
    customPreOutroText: z.string().trim().optional(),
    customPreOutroHeadline: z.string().trim().optional(),
    channelDisplayName: z.string().trim().optional(),
    customBadgeText: z.string().trim().optional(),
    customSubtitleText: z.string().trim().optional(),
    visualStyle: z.string().trim().optional(),
    ctaMode: z.string().trim().optional(),
    enableShowcase: z.boolean().default(true),
    showcaseItems: z.array(BridgeShowcaseItemSchema).max(4).optional(),
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
    enableShowcase: z.boolean().optional(),
    showcaseItems: z.array(BridgeShowcaseItemSchema).max(4).optional(),
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

export const PreOutroPayloadSchema = z
  .object({
    headline: z.string().trim().default("FANTASTIC JOB!"),
    speechText: z.string().trim(),
    celebrationEffects: z.array(z.string()).default(["confetti", "bubbles", "sparkles"]),
  })
  .strict();

export type PreOutroPayload = z.infer<typeof PreOutroPayloadSchema>;
