import { z } from "zod";

export const MascotActionTypeSchema = z.enum(["idle", "wave", "thinking", "point", "celebrate", "oops", "outro"]);
export type MascotActionType = z.infer<typeof MascotActionTypeSchema>;

export const ALL_MASCOT_ACTIONS: MascotActionType[] = ["idle", "wave", "thinking", "point", "celebrate", "oops", "outro"];

export const MascotMotionPresetSchema = z.enum(["breathe", "sway", "jump", "shake", "wave", "point", "pulse", "float", "none"]);
export type MascotMotionPreset = z.infer<typeof MascotMotionPresetSchema>;

export const MascotMotionIntensitySchema = z.enum(["subtle", "normal", "dynamic"]);
export type MascotMotionIntensity = z.infer<typeof MascotMotionIntensitySchema>;

export const MascotPositionSchema = z.enum(["bottom_left", "bottom_right"]);
export type MascotPosition = z.infer<typeof MascotPositionSchema>;

export const MascotStateSchema = z.enum(["idle", "wave", "curious", "thinking", "point", "surprised", "celebrate", "encourage"]);
export type MascotState = z.infer<typeof MascotStateSchema>;

// Re-export extracted constants and utilities for 100% backward compatibility
export * from "../mascot/constants/mascotPoses.js";
export * from "../mascot/constants/mascotActionMeta.js";
export * from "../mascot/utils/mascotPoseSelector.js";
