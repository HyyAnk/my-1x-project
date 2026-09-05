import { useCallback, useEffect, useState } from "react";
import { api } from "../../../api";
import type {
  BankIndex,
  BankTaxonomy,
  MatrixCoverageStats,
} from "../types/questionBankUi.types";

export interface UseQuestionBankTaxonomyOptions {
  onAfterRecalculate?: () => Promise<void> | void;
}

export function useQuestionBankTaxonomy(options: UseQuestionBankTaxonomyOptions = {}) {
  const { onAfterRecalculate } = options;

  const [taxonomy, setTaxonomy] = useState<BankTaxonomy | null>(null);
  const [stats, setStats] = useState<BankIndex | null>(null);
  const [matrixCoverage, setMatrixCoverage] = useState<MatrixCoverageStats | null>(null);
  const [recalculating, setRecalculating] = useState(false);

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

  // 3. Fetch Matrix Coverage
  const fetchMatrixCoverage = useCallback(async () => {
    try {
      const res = await api.getMatrixCoverageStats();
      if (res.coverage) {
        setMatrixCoverage(res.coverage);
      }
    } catch (err) {
      console.error("Failed to load matrix coverage stats", err);
    }
  }, []);

  // 4. Recalculate Stats & synchronize index
  const recalculateStats = useCallback(async () => {
    setRecalculating(true);
    try {
      const res = await api.recalculateQuestionBankStats();
      setStats(res.stats);
      await fetchMatrixCoverage();
      if (onAfterRecalculate) {
        await onAfterRecalculate();
      }
    } catch (err) {
      console.error("Recalculate failed", err);
    } finally {
      setRecalculating(false);
    }
  }, [fetchMatrixCoverage, onAfterRecalculate]);

  useEffect(() => {
    void fetchTaxonomy();
    void fetchStats();
    void fetchMatrixCoverage();
  }, [fetchTaxonomy, fetchStats, fetchMatrixCoverage]);

  return {
    taxonomy,
    setTaxonomy,
    stats,
    setStats,
    matrixCoverage,
    setMatrixCoverage,
    recalculating,
    fetchTaxonomy,
    fetchStats,
    fetchMatrixCoverage,
    recalculateStats,
  };
}
