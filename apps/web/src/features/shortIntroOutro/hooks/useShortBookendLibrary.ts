import { useCallback, useEffect, useRef, useState } from "react";
import type { QuizShortBookendCategorySummary, QuizShortBookendPair, QuizShortTitleCanvas } from "@studio/shared";
import { quizShortBookendApi } from "../../../api/quizShortBookendApi";
import type { Notice } from "../../../components/types";
import type { ShortBookendBusyAction } from "../types/shortIntroOutro.types";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Loads a channel's Short Intro & Outro pairs and categories, and edits or deletes pairs. */
export function useShortBookendLibrary(channelId: string, onNotice: (notice: NonNullable<Notice>) => void) {
  const [pairs, setPairs] = useState<QuizShortBookendPair[]>([]);
  const [categories, setCategories] = useState<QuizShortBookendCategorySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<ShortBookendBusyAction>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const [pairResponse, categoryResponse] = await Promise.all([
        quizShortBookendApi.listPairs(channelId),
        quizShortBookendApi.listCategories(channelId),
      ]);
      if (version !== requestVersion.current) return;
      setPairs(pairResponse.pairs);
      setCategories(categoryResponse.categories);
    } catch (error) {
      onNotice({ tone: "bad", message: errorMessage(error, "Failed to load Short Intro & Outro pairs") });
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [channelId, onNotice]);

  useEffect(() => {
    void refresh();
    return () => {
      requestVersion.current += 1;
    };
  }, [refresh]);

  const deletePair = async (pair: QuizShortBookendPair) => {
    setBusyAction(`delete:${pair.pair_id}`);
    try {
      await quizShortBookendApi.deletePair(channelId, pair.pair_id);
      await refresh();
      onNotice({ tone: "good", message: `Short pair "${pair.name}" deleted.` });
    } catch (error) {
      onNotice({ tone: "bad", message: errorMessage(error, "Failed to delete the Short pair") });
    } finally {
      setBusyAction(null);
    }
  };

  const saveTitleCanvas = async (pair: QuizShortBookendPair, canvas: QuizShortTitleCanvas): Promise<boolean> => {
    setBusyAction(`canvas:${pair.pair_id}`);
    try {
      const { pair: updated } = await quizShortBookendApi.updatePair(channelId, pair.pair_id, { title_canvas: canvas });
      setPairs((current) => current.map((item) => (item.pair_id === updated.pair_id ? updated : item)));
      onNotice({ tone: "good", message: `Title area of pair "${pair.name}" saved.` });
      return true;
    } catch (error) {
      onNotice({ tone: "bad", message: errorMessage(error, "Failed to save the title area") });
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  return { pairs, categories, loading, busyAction, refresh, deletePair, saveTitleCanvas };
}
