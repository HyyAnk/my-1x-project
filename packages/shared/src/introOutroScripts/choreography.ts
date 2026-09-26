import { z } from "zod";

export const ScriptChoreographySchema = z
  .object({
    primary_action: z.enum(["arrival", "reveal", "present", "react", "celebrate", "hold", "nod", "wave", "point", "smile"]),
    expression: z.string().trim().min(1).max(70),
    secondary_motion: z.enum(["none", "natural_follow_through"]),
    end_pose: z.enum(["front_facing", "three_quarter", "open_hand", "relaxed"]),
  })
  .strict();

export type ScriptChoreography = z.infer<typeof ScriptChoreographySchema>;
