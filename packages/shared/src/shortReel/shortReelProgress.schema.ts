import { z } from "zod";

export const ReelGenerationStageSchema = z.enum(["preflight", "script", "style", "cover", "publishing", "finalize"]);
export type ReelGenerationStage = z.infer<typeof ReelGenerationStageSchema>;

export const ReelGenerationStateSchema = z.enum(["pending", "running", "completed", "failed", "cancelled", "skipped"]);
export type ReelGenerationState = z.infer<typeof ReelGenerationStateSchema>;

export const ReelStageProgressSchema = z
  .object({
    stage: ReelGenerationStageSchema,
    state: ReelGenerationStateSchema,
    message: z.string().max(500),
  })
  .strict();
export type ReelStageProgress = z.infer<typeof ReelStageProgressSchema>;

export const ReelProgressPayloadSchema = z
  .object({
    stages: z.array(ReelStageProgressSchema).superRefine((stages, ctx) => {
      const seen = new Set<string>();
      for (let i = 0; i < stages.length; i++) {
        if (seen.has(stages[i].stage)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate stage key: ${stages[i].stage}`,
            path: [i, "stage"],
          });
        }
        seen.add(stages[i].stage);
      }
    }),
    record_revision: z.number().int().positive().nullable(),
  })
  .strict();
export type ReelProgressPayload = z.infer<typeof ReelProgressPayloadSchema>;
