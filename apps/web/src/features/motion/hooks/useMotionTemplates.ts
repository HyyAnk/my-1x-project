import { useCallback, useEffect, useMemo, useState } from "react";
import type { MotionTemplateDefinition, MotionTemplatePlacement } from "@studio/shared";
import { api } from "../../../api";
import type { MotionCategoryFilter, MotionPlacementFilter } from "../types/motionUi.types";

export interface UseMotionTemplatesResult {
  templates: MotionTemplateDefinition[];
  filteredTemplates: MotionTemplateDefinition[];
  isLoading: boolean;
  error: string | null;
  placementFilter: MotionPlacementFilter;
  categoryFilter: MotionCategoryFilter;
  searchQuery: string;
  setPlacementFilter: (placement: MotionPlacementFilter) => void;
  setCategoryFilter: (category: MotionCategoryFilter) => void;
  setSearchQuery: (query: string) => void;
  refreshTemplates: () => Promise<void>;
}

export function useMotionTemplates(initialPlacement: MotionPlacementFilter = "all"): UseMotionTemplatesResult {
  const [templates, setTemplates] = useState<MotionTemplateDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placementFilter, setPlacementFilter] = useState<MotionPlacementFilter>(initialPlacement);
  const [categoryFilter, setCategoryFilter] = useState<MotionCategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const refreshTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.listMotionTemplates();
      setTemplates(response.templates);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load motion templates";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      if (placementFilter !== "all" && template.placement !== placementFilter) {
        return false;
      }
      if (categoryFilter !== "all" && template.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = template.name.toLowerCase().includes(query);
        const matchesDesc = template.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) {
          return false;
        }
      }
      return true;
    });

  }, [templates, placementFilter, categoryFilter, searchQuery]);

  return {
    templates,
    filteredTemplates,
    isLoading,
    error,
    placementFilter,
    categoryFilter,
    searchQuery,
    setPlacementFilter,
    setCategoryFilter,
    setSearchQuery,
    refreshTemplates,
  };
}
