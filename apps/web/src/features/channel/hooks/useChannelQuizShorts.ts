import { useCallback, useState } from "react";
import type { QuizShort } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export type UseChannelQuizShortsProps = {
  channelId: string;
  onNotice: (notice: NonNullable<Notice>) => void;
  onRefresh: () => Promise<void>;
};

/** Owns the Quiz Short list of one channel plus the delete flow state used by the modal. */
export function useChannelQuizShorts({ channelId, onNotice, onRefresh }: UseChannelQuizShortsProps) {
  const [quizShorts, setQuizShorts] = useState<QuizShort[]>([]);
  const [deleteQuizShortTarget, setDeleteQuizShortTarget] = useState<QuizShort | null>(null);

  const reload = useCallback(async () => {
    try {
      const response = await api.listQuizShorts(channelId);
      setQuizShorts(response.quiz_shorts ?? []);
    } catch {
      setQuizShorts([]);
    }
  }, [channelId]);

  const handleQuizShortDeleted = async (quizShort: QuizShort) => {
    setDeleteQuizShortTarget(null);
    setQuizShorts((current) => current.filter((item) => item.quiz_short_id !== quizShort.quiz_short_id));
    onNotice({ tone: "good", message: `Quiz Short deleted: ${quizShort.topic.title}` });
    await onRefresh();
  };

  return {
    quizShorts,
    reload,
    deleteQuizShortTarget,
    setDeleteQuizShortTarget,
    handleQuizShortDeleted,
  };
}
