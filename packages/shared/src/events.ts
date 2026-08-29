import { z } from "zod";

import { type EngineId, TaskStatusSchema, TaskTypeSchema } from "./enums.js";

const IsoDate = z.string().datetime({ offset: true });

export const QuizTimelineEventTypeSchema = z.enum([
  "background.enter",
  "background.motion",
  "question.enter",
  "choices.enter",
  "countdown.start",
  "countdown.tick",
  "answer.reveal",
  "answer.dim_wrong",
  "mascot.state",
  "reward.play",
  "sfx.play",
  "music.state",
  "narration.segment",
  "fact.enter",
  "transition.start",
]);

export type QuizTimelineEventType = z.infer<typeof QuizTimelineEventTypeSchema>;

export const QuizTimelineEventSchema = z.object({
  event_id: z.string().min(1),
  type: QuizTimelineEventTypeSchema,
  at_seconds: z.number().nonnegative(),
  duration_seconds: z.number().nonnegative().default(0),
  question_id: z.string().nullable().default(null),
  choice_id: z.string().nullable().default(null),
  segment_id: z.string().nullable().default(null),
  payload: z.record(z.unknown()).default({}),
});

export type QuizTimelineEvent = z.infer<typeof QuizTimelineEventSchema>;

export const QuizTimelineSchema = z
  .object({
    schema_version: z.literal(2),
    episode_id: z.string().min(1),
    duration_seconds: z.number().positive(),
    events: QuizTimelineEventSchema.array().min(1),
  })
  .superRefine((timeline, ctx) => {
    if (new Set(timeline.events.map((event) => event.event_id)).size !== timeline.events.length)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["events"], message: "Timeline event IDs must be unique" });
    for (let index = 1; index < timeline.events.length; index += 1) {
      if (timeline.events[index].at_seconds < timeline.events[index - 1].at_seconds)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["events", index, "at_seconds"],
          message: "Timeline events must be ordered by timestamp",
        });
    }
    const end = Math.max(...timeline.events.map((event) => event.at_seconds + event.duration_seconds));
    if (end > timeline.duration_seconds + 0.001)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["duration_seconds"], message: "Timeline duration must cover every event" });
  });

export type QuizTimeline = z.infer<typeof QuizTimelineSchema>;

export const TaskSchema = z.object({
  task_id: z.string().min(1),
  task_type: TaskTypeSchema,
  channel_id: z.string().min(1),
  episode_id: z.string().nullable(),
  status: TaskStatusSchema,
  created_at: IsoDate,
  started_at: IsoDate.nullable().default(null),
  completed_at: IsoDate.nullable().default(null),
  codex_thread_id: z.string().nullable().default(null),
  codex_turn_id: z.string().nullable().default(null),
  error: z.string().nullable().default(null),
  output_files: z.array(z.string()).default([]),
  lock_key: z.string().min(1),
  queue_position: z.number().int().nonnegative().nullable().default(null),
  progress_message: z.string().default(""),
  progress_percent: z.number().min(0).max(100).nullable().default(null),
  scene_number: z.number().int().positive().nullable().default(null),
  accumulated_duration_seconds: z.number().nonnegative().default(0),
});

export type Task = z.infer<typeof TaskSchema>;

export type TaskEvent = {
  type: "task.updated" | "codex.status" | "antigravity.status" | "engine.status" | "approval.requested" | "system";
  task?: Task;
  engine?: EngineId;
  status?: "connected" | "disconnected" | "unavailable" | "connecting";
  message?: string;
  request_id?: number;
  approval?: { kind: string; reason?: string; command?: string; cwd?: string };
};
