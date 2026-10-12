import {
  BUILT_IN_PRESETS,
  resolveBuiltInPresetCategoryId,
  type QuizShort,
  type QuizShortBookendPair,
  type QuizShortBookendSelection,
} from "@studio/shared";
import type { SelectOption } from "./quizShortSettingsOptions";

export const BOOKEND_MODE_BUILTIN = "style_builtin";
export const BOOKEND_MODE_NONE = "none";

function presetName(stylePresetId: string): string {
  return BUILT_IN_PRESETS.find((preset) => preset.id === stylePresetId)?.name ?? stylePresetId;
}

/** "Match style" (with the ready count of the Short's style), "None", then every active pair. */
export function buildBookendSelectionOptions(quizShort: QuizShort, pairs: QuizShortBookendPair[]): SelectOption[] {
  const category = resolveBuiltInPresetCategoryId(quizShort.quiz_config);
  const readyInCategory = pairs.filter((pair) => pair.status === "active" && pair.style_preset_id === category).length;
  return [
    { value: BOOKEND_MODE_BUILTIN, label: `Match style · ${presetName(category)} (${readyInCategory} ready)` },
    { value: BOOKEND_MODE_NONE, label: "None (kickoff card and score CTA)" },
    ...pairs
      .filter((pair) => pair.status === "active")
      .map((pair) => ({ value: pair.pair_id, label: `Pair ${pair.name} · ${presetName(pair.style_preset_id)}` })),
  ];
}

export function encodeBookendSelection(selection: QuizShortBookendSelection | undefined): string {
  if (!selection || selection.mode === "style_builtin") return BOOKEND_MODE_BUILTIN;
  if (selection.mode === "none") return BOOKEND_MODE_NONE;
  return selection.pair_id;
}

export function decodeBookendSelection(value: string): QuizShortBookendSelection {
  if (value === BOOKEND_MODE_NONE) return { mode: "none" };
  if (value === BOOKEND_MODE_BUILTIN || !value) return { mode: "style_builtin" };
  return { mode: "specific_pair", pair_id: value };
}
