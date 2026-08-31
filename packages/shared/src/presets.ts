import type {
  QuizAnswerCardStyle,
  QuizBackgroundStyle,
  QuizLayoutId,
  QuizPaletteId,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
  QuizVisualTheme,
} from "./enums.js";

export type VisualPresetItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  theme: QuizVisualTheme;
  palette_id: Exclude<QuizPaletteId, "auto">;
  /** Sandbox showcase layout. Production episodes continue to resolve layout per director beat. */
  preview_layout_id?: Exclude<QuizLayoutId, "auto"> | "baseline";
  /** @deprecated Legacy custom-preset field. Use preview_layout_id. */
  layout_id?: Exclude<QuizLayoutId, "auto"> | "baseline";
  thinking_bar_style: Exclude<QuizThinkingBarStyle, "auto">;
  question_box_style: Exclude<QuizQuestionBoxStyle, "auto">;
  answer_card_style: Exclude<QuizAnswerCardStyle, "auto">;
  counter_style: Exclude<QuizQuestionCounterStyle, "auto">;
  background_style?: Exclude<QuizBackgroundStyle, "auto">;
  mascot_id?: string | null;
  mascot_position?: "bottom_left" | "bottom_right";
  mascot_scale?: number;
  mascot_offset_x?: number;
  mascot_offset_y?: number;
  mascot_flip_x?: boolean;
  channel_brand_name?: string;
  isBuiltIn?: boolean;
  nameKey?: string;
  descKey?: string;
};

export const BUILT_IN_PRESETS: VisualPresetItem[] = [
  {
    id: "preset_arcade_classic",
    nameKey: "visualSandbox.presetArcadeClassicName",
    descKey: "visualSandbox.presetArcadeClassicDesc",
    name: "Arcade Pop Master",
    description: "Modern standard layout with 3D candy styling, sliding star timer, and wooden badge counter.",
    icon: "🍬",
    theme: "candy_arcade",
    palette_id: "lime",
    preview_layout_id: "media_left_choices_right",
    thinking_bar_style: "star_slider",
    question_box_style: "candy_pop",
    answer_card_style: "glossy_arcade",
    counter_style: "hanging_woodsign",
    background_style: "candy_rays",
    isBuiltIn: true,
  },
  {
    id: "preset_cyber_neon",
    nameKey: "visualSandbox.presetCyberNeonName",
    descKey: "visualSandbox.presetCyberNeonDesc",
    name: "Cyber Neon Pulse",
    description: "High-tech frosted glassmorphism, glowing neon cards, plasma laser timer, and neon badge.",
    icon: "⚡",
    theme: "candy_arcade",
    palette_id: "purple",
    preview_layout_id: "media_left_choices_right",
    thinking_bar_style: "energy_laser",
    question_box_style: "glass_morphism",
    answer_card_style: "glass_neon",
    counter_style: "neon_badge",
    background_style: "aurora_glow",
    isBuiltIn: true,
  },
  {
    id: "preset_comic_boom",
    nameKey: "visualSandbox.presetComicBoomName",
    descKey: "visualSandbox.presetComicBoomDesc",
    name: "Comic Action Boom",
    description: "Comic book speech bubbles, bold pop-art answer cards, burning fuse timer, and floating balloon counter.",
    icon: "💥",
    theme: "candy_arcade",
    palette_id: "sunny",
    preview_layout_id: "media_left_choices_right",
    thinking_bar_style: "flame_fuse",
    question_box_style: "comic_bubble",
    answer_card_style: "comic_chunky",
    counter_style: "floating_balloon",
    background_style: "candy_rays",
    isBuiltIn: true,
  },
  {
    id: "preset_build_zone",
    nameKey: "visualSandbox.presetBuildZoneName",
    descKey: "visualSandbox.presetBuildZoneDesc",
    name: "Build Zone Crew",
    description: "Cheerful construction-site visuals with a chunky bulldozer timer pushing countdown crates to the build target.",
    icon: "🏗️",
    theme: "candy_arcade",
    palette_id: "orange",
    preview_layout_id: "media_left_choices_right",
    thinking_bar_style: "construction_machine",
    question_box_style: "candy_pop",
    answer_card_style: "glossy_arcade",
    counter_style: "golden_shield",
    background_style: "candy_rays",
    isBuiltIn: true,
  },
  {
    id: "preset_cosmic_space",
    nameKey: "visualSandbox.presetCosmicSpaceName",
    descKey: "visualSandbox.presetCosmicSpaceDesc",
    name: "Cosmic Space Voyager",
    description: "Futuristic galactic journey with soaring 3D rocket timer and neon space aesthetics.",
    icon: "🚀",
    theme: "candy_arcade",
    palette_id: "aqua",
    preview_layout_id: "media_left_choices_right",
    thinking_bar_style: "cosmic_rocket",
    question_box_style: "glass_morphism",
    answer_card_style: "minimal_soft",
    counter_style: "neon_badge",
    background_style: "aurora_glow",
    isBuiltIn: true,
  },
  {
    id: "preset_pastel_dream",
    nameKey: "visualSandbox.presetPastelDreamName",
    descKey: "visualSandbox.presetPastelDreamDesc",
    name: "Sweet Pastel Pop",
    description: "Sweet candy pink aesthetics with glowing neon jelly timer, candy pop box, and floating balloon counter.",
    icon: "🫧",
    theme: "candy_arcade",
    palette_id: "pink",
    thinking_bar_style: "capsule_liquid",
    question_box_style: "candy_pop",
    answer_card_style: "glossy_arcade",
    counter_style: "floating_balloon",
    background_style: "candy_rays",
    isBuiltIn: true,
  },
];

export function getBuiltInPresets(): VisualPresetItem[] {
  return BUILT_IN_PRESETS;
}

export function findBuiltInPresetById(id?: string | null): VisualPresetItem | undefined {
  if (!id || id === "auto" || id === "custom") return undefined;
  const resolvedId = id === "preset_visual_showcase" ? "preset_pastel_dream" : id;
  return BUILT_IN_PRESETS.find((p) => p.id === resolvedId);
}

import { resolvePresetPreviewLayoutId } from "./quizStyles.policy.js";
export { resolvePresetPreviewLayoutId };

export function matchVisualPreset(
  config: {
    palette_id?: string;
    layout_id?: string;
    thinking_bar_style?: string;
    question_box_style?: string;
    answer_card_style?: string;
    counter_style?: string;
    background_style?: string;
  },
  presets: VisualPresetItem[] = BUILT_IN_PRESETS,
): VisualPresetItem | undefined {
  return presets.find(
    (p) =>
      (!config.palette_id || config.palette_id === "auto" || p.palette_id === config.palette_id) &&
      (!config.thinking_bar_style || config.thinking_bar_style === "auto" || p.thinking_bar_style === config.thinking_bar_style) &&
      (!config.question_box_style || config.question_box_style === "auto" || p.question_box_style === config.question_box_style) &&
      (!config.answer_card_style || config.answer_card_style === "auto" || p.answer_card_style === config.answer_card_style) &&
      (!config.counter_style || config.counter_style === "auto" || p.counter_style === config.counter_style) &&
      (!config.background_style || config.background_style === "auto" || (p.background_style ?? "candy_rays") === config.background_style),
  );
}
