import type {
  QuizAnswerCardStyle,
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
  layout_id: Exclude<QuizLayoutId, "auto"> | "baseline";
  thinking_bar_style: Exclude<QuizThinkingBarStyle, "auto">;
  question_box_style: Exclude<QuizQuestionBoxStyle, "auto">;
  answer_card_style: Exclude<QuizAnswerCardStyle, "auto">;
  counter_style: Exclude<QuizQuestionCounterStyle, "auto">;
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
    layout_id: "media_left_choices_right",
    thinking_bar_style: "star_slider",
    question_box_style: "candy_pop",
    answer_card_style: "glossy_arcade",
    counter_style: "hanging_woodsign",
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
    layout_id: "media_left_choices_right",
    thinking_bar_style: "energy_laser",
    question_box_style: "glass_morphism",
    answer_card_style: "glass_neon",
    counter_style: "neon_badge",
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
    layout_id: "media_left_choices_right",
    thinking_bar_style: "flame_fuse",
    question_box_style: "comic_bubble",
    answer_card_style: "comic_chunky",
    counter_style: "floating_balloon",
    isBuiltIn: true,
  },
  {
    id: "preset_treasure_quest",
    nameKey: "visualSandbox.presetTreasureQuestName",
    descKey: "visualSandbox.presetTreasureQuestDesc",
    name: "Treasure Quest",
    description: "Classic adventure parchment scroll, 8-bit retro gauge, arcade cards, and golden trophy shield.",
    icon: "📜",
    theme: "candy_arcade",
    palette_id: "orange",
    layout_id: "media_left_choices_right",
    thinking_bar_style: "retro_pixel",
    question_box_style: "parchment_scroll",
    answer_card_style: "glossy_arcade",
    counter_style: "golden_shield",
    isBuiltIn: true,
  },
  {
    id: "preset_minimal_studio",
    nameKey: "visualSandbox.presetMinimalStudioName",
    descKey: "visualSandbox.presetMinimalStudioDesc",
    name: "Minimalist Studio",
    description: "Elegant modern minimalist design with soft glowing timer and gentle pill answer cards.",
    icon: "✨",
    theme: "candy_arcade",
    palette_id: "aqua",
    layout_id: "media_left_choices_right",
    thinking_bar_style: "minimal_glow",
    question_box_style: "glass_morphism",
    answer_card_style: "minimal_soft",
    counter_style: "neon_badge",
    isBuiltIn: true,
  },
  {
    id: "preset_visual_showcase",
    nameKey: "visualSandbox.presetVisualShowcaseName",
    descKey: "visualSandbox.presetVisualShowcaseDesc",
    name: "Visual 3-Choice Showcase",
    description: "Wide 3-choice image showcase layout for visual multiple-choice questions.",
    icon: "🖼️",
    theme: "candy_arcade",
    palette_id: "pink",
    layout_id: "visual_choices_three",
    thinking_bar_style: "capsule_liquid",
    question_box_style: "candy_pop",
    answer_card_style: "glossy_arcade",
    counter_style: "floating_balloon",
    isBuiltIn: true,
  },
];

export function getBuiltInPresets(): VisualPresetItem[] {
  return BUILT_IN_PRESETS;
}

export function findBuiltInPresetById(id?: string | null): VisualPresetItem | undefined {
  if (!id || id === "auto" || id === "custom") return undefined;
  return BUILT_IN_PRESETS.find((p) => p.id === id);
}

export function matchVisualPreset(
  config: {
    palette_id?: string;
    layout_id?: string;
    thinking_bar_style?: string;
    question_box_style?: string;
    answer_card_style?: string;
    counter_style?: string;
  },
  presets: VisualPresetItem[] = BUILT_IN_PRESETS,
): VisualPresetItem | undefined {
  return presets.find(
    (p) =>
      (!config.palette_id || config.palette_id === "auto" || p.palette_id === config.palette_id) &&
      (!config.layout_id || config.layout_id === "auto" || p.layout_id === config.layout_id) &&
      (!config.thinking_bar_style || config.thinking_bar_style === "auto" || p.thinking_bar_style === config.thinking_bar_style) &&
      (!config.question_box_style || config.question_box_style === "auto" || p.question_box_style === config.question_box_style) &&
      (!config.answer_card_style || config.answer_card_style === "auto" || p.answer_card_style === config.answer_card_style) &&
      (!config.counter_style || config.counter_style === "auto" || p.counter_style === config.counter_style),
  );
}
