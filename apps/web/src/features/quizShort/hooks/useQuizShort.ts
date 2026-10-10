import { useCallback, useEffect, useRef, useState } from "react";
import type { QuizShort } from "@studio/shared";
import { quizShortApi } from "../../../api/quizShortApi";
import type { Notice } from "../../../components/types";
import type { QuizShortWorkspaceResponse } from "../types/quizShort.types";

export type UseQuizShortProps = {
  channelId: string;
  quizShortId: string;
  onNotice: (notice: NonNullable<Notice>) => void;
};

/** Loads the aggregated Quiz Short workspace payload and exposes a reload for task-driven refreshes. */
export function useQuizShort({ channelId, quizShortId, onNotice }: UseQuizShortProps) {
  const [workspace, setWorkspace] = useState<QuizShortWorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const response = await quizShortApi.quizShortWorkspace(channelId, quizShortId);
      if (version !== loadVersion.current) return;
      setWorkspace(response);
      setError(null);
    } catch (reason) {
      if (version !== loadVersion.current) return;
      const message = reason instanceof Error ? reason.message : "Could not load the Quiz Short";
      setError(message);
      onNotice({ tone: "bad", message });
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [channelId, quizShortId, onNotice]);

  useEffect(() => {
    setLoading(true);
    void load();
    return () => {
      loadVersion.current += 1;
    };
  }, [load]);

  const applyQuizShort = useCallback((quizShort: QuizShort) => {
    setWorkspace((current) => (current ? { ...current, quiz_short: quizShort, render_stale: quizShort.render_stale } : current));
  }, []);

  return {
    workspace,
    quizShort: workspace?.quiz_short ?? null,
    stages: workspace?.stages ?? null,
    loading,
    error,
    load,
    applyQuizShort,
  };
}
