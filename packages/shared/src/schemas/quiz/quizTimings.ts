import { z } from "zod";
import { IsoDate } from "../common.js";

export const QuizStageTimingItemSchema = z.object({
  started_at: IsoDate.optional(),
  completed_at: IsoDate.optional().nullable(),
  duration_seconds: z.number().nonnegative(),
  parallel_group: z.string().optional().nullable(),
  parallel_total_seconds: z.number().nonnegative().optional().nullable(),
});

export type QuizStageTimingItem = z.infer<typeof QuizStageTimingItemSchema>;

export const QuizStageTimingsSchema = z.object({
  schema_version: z.literal(1).default(1),
  episode_id: z.string().optional(),
  stages: z.record(z.string(), QuizStageTimingItemSchema).default({}).optional(),
  parallel_groups: z
    .record(
      z.string(),
      z.object({
        stages: z.array(z.string()),
        duration_seconds: z.number().nonnegative(),
      }),
    )
    .default({})
    .optional(),
  total_duration_seconds: z.number().nonnegative().optional(),
  updated_at: IsoDate.optional(),
});

export type QuizStageTimings = z.infer<typeof QuizStageTimingsSchema>;
