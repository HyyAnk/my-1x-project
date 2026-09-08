import { useCallback, useRef } from "react";
import type { MatrixCoverageStats } from "../types/questionBankUi.types";
import { useQuestionBankFilters } from "./useQuestionBankFilters";
import { useQuestionBankModals } from "./useQuestionBankModals";
import { useQuestionBankTaxonomy } from "./useQuestionBankTaxonomy";
import { useQuestionBankList } from "./useQuestionBankList";
import { useQuestionBankBatchJob } from "./useQuestionBankBatchJob";

export * from "./useQuestionBankTaxonomy";
export * from "./useQuestionBankFilters";
export * from "./useQuestionBankModals";
export * from "./useQuestionBankList";
export * from "./useQuestionBankBatchJob";

export function useQuestionBank(initialChannelId?: string) {
  // 1. Filter State
  const filterState = useQuestionBankFilters(initialChannelId);

  // 2. Modals & UI Selection State
  const modals = useQuestionBankModals();

  // 3. Mutable ref for fetchQuestions to avoid cyclic dependency
  const fetchQuestionsRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // 4. Taxonomy & Stats State
  const taxonomy = useQuestionBankTaxonomy({
    onAfterRecalculate: () => fetchQuestionsRef.current?.(),
  });

  const onStatsRefresh = useCallback(async () => {
    await taxonomy.fetchStats();
    await taxonomy.fetchMatrixCoverage();
  }, [taxonomy]);

  // 5. Question List & CRUD Operations
  const list = useQuestionBankList({
    filters: filterState.filters,
    selectedQuestion: modals.selectedQuestion,
    setSelectedQuestion: modals.setSelectedQuestion,
    modalState: modals.modalState,
    setModalState: modals.setModalState,
    onStatsRefresh,
  });

  fetchQuestionsRef.current = list.fetchQuestions;

  // 6. Background Batch Generation Job
  const onRefreshBatchData = useCallback(async () => {
    await list.fetchQuestions();
    await taxonomy.fetchStats();
    await taxonomy.fetchMatrixCoverage();
  }, [list.fetchQuestions, taxonomy]);

  const onMatrixCoverageUpdate = useCallback(
    (coverage: MatrixCoverageStats) => {
      taxonomy.setMatrixCoverage(coverage);
    },
    [taxonomy],
  );

  const onBatchError = useCallback(
    (msg: string) => {
      list.setError(msg);
    },
    [list],
  );

  const batch = useQuestionBankBatchJob({
    onRefreshData: onRefreshBatchData,
    onMatrixCoverageUpdate,
    onError: onBatchError,
  });

  return {
    // Taxonomy & Stats
    taxonomy: taxonomy.taxonomy,
    stats: taxonomy.stats,
    matrixCoverage: taxonomy.matrixCoverage,
    recalculating: taxonomy.recalculating,
    recalculateStats: taxonomy.recalculateStats,
    fetchMatrixCoverage: taxonomy.fetchMatrixCoverage,

    // Question List & Item Actions
    questions: list.questions,
    totalQuestions: list.totalQuestions,
    loading: list.loading,
    buildingVideo: list.buildingVideo,
    transcreating: list.transcreating,
    clearing: list.clearing,
    error: list.error,
    saveQuestion: list.saveQuestion,
    deleteQuestion: list.deleteQuestion,
    clearAllQuestions: list.clearAllQuestions,
    createOneClickVideo: list.createOneClickVideo,
    transcreateQuestion: list.transcreateQuestion,
    refresh: list.fetchQuestions,

    // Filters
    filters: filterState.filters,
    updateFilter: filterState.updateFilter,
    resetFilters: filterState.resetFilters,

    // Modals & Active Selections
    selectedQuestion: modals.selectedQuestion,
    setSelectedQuestion: modals.setSelectedQuestion,
    modalState: modals.modalState,
    setModalState: modals.setModalState,

    // Batch Generation & Polling Job
    generating: batch.generating,
    batchGenResult: batch.batchGenResult,
    setBatchGenResult: batch.setBatchGenResult,
    batchJob: batch.batchJob,
    generateBatch: batch.generateBatch,
    cancelBatchJob: batch.cancelBatchJob,
    dismissJobBar: batch.dismissJobBar,
  };
}
