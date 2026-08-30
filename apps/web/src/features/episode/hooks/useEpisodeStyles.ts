import { useEffect, useState } from "react";
import {
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_QUESTION_COUNT,
  type Channel,
  type Episode,
  type QuizAnswerCardStyle,
  type QuizImageStyle,
  type QuizPaletteId,
  type QuizQuestionBoxStyle,
  type QuizQuestionCounterStyle,
  type QuizThinkingBarStyle,
  type VisualPresetItem,
} from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export type UseEpisodeStylesProps = {
  channel: Channel;
  episodeId: string;
  episode: Episode | null;
  setEpisode: (episode: Episode | null) => void;
  load: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
  setBusy: (key: string | null) => void;
};

export function useEpisodeStyles({ channel, episodeId, episode, setEpisode, load, onNotice, setBusy }: UseEpisodeStylesProps) {
  const [questionCountDraft, setQuestionCountDraft] = useState(8);
  const [durationDraft, setDurationDraft] = useState(8);

  useEffect(() => {
    if (episode) {
      setQuestionCountDraft(episode.quiz_config?.question_count ?? 8);
      setDurationDraft(episode.target_duration_minutes);
    }
  }, [episode?.episode_id, episode?.quiz_config?.question_count, episode?.target_duration_minutes]);

  // Style saves only touch quiz_config: apply the PATCH response directly instead
  // of refetching every episode artifact through load().
  const saveQuizStyles = async (busyKey: string, patch: Partial<Episode["quiz_config"]>, successMessage: string) => {
    setBusy(busyKey);
    try {
      const updated = await api.updateEpisode(channel.channel_id, episodeId, patch);
      setEpisode(updated);
      onNotice({ tone: "good", message: successMessage });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not update episode" });
    } finally {
      setBusy(null);
    }
  };

  const saveQuestionCount = async (count: number) => {
    if (!episode || count === (episode.quiz_config?.question_count ?? 8)) return;
    if (!Number.isInteger(count) || count < QUIZ_MIN_QUESTION_COUNT || count > QUIZ_MAX_QUESTION_COUNT) {
      onNotice({
        tone: "bad",
        message: `Questions must be between ${QUIZ_MIN_QUESTION_COUNT} and ${QUIZ_MAX_QUESTION_COUNT}`,
      });
      setQuestionCountDraft(episode.quiz_config?.question_count ?? 8);
      return;
    }
    setQuestionCountDraft(count);
    await saveQuizStyles("question-count", { question_count: count }, "Question count updated");
  };

  const saveVisualStyle = async (newStyle: QuizImageStyle | "mixed") => {
    if (!episode || newStyle === (episode.quiz_config?.visual_style ?? "mixed")) return;
    await saveQuizStyles("visual-style", { visual_style: newStyle }, `Visual style set to ${newStyle === "mixed" ? "Mixed" : newStyle}`);
  };

  const saveThinkingBarStyle = async (newStyle: QuizThinkingBarStyle) => {
    if (!episode || newStyle === (episode.quiz_config?.thinking_bar_style ?? "auto")) return;
    await saveQuizStyles("thinking-bar-style", { thinking_bar_style: newStyle }, `Thinking bar style set to ${newStyle}`);
  };

  const saveQuestionBoxStyle = async (newStyle: QuizQuestionBoxStyle) => {
    if (!episode || newStyle === (episode.quiz_config?.question_box_style ?? "auto")) return;
    await saveQuizStyles(
      "question-box-style",
      { question_box_style: newStyle, style_preset_id: "custom" },
      `Question box style set to ${newStyle}`,
    );
  };

  const saveAnswerCardStyle = async (newStyle: QuizAnswerCardStyle) => {
    if (!episode || newStyle === (episode.quiz_config?.answer_card_style ?? "auto")) return;
    await saveQuizStyles(
      "answer-card-style",
      { answer_card_style: newStyle, style_preset_id: "custom" },
      `Answer card style set to ${newStyle}`,
    );
  };

  const saveCounterStyle = async (newStyle: QuizQuestionCounterStyle) => {
    if (!episode || newStyle === (episode.quiz_config?.question_counter_style ?? "auto")) return;
    await saveQuizStyles(
      "counter-style",
      { question_counter_style: newStyle, style_preset_id: "custom" },
      `Counter badge style set to ${newStyle}`,
    );
  };

  const savePaletteId = async (newPalette: QuizPaletteId) => {
    if (!episode || newPalette === (episode.quiz_config?.palette_id ?? "auto")) return;
    await saveQuizStyles("palette-id", { palette_id: newPalette, style_preset_id: "custom" }, `Color palette set to ${newPalette}`);
  };

  const applyStylePreset = async (preset: VisualPresetItem) => {
    if (!episode) return;
    await saveQuizStyles(
      "style-preset",
      {
        style_preset_id: preset.id,
        visual_theme: preset.theme,
        palette_id: preset.palette_id,
        question_box_style: preset.question_box_style,
        answer_card_style: preset.answer_card_style,
        question_counter_style: preset.counter_style,
        thinking_bar_style: preset.thinking_bar_style,
      },
      `Applied "${preset.name}" preset pack`,
    );
  };

  const saveDuration = async () => {
    if (!episode || durationDraft === episode.target_duration_minutes) return;
    setBusy("duration");
    try {
      await api.updateEpisode(channel.channel_id, episodeId, { target_duration_minutes: durationDraft });
      await load();
      onNotice({ tone: "good", message: "Duration target updated" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not update duration" });
    } finally {
      setBusy(null);
    }
  };

  return {
    questionCountDraft,
    setQuestionCountDraft,
    durationDraft,
    setDurationDraft,
    saveQuizStyles,
    saveQuestionCount,
    saveVisualStyle,
    saveThinkingBarStyle,
    saveQuestionBoxStyle,
    saveAnswerCardStyle,
    saveCounterStyle,
    savePaletteId,
    applyStylePreset,
    saveDuration,
  };
}
