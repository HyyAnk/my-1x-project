import { useMemo, useState } from "react";
import type { EpisodePreviewQuestion } from "../types/episodePreview.types";

export function useEpisodePreviewQuestion(questions: EpisodePreviewQuestion[]) {
  const [requestedQuestionId, setRequestedQuestionId] = useState<string | null>(null);
  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === requestedQuestionId) ?? questions[0] ?? null,
    [questions, requestedQuestionId],
  );

  return {
    selectedQuestion,
    selectedQuestionId: selectedQuestion?.id ?? "",
    selectQuestion: setRequestedQuestionId,
  };
}
