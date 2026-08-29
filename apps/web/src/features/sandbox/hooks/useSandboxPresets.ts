import { useMemo, useState, type MouseEvent } from "react";
import type {
  QuizAnswerCardStyle,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
  SandboxPreviewInput,
} from "@studio/shared";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";

export type VisualPresetItem = {
  id: string;
  name: string;
  description: string;
  theme: SandboxPreviewInput["theme"];
  palette_id: string;
  layout_id: "media_left_choices_right" | "visual_choices_three" | "baseline";
  thinking_bar_style: QuizThinkingBarStyle;
  question_box_style: QuizQuestionBoxStyle;
  answer_card_style: QuizAnswerCardStyle;
  counter_style: QuizQuestionCounterStyle;
  mascot_id?: string | null;
  mascot_position?: "bottom_left" | "bottom_right";
  mascot_scale?: number;
  mascot_offset_x?: number;
  mascot_offset_y?: number;
  isBuiltIn?: boolean;
  nameKey?: string;
  descKey?: string;
};

const BUILT_IN_PRESETS: Array<
  Omit<VisualPresetItem, "name" | "description"> & {
    nameKey: string;
    descKey: string;
    defaultName: string;
    defaultDesc: string;
  }
> = [
  {
    id: "preset_arcade_classic",
    nameKey: "visualSandbox.presetArcadeClassicName",
    descKey: "visualSandbox.presetArcadeClassicDesc",
    defaultName: "Arcade Pop Master",
    defaultDesc: "Modern standard layout with 3D candy styling, sliding star timer, and wooden badge counter.",
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
    defaultName: "Cyber Neon Pulse",
    defaultDesc: "High-tech frosted glassmorphism, glowing neon cards, plasma laser timer, and neon badge.",
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
    defaultName: "Comic Action Boom",
    defaultDesc: "Comic book speech bubbles, bold pop-art answer cards, burning fuse timer, and floating balloon counter.",
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
    defaultName: "Treasure Quest",
    defaultDesc: "Classic adventure parchment scroll, 8-bit retro gauge, arcade cards, and golden trophy shield.",
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
    defaultName: "Minimalist Studio",
    defaultDesc: "Elegant modern minimalist design with soft glowing timer and gentle pill answer cards.",
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
    defaultName: "Visual 3-Choice Showcase",
    defaultDesc: "Wide 3-choice image showcase layout for visual multiple-choice questions.",
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

const STORAGE_KEY = "studio-visual-custom-presets";

type UseSandboxPresetsInput = {
  design: SandboxDesignState;
  mascot: SandboxMascotState;
  onNotice?: (notice: NonNullable<Notice>) => void;
};

export function useSandboxPresets({ design, mascot, onNotice }: UseSandboxPresetsInput) {
  const { t } = useTranslation();
  const [customPresets, setCustomPresets] = useState<VisualPresetItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as VisualPresetItem[]) : [];
    } catch {
      return [];
    }
  });
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const builtInPresets = useMemo<VisualPresetItem[]>(
    () =>
      BUILT_IN_PRESETS.map((preset) => ({
        ...preset,
        name: t(preset.nameKey) || preset.defaultName,
        description: t(preset.descKey) || preset.defaultDesc,
      })),
    [t],
  );
  const allPresets = useMemo(() => [...builtInPresets, ...customPresets], [builtInPresets, customPresets]);
  const matchedPreset = useMemo(
    () =>
      allPresets.find(
        (preset) =>
          preset.palette_id === design.paletteId &&
          preset.layout_id === design.layoutId &&
          preset.thinking_bar_style === design.thinkingBarStyle &&
          preset.question_box_style === design.questionBoxStyle &&
          preset.answer_card_style === design.answerCardStyle &&
          preset.counter_style === design.counterStyle &&
          (preset.mascot_id === undefined || preset.mascot_id === mascot.mascotId),
      ),
    [
      allPresets,
      design.paletteId,
      design.layoutId,
      design.thinkingBarStyle,
      design.questionBoxStyle,
      design.answerCardStyle,
      design.counterStyle,
      mascot.mascotId,
    ],
  );
  const activeCustomPreset = useMemo(
    () => customPresets.find((preset) => preset.id === matchedPreset?.id) || null,
    [customPresets, matchedPreset],
  );

  const persistPresets = (presets: VisualPresetItem[]) => {
    setCustomPresets(presets);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // The in-memory preset remains usable when storage is unavailable.
    }
  };

  const handleLoadPreset = (preset: VisualPresetItem) => {
    design.setPaletteId(preset.palette_id);
    design.setLayoutId(preset.layout_id || "media_left_choices_right");
    design.setThinkingBarStyle(preset.thinking_bar_style);
    design.setQuestionBoxStyle(preset.question_box_style);
    design.setAnswerCardStyle(preset.answer_card_style || "glossy_arcade");
    design.setCounterStyle(preset.counter_style);
    if (preset.mascot_id !== undefined) mascot.setMascotId(preset.mascot_id || "none");
    if (preset.mascot_position) mascot.setMascotPosition(preset.mascot_position);
    if (preset.mascot_scale !== undefined) mascot.setMascotScale(preset.mascot_scale);
    if (preset.mascot_offset_x !== undefined) mascot.setMascotOffsetX(preset.mascot_offset_x);
    if (preset.mascot_offset_y !== undefined) mascot.setMascotOffsetY(preset.mascot_offset_y);
    if (onNotice) onNotice({ tone: "good", message: t("visualSandbox.noticeLoadedPreset", { name: preset.name }) });
  };

  const handleSaveCustomPreset = () => {
    const name = newPresetName.trim();
    if (!name) return;
    const newPreset: VisualPresetItem = {
      id: `custom_${Date.now()}`,
      name,
      description: t("visualSandbox.customPresetDefaultDesc"),
      theme: design.theme,
      palette_id: design.paletteId,
      layout_id: design.layoutId,
      thinking_bar_style: design.thinkingBarStyle,
      question_box_style: design.questionBoxStyle,
      answer_card_style: design.answerCardStyle,
      counter_style: design.counterStyle,
      mascot_id: mascot.mascotId,
      mascot_position: mascot.mascotPosition,
      mascot_scale: mascot.mascotScale,
      mascot_offset_x: mascot.mascotOffsetX,
      mascot_offset_y: mascot.mascotOffsetY,
      isBuiltIn: false,
    };
    persistPresets([newPreset, ...customPresets]);
    setNewPresetName("");
    setPresetModalOpen(false);
    if (onNotice) onNotice({ tone: "good", message: t("visualSandbox.noticeSavedPreset", { name }) });
  };

  const handleDeleteCustomPreset = (id: string, event?: MouseEvent) => {
    event?.stopPropagation();
    persistPresets(customPresets.filter((preset) => preset.id !== id));
    if (onNotice) onNotice({ tone: "neutral", message: t("visualSandbox.noticeDeletedPreset") });
  };

  return {
    customPresets,
    presetModalOpen,
    setPresetModalOpen,
    newPresetName,
    setNewPresetName,
    builtInPresets,
    allPresets,
    matchedPreset,
    activeCustomPreset,
    handleLoadPreset,
    handleSaveCustomPreset,
    handleDeleteCustomPreset,
  };
}

export type SandboxPresetsState = ReturnType<typeof useSandboxPresets>;
