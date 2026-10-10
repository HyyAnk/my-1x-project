import { useState } from "react";
import type { MascotStyleSelection, QuizPaletteId, QuizShort, QuizShortLayoutPair, VisualPresetItem } from "@studio/shared";
import { quizShortApi } from "../../../api/quizShortApi";
import type { Notice } from "../../../components/types";
import type { QuizShortSettingsPatch } from "../types/quizShort.types";

export type UseQuizShortSettingsProps = {
  channelId: string;
  quizShortId: string;
  quizShort: QuizShort | null;
  applyQuizShort: (quizShort: QuizShort) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export type QuizShortSettingsBusyKey =
  "preset" | "palette" | "mascot-style" | "question-count" | "layout-pair" | "outro-cta" | "fast-render" | null;

/** PATCHes one settings slice at a time and reflects the saved record back into the workspace. */
export function useQuizShortSettings({ channelId, quizShortId, quizShort, applyQuizShort, onNotice }: UseQuizShortSettingsProps) {
  const [busy, setBusy] = useState<QuizShortSettingsBusyKey>(null);

  const save = async (key: NonNullable<QuizShortSettingsBusyKey>, patch: QuizShortSettingsPatch, successMessage: string) => {
    if (!quizShort || busy) return;
    setBusy(key);
    try {
      applyQuizShort(await quizShortApi.updateQuizShortSettings(channelId, quizShortId, patch));
      onNotice({ tone: "good", message: successMessage });
    } catch (reason) {
      onNotice({ tone: "bad", message: reason instanceof Error ? reason.message : "Could not save Quiz Short settings" });
    } finally {
      setBusy(null);
    }
  };

  const applyPreset = (preset: VisualPresetItem) =>
    save(
      "preset",
      {
        style_preset_id: preset.id,
        palette_id: preset.palette_id,
        question_box_style: preset.question_box_style,
        answer_card_style: preset.answer_card_style,
        question_counter_style: preset.counter_style,
        thinking_bar_style: preset.thinking_bar_style,
        background_style: preset.background_style ?? "candy_rays",
      },
      `Applied "${preset.name}" preset`,
    );

  const savePalette = (paletteId: QuizPaletteId) => save("palette", { palette_id: paletteId }, `Palette set to ${paletteId}`);
  const saveMascotStyle = (selection: MascotStyleSelection) =>
    save("mascot-style", { mascot_style_selection: selection }, "Mascot style updated");
  const saveQuestionCount = (count: number) => save("question-count", { question_count: count }, `Question count set to ${count}`);
  const saveLayoutPair = async (pair: QuizShortLayoutPair | undefined) => {
    if (!pair) return;
    await save("layout-pair", { layout_pair: pair }, `Layouts set to ${pair.primary} and ${pair.secondary}`);
  };
  const saveOutroCta = (enabled: boolean) =>
    save("outro-cta", { outro_cta_enabled: enabled }, enabled ? "Score CTA enabled" : "Score CTA disabled");
  const saveFastRender = (enabled: boolean) =>
    save("fast-render", { fast_render_mode: enabled }, enabled ? "Fast render enabled" : "Fast render disabled");

  return { busy, applyPreset, savePalette, saveMascotStyle, saveQuestionCount, saveLayoutPair, saveOutroCta, saveFastRender };
}
