import { useEffect, useState } from "react";
import type { IntroOutroStyle } from "@studio/shared";
import { api } from "../../../api";
import type { IntroOutroCategorySummary } from "../../../api/introOutroApi";

export type IntroOutroStyleCatalog = {
  styles: IntroOutroStyle[];
  categories: IntroOutroCategorySummary[];
  loadFailed: boolean;
};

/** Loads the channel's intro/outro styles and category summaries, reloading whenever the dropdown toggles. */
export function useIntroOutroStyleCatalog(channelId: string, isOpen: boolean): IntroOutroStyleCatalog {
  const [styles, setStyles] = useState<IntroOutroStyle[]>([]);
  const [categories, setCategories] = useState<IntroOutroCategorySummary[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    void Promise.all([api.listIntroOutroStyles(channelId), api.listIntroOutroCategories(channelId)])
      .then(([styleResponse, categoryResponse]) => {
        if (!cancelled) {
          setStyles(styleResponse.styles);
          setCategories(categoryResponse.categories);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, isOpen]);

  return { styles, categories, loadFailed };
}
