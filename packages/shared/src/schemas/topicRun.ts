import { z } from "zod";
import { TopicCandidateSchema } from "./channel.js";
import { TopicSourceBindingSetSchema, TopicSourceShortageSchema } from "./topicSourceBinding.js";

export const TopicRunCandidateSchema = z
  .object({
    slot_id: z.string().trim().min(1),
    source_bindings: TopicSourceBindingSetSchema,
  })
  .and(TopicCandidateSchema)
  .superRefine((candidate, ctx) => {
    const expectedCount = candidate.content_kind === "short_reel" ? 1 : candidate.question_count;
    if (candidate.source_bindings.length !== expectedCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source_bindings"],
        message: `${candidate.content_kind} candidates require exactly ${expectedCount} source binding(s)`,
      });
    }
  });
export type TopicRunCandidate = z.infer<typeof TopicRunCandidateSchema>;

export const TopicRunResultSchema = z
  .object({
    run_id: z.string().trim().min(1),
    target_episode_count: z.number().int().nonnegative().default(3),
    target_short_reel_count: z.number().int().nonnegative().default(2),
    candidates: z.array(TopicRunCandidateSchema),
    shortages: z.array(TopicSourceShortageSchema).default([]),
  })
  .strict();
export type TopicRunResult = z.infer<typeof TopicRunResultSchema>;
