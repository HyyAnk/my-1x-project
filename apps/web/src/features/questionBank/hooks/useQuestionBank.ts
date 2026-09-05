import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../api";
import type {
  BankIndex,
  BankQuestion,
  BankQuestionWithCooldown,
  BankTaxonomy,
  QuestionBankBatchGenPayload,
  QuestionBankBatchGenResponse,
  QuestionBankFilters,
  QuestionBankModalState,
} from "../types/questionBankUi.types";

const INITIAL_FILTERS: QuestionBankFilters = {
  channelId: "",
  archetypeId: "",
  domainId: "",
  subtopicId: "",
  status: "",
  cooldownFilter: "all",
  languageFilter: "",
  translationFilter: "all",
  search: "",
  page: 1,
  pageSize: 20,
};

export function useQuestionBank(initialChannelId?: string) {
  const [taxonomy, setTaxonomy] = useState<BankTaxonomy | null>(null);
  const [stats, setStats] = useState<BankIndex | null>(null);
  const [questions, setQuestions] = useState<BankQuestionWithCooldown[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [buildingVideo, setBuildingVideo] = useState(false);
  const [transcreating, setTranscreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<QuestionBankFilters>({
    ...INITIAL_FILTERS,
    channelId: initialChannelId || "",
  });

  const [selectedQuestion, setSelectedQuestion] = useState<BankQuestionWithCooldown | null>(null);
  const [modalState, setModalState] = useState<QuestionBankModalState>({ type: null });
  const [batchGenResult, setBatchGenResult] = useState<QuestionBankBatchGenResponse | null>(null);
  const [previewAspect, setPreviewAspect] = useState<"16:9" | "9:16">("16:9");

  // 1. Fetch Taxonomy tree
  const fetchTaxonomy = useCallback(async () => {
    try {
      const res = await api.getQuestionBankTaxonomy();
      setTaxonomy(res.taxonomy);
    } catch (err) {
      console.error("Failed to load taxonomy", err);
    }
  }, []);

  // 2. Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.getQuestionBankStats();
      setStats(res.stats);
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  }, []);

  // 3. Fetch Questions list
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
        language: filters.languageFilter || undefined,
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
          return qLang === targetLang;
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
  }, [filters]);

  // Update when initial channelId from props changes
  const prevInitialChannelIdRef = useRef(initialChannelId);
  useEffect(() => {
    if (initialChannelId !== prevInitialChannelIdRef.current) {
      prevInitialChannelIdRef.current = initialChannelId;
      setFilters((prev) => ({ ...prev, channelId: initialChannelId || "", page: 1 }));
    }
  }, [initialChannelId]);

  useEffect(() => {
    void fetchTaxonomy();
    void fetchStats();
  }, [fetchTaxonomy, fetchStats]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  // 4. Resync Index
  const recalculateStats = useCallback(async () => {
    setRecalculating(true);
    try {
      const res = await api.recalculateQuestionBankStats();
      setStats(res.stats);
      await fetchQuestions();
    } catch (err) {
      console.error("Recalculate failed", err);
    } finally {
      setRecalculating(false);
    }
  }, [fetchQuestions]);

  // 5. Update Filters
  const updateFilter = useCallback(<K extends keyof QuestionBankFilters>(key: K, value: QuestionBankFilters[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === "page" ? (value as number) : 1,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS, channelId: filters.channelId });
  }, [filters.channelId]);

  // 6. CRUD Operations
  const saveQuestion = useCallback(
    async (q: BankQuestion) => {
      if (modalState.type === "edit" && modalState.question?.id) {
        await api.updateQuestionBankQuestion(modalState.question.id, q);
      } else {
        await api.createQuestionBankQuestion(q);
      }
      setModalState({ type: null });
      await fetchStats();
      await fetchQuestions();
    },
    [modalState, fetchStats, fetchQuestions],
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
      await fetchStats();
      await fetchQuestions();
    },
    [selectedQuestion, fetchStats, fetchQuestions],
  );

  // 7. Generate AI Batch
  const generateBatch = useCallback(
    async (payload: QuestionBankBatchGenPayload) => {
      setGenerating(true);
      setError(null);
      try {
        const res = await api.generateQuestionBankBatch(payload);
        setBatchGenResult(res);
        await fetchStats();
        await fetchQuestions();
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Batch generation failed";
        setError(msg);
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    [fetchStats, fetchQuestions],
  );

  // 8. 1-Click Video Creation
  const createOneClickVideo = useCallback(
    async (channelId: string, questionId: string, aspect: "9:16" | "16:9" = "9:16", force: boolean = false) => {
      setBuildingVideo(true);
      setError(null);
      try {
        const res = await api.createOneClickVideo(channelId, {
          question_id: questionId,
          render_aspect_ratio: aspect,
          auto_start_pipeline: true,
          force,
        });
        await fetchQuestions();
        return res;
      } catch (err: any) {
        const isCooldown =
          err?.code === "QUESTION_IN_COOLDOWN" || err?.message?.includes("QUESTION_IN_COOLDOWN") || err?.message?.includes("cooldown");

        if (isCooldown && !force) {
          const override = window.confirm(
            "This question is currently in a 30-day cooldown on this channel. Do you want to override the cooldown limit and proceed with creating the video?",
          );
          if (override) {
            const retryRes = await api.createOneClickVideo(channelId, {
              question_id: questionId,
              render_aspect_ratio: aspect,
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

  // 9. On-Demand Multilingual Transcreation
  const transcreateQuestion = useCallback(
    async (questionId: string, targetLanguage: string = "es") => {
      setTranscreating(true);
      setError(null);
      try {
        const res = await api.transcreateQuestion(questionId, {
          target_language: targetLanguage,
          channel_id: filters.channelId || undefined,
        });

        // Update selectedQuestion if currently selected
        setSelectedQuestion((prev) => {
          if (prev && prev.id === questionId) {
            return {
              ...prev,
              translations: {
                ...(prev.translations || {}),
                [res.language]: res.content,
              },
            };
          }
          return prev;
        });

        // Update questions list in place so table immediately reflects the new translation badge
        setQuestions((prevList) =>
          prevList.map((q) => {
            if (q.id === questionId) {
              return {
                ...q,
                translations: {
                  ...(q.translations || {}),
                  [res.language]: res.content,
                },
              };
            }
            return q;
          }),
        );

        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Question translation failed";
        setError(msg);
        throw err;
      } finally {
        setTranscreating(false);
      }
    },
    [filters.channelId],
  );

  return {
    taxonomy,
    stats,
    questions,
    totalQuestions,
    loading,
    recalculating,
    generating,
    buildingVideo,
    transcreating,
    error,
    filters,
    selectedQuestion,
    modalState,
    batchGenResult,
    previewAspect,
    updateFilter,
    resetFilters,
    setSelectedQuestion,
    setModalState,
    setBatchGenResult,
    setPreviewAspect,
    recalculateStats,
    saveQuestion,
    deleteQuestion,
    generateBatch,
    createOneClickVideo,
    transcreateQuestion,
    refresh: fetchQuestions,
  };
}
