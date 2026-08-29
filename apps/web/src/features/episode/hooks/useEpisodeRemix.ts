import { useCallback, useEffect, useState } from "react";
import type { Channel, QuestionHistoryCheckResult, QuizV2, Scene } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export type UseEpisodeRemixProps = {
  channel: Channel;
  episodeId: string;
  quizV2: { quiz: QuizV2 | null } | null;
  scenes: Scene[];
  load: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function useEpisodeRemix({ channel, episodeId, quizV2, scenes, load, onNotice }: UseEpisodeRemixProps) {
  const [historyCheck, setHistoryCheck] = useState<QuestionHistoryCheckResult | null>(null);
  const [isRemixing, setIsRemixing] = useState(false);
  const [remixingQuestionId, setRemixingQuestionId] = useState<string | null>(null);
  const [remixAction, setRemixAction] = useState<{ questionId: string; mode: "rephrase" | "replace" } | null>(null);

  const loadHistoryCheck = useCallback(async () => {
    try {
      const res = await api.quizHistoryCheck(channel.channel_id, episodeId);
      setHistoryCheck(res.history_check);
    } catch {
      // Ignore non-fatal check error
    }
  }, [channel.channel_id, episodeId]);

  useEffect(() => {
    void loadHistoryCheck();
  }, [loadHistoryCheck, quizV2?.quiz, scenes.length]);

  const handleRemix = async (questionIds?: string[], mode: "rephrase" | "replace" = "rephrase") => {
    try {
      setIsRemixing(true);
      if (questionIds && questionIds.length === 1) {
        setRemixingQuestionId(questionIds[0]);
        setRemixAction({ questionId: questionIds[0], mode });
      } else {
        setRemixingQuestionId(null);
        setRemixAction(null);
      }
      const res = await api.remixQuizQuestions(channel.channel_id, episodeId, questionIds, mode);
      setHistoryCheck(res.history_check);
      await load();
      const modeText = mode === "replace" ? "replaced with new questions" : "rephrased";
      onNotice({ tone: "good", message: `Successfully ${modeText} ${res.remixed_count} questions and re-checked history!` });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Question remix failed" });
    } finally {
      setIsRemixing(false);
      setRemixingQuestionId(null);
      setRemixAction(null);
    }
  };

  return {
    historyCheck,
    isRemixing,
    remixingQuestionId,
    remixAction,
    loadHistoryCheck,
    handleRemix,
  };
}
