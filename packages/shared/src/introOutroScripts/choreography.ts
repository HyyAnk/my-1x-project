import { z } from "zod";

export const ScriptChoreographySchema = z
  .object({
    primary_action: z
      .enum([
        "arrival",
        "reveal",
        "present",
        "react",
        "celebrate",
        "hold",
        "nod",
        "wave",
        "point",
        "smile",
        "dive",
        "slide",
        "bounce",
        "chase",
        "peek",
        "interact",
        "superhero_land",
        "stumble",
      ])
      .or(z.string())
      .default(""),
    expression: z.string().trim().default(""),
    secondary_motion: z
      .enum(["none", "natural_follow_through", "bouncy_idle", "tail_wag", "wing_flutter", "anticipation_recoil"])
      .or(z.string())
      .default(""),
    end_pose: z
      .enum(["front_facing", "three_quarter", "open_hand", "relaxed", "hero_landing", "action_ready", "dynamic_point", "playful_crouch"])
      .or(z.string())
      .default(""),
  })
  .strict();

export type ScriptChoreography = z.infer<typeof ScriptChoreographySchema>;
