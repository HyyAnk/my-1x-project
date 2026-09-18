import { useMemo, useState } from "react";
import { TARGET_COUNTRY_LANGUAGES, matchChannelLanguage, type Channel } from "@studio/shared";

export type ChannelSortOption = "custom" | "latest" | "episodes" | "name";

export interface UseChannelFilterSortOptions {
  channels: Channel[];
  orderedChannels: Channel[];
  isReordering: boolean;
  hasCustomOrder?: boolean;
  onStartReordering?: () => void;
}

export function useChannelFilterSort(
  channelsOrOptions: Channel[] | UseChannelFilterSortOptions,
  orderedChannelsParam?: Channel[],
  isReorderingParam?: boolean,
  extraOptions?: { hasCustomOrder?: boolean; onStartReordering?: () => void },
) {
  const isOptionsObject = !Array.isArray(channelsOrOptions);

  const channels = isOptionsObject ? channelsOrOptions.channels : channelsOrOptions;
  const orderedChannels = isOptionsObject ? channelsOrOptions.orderedChannels : (orderedChannelsParam ?? []);
  const isReordering = isOptionsObject ? channelsOrOptions.isReordering : (isReorderingParam ?? false);
  const hasCustomOrder = isOptionsObject ? channelsOrOptions.hasCustomOrder : extraOptions?.hasCustomOrder;
  const onStartReordering = isOptionsObject ? channelsOrOptions.onStartReordering : extraOptions?.onStartReordering;

  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<ChannelSortOption>(() => (hasCustomOrder ? "custom" : "latest"));

  // Compute channel counts for each synchronized target language
  const languageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lang of TARGET_COUNTRY_LANGUAGES) {
      counts[lang.key] = 0;
    }
    for (const c of channels) {
      for (const lang of TARGET_COUNTRY_LANGUAGES) {
        if (matchChannelLanguage(c, lang.key)) {
          counts[lang.key] = (counts[lang.key] || 0) + 1;
        }
      }
    }
    return counts;
  }, [channels]);

  // Create an index map for fast custom sorting
  const orderIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    orderedChannels.forEach((c, idx) => map.set(c.channel_id, idx));
    return map;
  }, [orderedChannels]);

  const filteredChannels = useMemo(() => {
    const baseList = isReordering ? orderedChannels : channels;

    return [...baseList]
      .filter((c) => {
        if (isReordering) return true; // Show all channels during reordering
        if (languageFilter !== "all" && !matchChannelLanguage(c, languageFilter)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (isReordering || sortBy === "custom") {
          return (orderIndexMap.get(a.channel_id) ?? 0) - (orderIndexMap.get(b.channel_id) ?? 0);
        }
        if (sortBy === "episodes") {
          return (b.episode_count || 0) - (a.episode_count || 0);
        }
        if (sortBy === "name") {
          return a.display_name.localeCompare(b.display_name);
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [channels, orderedChannels, orderIndexMap, isReordering, languageFilter, sortBy]);

  const handleStartReordering = () => {
    setLanguageFilter("all");
    setSortBy("custom");
    if (onStartReordering) {
      onStartReordering();
    }
  };

  return {
    languageFilter,
    setLanguageFilter,
    sortBy,
    setSortBy,
    languageCounts,
    filteredChannels,
    handleStartReordering,
  };
}

export type UseChannelFilterSortReturn = ReturnType<typeof useChannelFilterSort>;
