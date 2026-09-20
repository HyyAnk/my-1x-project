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
import type { TransitionSettings } from "./transitions/transition.types.js";

export type VisualPresetItem = {
  id: string;
  name: string;
  description: string;
  /** Costume and accessory direction for the preset's managed mascot style. */
  mascot_style_prompt?: string;
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
  transitions?: TransitionSettings;
  isBuiltIn?: boolean;
  nameKey?: string;
  descKey?: string;
};

export const DEFAULT_BUILT_IN_PRESET_ID = "preset_arcade_classic";

export const BUILT_IN_PRESETS: VisualPresetItem[] = [
  {
    id: "preset_arcade_classic",
    nameKey: "visualSandbox.presetArcadeClassicName",
    descKey: "visualSandbox.presetArcadeClassicDesc",
    name: "Arcade Pop Master",
    description:
      "Vibrant candy rays backdrop, 3D candy pop question box, glossy arcade cards, sliding star timer, and hanging wood sign counter.",
    mascot_style_prompt:
      "playful arcade host wardrobe with a glossy candy-colored jacket, subtle star accents, clean sneakers, and compact game-show accessories",
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
    description:
      "High-tech aurora glow backdrop, frosted glass question box, glowing neon cards, energy laser timer, and digital neon badge.",
    mascot_style_prompt:
      "futuristic techwear outfit with cyan and magenta emissive trim, a compact holographic wrist device, a cyber utility belt, and sleek high-tech footwear",
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
    description:
      "Action comic burst backdrop, speech bubble question box, chunky pop-art cards, flame fuse timer, and floating balloon counter.",
    mascot_style_prompt:
      "heroic action outfit with bold color-blocked fabric, a simple chest emblem, fitted gloves, sturdy boots, and a compact utility belt",
    icon: "💥",
    theme: "candy_arcade",
    palette_id: "sunny",
    preview_layout_id: "media_left_choices_right",
    thinking_bar_style: "flame_fuse",
    question_box_style: "comic_bubble",
    answer_card_style: "comic_chunky",
    counter_style: "floating_balloon",
    background_style: "comic_burst",
    isBuiltIn: true,
  },
  {
    id: "preset_build_zone",
    nameKey: "visualSandbox.presetBuildZoneName",
    descKey: "visualSandbox.presetBuildZoneDesc",
    name: "Build Zone Crew",
    description:
      "Technical construction blueprint backdrop, hazard stripe question box, steel beam plate cards, bulldozer timer, and golden shield counter.",
    mascot_style_prompt:
      "construction crew outfit with a fitted hard hat, reflective safety vest, practical tool belt, protective gloves, and sturdy work boots",
    icon: "🏗️",
    theme: "candy_arcade",
    palette_id: "orange",
    preview_layout_id: "media_left_choices_right",
    thinking_bar_style: "construction_machine",
    question_box_style: "hazard_stripes",
    answer_card_style: "steel_beam_plate",
    counter_style: "golden_shield",
    background_style: "construction_blueprint",
    isBuiltIn: true,
  },
  {
    id: "preset_cosmic_space",
    nameKey: "visualSandbox.presetCosmicSpaceName",
    descKey: "visualSandbox.presetCosmicSpaceDesc",
    name: "Cosmic Space Voyager",
    description: "Deep space starfield backdrop, cockpit HUD question box, sleek soft cards, cosmic rocket timer, and space radar counter.",
    mascot_style_prompt:
      "sleek astronaut flight suit with mission patches, compact life-support details, a wrist controller, utility gloves, and a clear open-face helmet",
    icon: "🚀",
    theme: "candy_arcade",
    palette_id: "aqua",
    preview_layout_id: "media_left_choices_right",
    thinking_bar_style: "cosmic_rocket",
    question_box_style: "cockpit_hud",
    answer_card_style: "minimal_soft",
    counter_style: "space_radar",
    background_style: "cosmic_starfield",
    isBuiltIn: true,
  },
  {
    id: "preset_pastel_dream",
    nameKey: "visualSandbox.presetPastelDreamName",
    descKey: "visualSandbox.presetPastelDreamDesc",
    name: "Sweet Pastel Pop",
    description:
      "Dreamy floating clouds backdrop, fluffy pastel cloud question box, marshmallow answer cards, liquid capsule timer, and iridescent bubble badge.",
    mascot_style_prompt:
      "soft pastel candy-themed outfit with rounded color-block panels, small star and bow accents, playful wrist accessories, and clean pastel sneakers",
    icon: "🫧",
    theme: "candy_arcade",
    palette_id: "pink",
    preview_layout_id: "media_left_choices_right",
    thinking_bar_style: "capsule_liquid",
    question_box_style: "pastel_cloud",
    answer_card_style: "pastel_marshmallow",
    counter_style: "bubble_badge",
    background_style: "floating_clouds",
    isBuiltIn: true,
  },
  {
    id: "preset_treasure_quest",
    nameKey: "visualSandbox.presetTreasureQuestName",
    descKey: "visualSandbox.presetTreasureQuestDesc",
    name: "Treasure Quest",
    description:
      "Classic adventure parchment scroll, rustic wood plank cards, expedition map trail timer, golden compass counter, and antique treasure map backdrop.",
    mascot_style_prompt:
      "adventure explorer outfit with a weathered vest, belt pouch, compact compass, practical gloves, sturdy boots, and a small neck scarf",
    icon: "🧭",
    theme: "candy_arcade",
    palette_id: "sunny",
    preview_layout_id: "media_left_choices_right",
    thinking_bar_style: "treasure_trail",
    question_box_style: "parchment_scroll",
    answer_card_style: "rustic_wood_plank",
    counter_style: "golden_compass",
    background_style: "treasure_map",
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

export type BuiltInPresetResolutionInput = {
  style_preset_id?: string | null;
  palette_id?: string;
  thinking_bar_style?: string;
  question_box_style?: string;
  answer_card_style?: string;
  question_counter_style?: string;
  background_style?: string;
};

export function resolveBuiltInPresetCategoryId(config?: BuiltInPresetResolutionInput): string {
  const resolvedConfig = config ?? {};
  const directPreset = findBuiltInPresetById(resolvedConfig.style_preset_id);
  if (directPreset) return directPreset.id;

  return (
    matchVisualPreset({
      palette_id: resolvedConfig.palette_id,
      thinking_bar_style: resolvedConfig.thinking_bar_style,
      question_box_style: resolvedConfig.question_box_style,
      answer_card_style: resolvedConfig.answer_card_style,
      counter_style: resolvedConfig.question_counter_style,
      background_style: resolvedConfig.background_style,
    })?.id ?? DEFAULT_BUILT_IN_PRESET_ID
  );
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
