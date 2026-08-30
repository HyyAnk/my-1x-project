import { MASCOT_ACTION_META, type MascotActionType, type QuizImageStyle } from "@studio/shared";

export const STYLE_OPTIONS: { id: QuizImageStyle; title: string }[] = [
  { id: "pixar_3d", title: "3D Pixar" },
  { id: "kawaii_chibi", title: "Kawaii Chibi" },
  { id: "flat_vector", title: "Flat Vector" },
  { id: "natural_realism", title: "Realism" },
  { id: "plastic_toy", title: "Plastic Toy" },
];

export const COLOR_PRESETS = [
  { name: "Cyan Wave", hex: "#06b6d4" },
  { name: "Sunset Coral", hex: "#ff6b4a" },
  { name: "Emerald Mint", hex: "#10b981" },
  { name: "Golden Amber", hex: "#f59e0b" },
  { name: "Royal Violet", hex: "#8b5cf6" },
  { name: "Berry Pink", hex: "#f43f5e" },
];

export const QUICK_PROMPT_TAGS = [
  "Sparkling big eyes",
  "Cute chibi proportions",
  "Volumetric soft lighting",
  "Fluffy texture",
  "Friendly expression",
  "Sharp clean silhouette",
  "Solid white background",
  "Vibrant colors",
];

export const PROMPT_TEMPLATES = [
  {
    nameKey: "mascots.presetOwl",
    name: "Milo the Explorer",
    prompt:
      "Cute wise baby owl with big sparkling eyes and small red glasses, fluffy soft feathers, wearing a tiny yellow bowtie, friendly and enthusiastic expression, sharp clean silhouette, solid seamless background",
    style: "pixar_3d" as QuizImageStyle,
    color: "#06b6d4",
  },
  {
    nameKey: "mascots.presetDino",
    name: "Bingo the Dino",
    prompt:
      "Adorable playful baby green dinosaur with tiny soft wings and round cute belly, joyful smiling expression, big anime eyes, wearing small sneakers, solid white background, vibrant lighting",
    style: "pixar_3d" as QuizImageStyle,
    color: "#10b981",
  },
  {
    nameKey: "mascots.presetRobot",
    name: "Bolt the Bot",
    prompt:
      "Futuristic cute mini companion robot mascot, glossy white ceramic shell, glowing heart-shaped LED screen face, energetic hovering pose with tiny thruster sparks, solid clean background",
    style: "plastic_toy" as QuizImageStyle,
    color: "#8b5cf6",
  },
  {
    nameKey: "mascots.presetFox",
    name: "Felix the Fox",
    prompt:
      "Clever adventurous chibi fox cub with oversized bushy tail, warm orange coat with cream chest, curious sparkling eyes, wearing tiny aviator goggles on forehead, playful dynamic pose",
    style: "kawaii_chibi" as QuizImageStyle,
    color: "#ff6b4a",
  },
];

export function getLocalizedActionMeta(
  action: MascotActionType | string | null | undefined,
  t: (path: string, params?: Record<string, string | number>) => string,
) {
  const safeAction = action && MASCOT_ACTION_META[action as MascotActionType] ? (action as MascotActionType) : "idle";
  const base = MASCOT_ACTION_META[safeAction] || {
    labelKey: "mascots.actionIdle",
    descKey: "mascots.actionIdleDesc",
    usageKey: "mascots.actionIdleUsage",
    icon: "✨",
    defaultFps: 8,
    defaultFrames: 1,
  };
  const cap = safeAction.charAt(0).toUpperCase() + safeAction.slice(1);
  return {
    label: t(`mascots.action${cap}`) || safeAction,
    description: t(`mascots.action${cap}Desc`) || "",
    usage: t(`mascots.action${cap}Usage`) || "",
    icon: base.icon || "✨",
    defaultFps: base.defaultFps || 8,
    defaultFrames: base.defaultFrames || 1,
  };
}

export const CORE_GAMEPLAY_ACTIONS: MascotActionType[] = ["thinking", "celebrate"];
export const BRAND_IDENTITY_ACTIONS: MascotActionType[] = ["wave", "outro"];
export const AUXILIARY_ACTIONS: MascotActionType[] = ["idle", "point", "oops"];

export type MascotMotionPreset = "breathe" | "sway" | "jump" | "shake" | "wave" | "point" | "pulse" | "float" | "none";

export interface MotionPresetMeta {
  id: MascotMotionPreset;
  label: string;
  subtitle: string;
  icon: string;
  recommendedFor?: MascotActionType[];
}

export const MOTION_PRESETS: MotionPresetMeta[] = [
  { id: "breathe", label: "Breathe", subtitle: "Gentle breathing", icon: "🌬️", recommendedFor: ["idle", "thinking"] },
  { id: "sway", label: "Sway", subtitle: "Playful sway", icon: "🌊", recommendedFor: ["idle", "outro"] },
  { id: "jump", label: "Jump", subtitle: "Energetic hop", icon: "⚡", recommendedFor: ["celebrate"] },
  { id: "shake", label: "Shake", subtitle: "Wobble & tremor", icon: "💫", recommendedFor: ["oops"] },
  { id: "wave", label: "Wave", subtitle: "Floating wave", icon: "👋", recommendedFor: ["wave", "outro"] },
  { id: "pulse", label: "Pulse", subtitle: "Dynamic pop", icon: "💓", recommendedFor: ["point", "thinking"] },
  { id: "float", label: "Float", subtitle: "Weightless drift", icon: "🎈", recommendedFor: ["idle"] },
  { id: "none", label: "Static", subtitle: "No motion", icon: "⏹️" },
];

export const DEFAULT_ACTION_MOTIONS: Record<MascotActionType, MascotMotionPreset> = {
  idle: "breathe",
  wave: "wave",
  thinking: "breathe",
  point: "pulse",
  celebrate: "jump",
  oops: "shake",
  outro: "sway",
};

export type MascotMotionIntensity = "subtle" | "normal" | "dynamic";

export const DEFAULT_ACTION_SPEEDS: Record<MascotActionType, number> = {
  idle: 1.0,
  wave: 1.0,
  thinking: 1.0,
  point: 1.0,
  celebrate: 1.0,
  oops: 1.0,
  outro: 1.0,
};

export const DEFAULT_ACTION_INTENSITIES: Record<MascotActionType, MascotMotionIntensity> = {
  idle: "normal",
  wave: "normal",
  thinking: "normal",
  point: "normal",
  celebrate: "normal",
  oops: "normal",
  outro: "normal",
};
