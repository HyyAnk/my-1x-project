import {
  ALL_QUIZ_PALETTES,
  BUILT_IN_PRESETS,
  QUIZ_PORTRAIT_LAYOUT_IDS,
  QUIZ_SHORT_MAX_QUESTION_COUNT,
  QUIZ_SHORT_MIN_QUESTION_COUNT,
  matchVisualPreset,
  type MascotStyle,
  type MascotStyleSelection,
  type QuizPaletteId,
  type QuizShort,
  type QuizShortLayoutPair,
  type VisualPresetItem,
} from "@studio/shared";

export type SelectOption<T extends string = string> = { value: T; label: string };

export const QUIZ_SHORT_QUESTION_COUNT_OPTIONS: readonly number[] = Array.from(
  { length: QUIZ_SHORT_MAX_QUESTION_COUNT - QUIZ_SHORT_MIN_QUESTION_COUNT + 1 },
  (_, index) => QUIZ_SHORT_MIN_QUESTION_COUNT + index,
);

const PORTRAIT_LAYOUT_LABELS: Record<QuizShortLayoutPair["primary"], string> = {
  short_stack_list: "Stack list",
  short_media_top_choices: "Media top",
  short_versus_two: "Versus two",
  short_verdict_yes_no: "Verdict yes / no",
};

export const LAYOUT_PAIR_AUTO_VALUE = "auto";

export function formatPaletteLabel(paletteId: QuizPaletteId): string {
  return paletteId.charAt(0).toUpperCase() + paletteId.slice(1);
}

export function buildPaletteOptions(): SelectOption<QuizPaletteId>[] {
  return [
    { value: "auto", label: "Auto (preset palette)" },
    ...ALL_QUIZ_PALETTES.map((id) => ({ value: id, label: formatPaletteLabel(id) })),
  ];
}

export function buildPresetOptions(presets: VisualPresetItem[] = BUILT_IN_PRESETS): SelectOption[] {
  return presets.map((preset) => ({ value: preset.id, label: preset.name }));
}

export function resolveCurrentPresetId(quizShort: QuizShort, presets: VisualPresetItem[] = BUILT_IN_PRESETS): string {
  if (quizShort.quiz_config.style_preset_id) return quizShort.quiz_config.style_preset_id;
  return matchVisualPreset(quizShort.quiz_config, presets)?.id ?? "";
}

/** Every ordered pair of two different portrait layouts, encoded as `primary|secondary`. */
export function buildLayoutPairOptions(): SelectOption[] {
  const options: SelectOption[] = [{ value: LAYOUT_PAIR_AUTO_VALUE, label: "Auto (director picks)" }];
  for (const primary of QUIZ_PORTRAIT_LAYOUT_IDS) {
    for (const secondary of QUIZ_PORTRAIT_LAYOUT_IDS) {
      if (primary === secondary) continue;
      options.push({
        value: encodeLayoutPair({ primary, secondary }),
        label: `${PORTRAIT_LAYOUT_LABELS[primary]} + ${PORTRAIT_LAYOUT_LABELS[secondary]}`,
      });
    }
  }
  return options;
}

export function encodeLayoutPair(pair: QuizShortLayoutPair | undefined): string {
  return pair ? `${pair.primary}|${pair.secondary}` : LAYOUT_PAIR_AUTO_VALUE;
}

export function decodeLayoutPair(value: string): QuizShortLayoutPair | undefined {
  const [primary, secondary] = value.split("|");
  const isPortrait = (id: string | undefined): id is QuizShortLayoutPair["primary"] =>
    Boolean(id) && (QUIZ_PORTRAIT_LAYOUT_IDS as readonly string[]).includes(id as string);
  if (!isPortrait(primary) || !isPortrait(secondary) || primary === secondary) return undefined;
  return { primary, secondary };
}

export const MASCOT_MODE_BUILTIN = "style_builtin";
export const MASCOT_MODE_CYCLE = "cycle";

export function buildMascotStyleOptions(styles: MascotStyle[]): SelectOption[] {
  return [
    { value: MASCOT_MODE_BUILTIN, label: "Match preset style" },
    { value: MASCOT_MODE_CYCLE, label: "Cycle styles" },
    ...styles.map((style) => ({ value: style.id, label: style.name })),
  ];
}

export function encodeMascotSelection(selection: MascotStyleSelection | undefined): string {
  if (!selection || selection.mode === "style_builtin") return MASCOT_MODE_BUILTIN;
  if (selection.mode === "cycle") return MASCOT_MODE_CYCLE;
  return selection.style_id;
}

export function decodeMascotSelection(value: string): MascotStyleSelection {
  if (value === MASCOT_MODE_CYCLE) return { mode: "cycle" };
  if (value === MASCOT_MODE_BUILTIN || !value) return { mode: "style_builtin" };
  return { mode: "specific_style", style_id: value };
}
