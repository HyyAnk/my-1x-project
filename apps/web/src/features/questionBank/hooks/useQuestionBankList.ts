import { useCallback, useEffect, useState } from "react";
import { api } from "../../../api";
import type { BankQuestion, BankQuestionWithCooldown, QuestionBankFilters, QuestionBankModalState } from "../types/questionBankUi.types";

export interface UseQuestionBankListOptions {
  filters: QuestionBankFilters;
  selectedQuestion: BankQuestionWithCooldown | null;
  setSelectedQuestion: React.Dispatch<React.SetStateAction<BankQuestionWithCooldown | null>>;
  modalState: QuestionBankModalState;
  setModalState: React.Dispatch<React.SetStateAction<QuestionBankModalState>>;
  onStatsRefresh?: () => Promise<void> | void;
}

export function useQuestionBankList(options: UseQuestionBankListOptions) {
  const { filters, selectedQuestion, setSelectedQuestion, modalState, setModalState, onStatsRefresh } = options;

  const [questions, setQuestions] = useState<BankQuestionWithCooldown[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [buildingVideo, setBuildingVideo] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Questions list
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        archetype_id: filters.archetypeId || undefined,
        domain_id: filters.domainId || undefined,
        subtopic_id: filters.subtopicId || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        language: filters.languageFilter === "en" ? "en" : undefined,
        has_translation_for: filters.languageFilter && filters.languageFilter !== "en" ? filters.languageFilter : undefined,
        limit: filters.pageSize,
        offset: (filters.page - 1) * filters.pageSize,
        cooldown_only: filters.cooldownFilter === "cooldown" ? true : undefined,
        ready_only: filters.cooldownFilter === "ready" ? true : undefined,
      };

      let fetchedQuestions: BankQuestionWithCooldown[] = [];
      let total = 0;

      if (filters.channelId) {
        const res = await api.getChannelQuestionBankQuestions(filters.channelId, params);
        fetchedQuestions = res.questions;
        total = res.total;
      } else {
        const res = await api.getQuestionBankQuestions(params);
        fetchedQuestions = res.questions;
        total = res.total;
      }

      if (filters.languageFilter) {
        const targetLang = filters.languageFilter.toLowerCase();
        fetchedQuestions = fetchedQuestions.filter((q) => {
          const qLang = (q.language || "en").toLowerCase();
          if (targetLang === "en") return qLang === "en" || qLang === "english";
          return Boolean(q.translations && q.translations[targetLang]);
        });
        total = fetchedQuestions.length;
      }

      if (filters.translationFilter === "needs_translation") {
        fetchedQuestions = fetchedQuestions.filter((q) => {
          const hasTrans = q.translations && Object.keys(q.translations).length > 0;
          return !hasTrans;
        });
        total = fetchedQuestions.length;
      } else if (filters.translationFilter === "has_translation") {
        fetchedQuestions = fetchedQuestions.filter((q) => {
          const hasTrans = q.translations && Object.keys(q.translations).length > 0;
          return !!hasTrans;
        });
        total = fetchedQuestions.length;
      }

      setQuestions(fetchedQuestions);
      setTotalQuestions(total);
      setSelectedQuestion((prev) => {
        if (!prev) return fetchedQuestions[0] || null;
        const exists = fetchedQuestions.find((q) => q.id === prev.id);
        return exists || fetchedQuestions[0] || null;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load questions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filters, setSelectedQuestion]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  // Save (Create or Edit) question
  const saveQuestion = useCallback(
    async (q: BankQuestion) => {
      if (modalState.type === "edit" && modalState.question?.id) {
        await api.updateQuestionBankQuestion(modalState.question.id, q);
      } else {
        await api.createQuestionBankQuestion(q);
      }
      setModalState({ type: null });
      if (onStatsRefresh) {
        await onStatsRefresh();
      }
      await fetchQuestions();
    },
    [modalState, onStatsRefresh, fetchQuestions, setModalState],
  );

  const handleCreateQuestion = useCallback(
    async (q: BankQuestion) => {
      await api.createQuestionBankQuestion(q);
      setModalState({ type: null });
      if (onStatsRefresh) {
        await onStatsRefresh();
      }
      await fetchQuestions();
    },
    [onStatsRefresh, fetchQuestions, setModalState],
  );

  const handleUpdateQuestion = useCallback(
    async (id: string, q: BankQuestion) => {
      await api.updateQuestionBankQuestion(id, q);
      setModalState({ type: null });
      if (onStatsRefresh) {
        await onStatsRefresh();
      }
      await fetchQuestions();
    },
    [onStatsRefresh, fetchQuestions, setModalState],
  );

  const deleteQuestion = useCallback(
    async (id: string) => {
      if (!window.confirm(`Are you sure you want to delete question [${id}] from Question Bank?`)) {
        return;
      }
      await api.deleteQuestionBankQuestion(id);
      if (selectedQuestion?.id === id) {
        setSelectedQuestion(null);
      }
      if (onStatsRefresh) {
        await onStatsRefresh();
      }
      await fetchQuestions();
    },
    [selectedQuestion, onStatsRefresh, fetchQuestions, setSelectedQuestion],
  );

  const clearAllQuestions = useCallback(async () => {
    setClearing(true);
    setError(null);
    try {
      await api.clearQuestionBank();
      setSelectedQuestion(null);
      if (onStatsRefresh) {
        await onStatsRefresh();
      }
      await fetchQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear Question Bank");
      throw err;
    } finally {
      setClearing(false);
    }
  }, [onStatsRefresh, fetchQuestions, setSelectedQuestion]);

  const createOneClickVideo = useCallback(
    async (channelId: string, questionId: string, force: boolean = false) => {
      setBuildingVideo(true);
      setError(null);
      try {
        const res = await api.createOneClickVideo(channelId, {
          question_id: questionId,
          render_aspect_ratio: "16:9",
          auto_start_pipeline: true,
          force,
        });
        await fetchQuestions();
        return res;
      } catch (err: unknown) {
        const errorRecord = typeof err === "object" && err !== null ? (err as Record<string, unknown>) : null;
        const errorMessage = err instanceof Error ? err.message : typeof errorRecord?.message === "string" ? errorRecord.message : "";
        const errorCode = typeof errorRecord?.code === "string" ? errorRecord.code : "";
        const isCooldown =
          errorCode === "QUESTION_IN_COOLDOWN" || errorMessage.includes("QUESTION_IN_COOLDOWN") || errorMessage.includes("cooldown");

        if (isCooldown && !force) {
          const override = window.confirm(
            "This question is currently in a 30-day cooldown on this channel. Do you want to override the cooldown limit and proceed with creating the video?",
          );
          if (override) {
            const retryRes = await api.createOneClickVideo(channelId, {
              question_id: questionId,
              render_aspect_ratio: "16:9",
              auto_start_pipeline: true,
              force: true,
            });
            await fetchQuestions();
            return retryRes;
          }
        }

        const msg = err instanceof Error ? err.message : "Video creation failed";
        setError(msg);
        throw err;
      } finally {
        setBuildingVideo(false);
      }
    },
    [fetchQuestions],
  );

  return {
    questions,
    setQuestions,
    totalQuestions,
    setTotalQuestions,
    loading,
    buildingVideo,
    clearing,
    error,
    setError,
    fetchQuestions,
    saveQuestion,
    deleteQuestion,
    clearAllQuestions,
    createOneClickVideo,
    handleCreateQuestion,
    handleUpdateQuestion,
    handleDeleteQuestion: deleteQuestion,
    handleClearQuestions: clearAllQuestions,
    handleBuildVideo: createOneClickVideo,
  };
}
