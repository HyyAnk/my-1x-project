import { z } from "zod";
import { IsoDate } from "../common.js";

export const VoiceUsageMetricsSchema = z.object({
  rendered_characters: z.number().int().nonnegative().default(0),
  rendered_duration_seconds: z.number().nonnegative().default(0),
  rendered_segments_count: z.number().int().nonnegative().default(0),
  rendered_episodes_count: z.number().int().nonnegative().default(0),
  estimated_savings_usd: z.number().nonnegative().default(0),
});
export type VoiceUsageMetrics = z.infer<typeof VoiceUsageMetricsSchema>;

export const ImageUsageMetricsSchema = z.object({
  total_images_generated: z.number().int().nonnegative().default(0),
  estimated_cost_vnd: z.number().nonnegative().default(0),
  estimated_cost_usd: z.number().nonnegative().default(0),
  by_provider: z.record(z.string(), z.number().int().nonnegative()).default({}),
  by_model: z.record(z.string(), z.number().int().nonnegative()).default({}),
});
export type ImageUsageMetrics = z.infer<typeof ImageUsageMetricsSchema>;

export const UsageLedgerEventTypeSchema = z.enum([
  "voice_render",
  "image_generation",
  "legacy_reconcile",
  "custom",
]);
export type UsageLedgerEventType = z.infer<typeof UsageLedgerEventTypeSchema>;

export const UsageLedgerEventSchema = z.object({
  id: z.string(),
  timestamp: IsoDate,
  type: UsageLedgerEventTypeSchema,
  channel_id: z.string().optional(),
  episode_id: z.string().optional(),
  details: z.object({
    characters: z.number().optional(),
    duration_seconds: z.number().optional(),
    segments_count: z.number().optional(),
    provider: z.string().optional(),
    model: z.string().optional(),
    image_count: z.number().optional(),
    cost_usd: z.number().optional(),
    cost_vnd: z.number().optional(),
    note: z.string().optional(),
  }),
});
export type UsageLedgerEvent = z.infer<typeof UsageLedgerEventSchema>;

export const UsageLedgerSchema = z.object({
  version: z.number().int().positive().default(1),
  created_at: IsoDate,
  updated_at: IsoDate,
  voice: VoiceUsageMetricsSchema.default({
    rendered_characters: 0,
    rendered_duration_seconds: 0,
    rendered_segments_count: 0,
    rendered_episodes_count: 0,
    estimated_savings_usd: 0,
  }),
  image: ImageUsageMetricsSchema.default({
    total_images_generated: 0,
    estimated_cost_vnd: 0,
    estimated_cost_usd: 0,
    by_provider: {},
    by_model: {},
  }),
  recent_events: z.array(UsageLedgerEventSchema).default([]),
});
export type UsageLedger = z.infer<typeof UsageLedgerSchema>;
