import { z } from "zod";

export const SegmentIndexSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const SegmentModeSchema = z.enum(["generate", "extend"]);

export const TextCueRoleSchema = z.enum(["question", "answer", "supporting"]);

export const TextCueSchema = z
  .object({
    role: TextCueRoleSchema,
    text: z.string().min(1).max(500),
    start_seconds: z.number().finite().min(0),
    end_seconds: z.number().finite().min(0),
  })
  .strict()
  .superRefine((cue, ctx) => {
    if (cue.start_seconds >= cue.end_seconds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "start_seconds must be strictly less than end_seconds",
        path: ["end_seconds"],
      });
    }
  });

export const ContinuityStateSchema = z
  .object({
    character_identity: z.string().min(1).max(200),
    position: z.string().min(1).max(300),
    action: z.string().min(1).max(300),
    camera: z.string().min(1).max(300),
    environment: z.string().min(1).max(300),
    props: z.array(z.string().min(1).max(100)),
    visible_text: z.array(z.string().min(1).max(300)),
    revealed_facts: z.array(z.string().min(1).max(300)),
  })
  .strict();

export const ReelSegmentSchema = z
  .object({
    index: SegmentIndexSchema,
    mode: SegmentModeSchema,
    duration_seconds: z.number().finite().min(8).max(10),
    narrative: z.string().min(1).max(1000),
    text_cues: z.array(TextCueSchema),
    audio_direction: z.string().min(1).max(500),
    start_state: ContinuityStateSchema,
    end_state: ContinuityStateSchema,
  })
  .strict()
  .superRefine((seg, ctx) => {
    if (seg.index === 1 && seg.mode !== "generate") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Segment 1 must use mode 'generate'",
        path: ["mode"],
      });
    }
    if (seg.index !== 1 && seg.mode !== "extend") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Segment ${seg.index} must use mode 'extend'`,
        path: ["mode"],
      });
    }
    for (let i = 0; i < seg.text_cues.length; i++) {
      const cue = seg.text_cues[i];
      if (cue.end_seconds > seg.duration_seconds) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Text cue end (${cue.end_seconds}s) exceeds segment duration (${seg.duration_seconds}s)`,
          path: ["text_cues", i, "end_seconds"],
        });
      }
    }
  });

export type SegmentIndex = z.infer<typeof SegmentIndexSchema>;
export type SegmentMode = z.infer<typeof SegmentModeSchema>;
export type TextCueRole = z.infer<typeof TextCueRoleSchema>;
export type TextCue = z.infer<typeof TextCueSchema>;
export type ContinuityState = z.infer<typeof ContinuityStateSchema>;
export type ReelSegment = z.infer<typeof ReelSegmentSchema>;
