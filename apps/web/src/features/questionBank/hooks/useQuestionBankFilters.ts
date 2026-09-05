import { useCallback, useEffect, useRef, useState } from "react";
import type { QuestionBankFilters } from "../types/questionBankUi.types";

export const INITIAL_FILTERS: QuestionBankFilters = {
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

export function useQuestionBankFilters(initialChannelId?: string) {
  const [filters, setFilters] = useState<QuestionBankFilters>({
    ...INITIAL_FILTERS,
    channelId: initialChannelId || "",
  });

  // Update when initial channelId from props changes
  const prevInitialChannelIdRef = useRef(initialChannelId);
  useEffect(() => {
    if (initialChannelId !== prevInitialChannelIdRef.current) {
      prevInitialChannelIdRef.current = initialChannelId;
      setFilters((prev) => ({ ...prev, channelId: initialChannelId || "", page: 1 }));
    }
  }, [initialChannelId]);

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

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
  };
}
