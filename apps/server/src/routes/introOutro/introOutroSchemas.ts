import { z } from "zod";
import { findBuiltInPresetById, getTransition, isValidTransition } from "@studio/shared";

export const CreateIntroOutroStyleInputSchema = z
  .object({
    name: z.string().min(1).max(50),
    style_id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
    style_preset_id: z.string().min(1).optional(),
    transition_type: z.string().min(1).default("stinger_swipe"),
    transition_duration_seconds: z.number().min(0).max(1.5).optional(),
    audio_mode: z.enum(["use_video_audio", "overlay_bgm"]).default("use_video_audio"),
    intro_data: z.string().min(1),
    outro_data: z.string().min(1),
    intro_filename: z.string().default("intro.mp4"),
    outro_filename: z.string().default("outro.mp4"),
  })
  .superRefine((data, context) => {
    if (data.style_preset_id && !findBuiltInPresetById(data.style_preset_id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown built-in style preset '${data.style_preset_id}'`,
        path: ["style_preset_id"],
      });
    }
    if (!isValidTransition(data.transition_type, "intro_outro") && !isValidTransition(data.transition_type)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid or unregistered transition type '${data.transition_type}' for intro/outro`,
        path: ["transition_type"],
      });
      return;
    }
    const transition = getTransition(data.transition_type);
    const duration = data.transition_duration_seconds ?? transition?.defaultDuration;
    if (transition && duration !== undefined && (duration < transition.minDuration || duration > transition.maxDuration)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Transition duration ${duration}s is out of range [${transition.minDuration}s, ${transition.maxDuration}s] for transition '${transition.name}'`,
        path: ["transition_duration_seconds"],
      });
    }
  })
  .transform((data) => ({
    ...data,
    transition_duration_seconds: data.transition_duration_seconds ?? getTransition(data.transition_type)?.defaultDuration ?? 0.5,
  }));

export const UpdateIntroOutroStyleInputSchema = z
  .object({
    style_preset_id: z.string().min(1).optional(),
    status: z.enum(["active", "disabled"]).optional(),
  })
  .refine((value) => value.style_preset_id !== undefined || value.status !== undefined, "No update supplied");

export const SetDefaultIntroOutroStyleInputSchema = z.object({
  style_id: z.string().nullable(),
});
