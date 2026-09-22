import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Channel, ChannelAssetsOverviewResponse } from "@studio/shared";
import { api } from "../../../api";
import { useChannelOrder, loadSavedOrder } from "../../channel/hooks/useChannelOrder";
import type { ChannelSortOption } from "../../channel/hooks/useChannelFilterSort";

export type { ChannelSortOption };

export interface UseBrandAssetsOverviewOptions {
  channels: Channel[];
}

export interface UseBrandAssetsOverviewReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortBy: ChannelSortOption;
  setSortBy: (sort: ChannelSortOption) => void;
  hasCustomOrder: boolean;
  filteredChannels: Channel[];
  channelOverviews: Record<string, ChannelAssetsOverviewResponse | null>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function createFallbackOverview(channel: Channel): ChannelAssetsOverviewResponse {
  return {
    channel_id: channel.channel_id,
    channel_slug: channel.slug,
    manifest: {
      version: 1,
      updated_at: "",
      brand: {},
      social: {},
      art: [],
    },
    mascot: null,
  };
}

export function useBrandAssetsOverview({
  channels,
}: UseBrandAssetsOverviewOptions): UseBrandAssetsOverviewReturn {
  const { orderedChannels, hasCustomOrder } = useChannelOrder(channels);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<ChannelSortOption>(() =>
    loadSavedOrder()?.length ? "custom" : "latest",
  );
  const [channelOverviews, setChannelOverviews] = useState<
    Record<string, ChannelAssetsOverviewResponse | null>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If custom order is cleared externally, fall back to "latest"
  useEffect(() => {
    if (!hasCustomOrder && sortBy === "custom") {
      setSortBy("latest");
    }
  }, [hasCustomOrder, sortBy]);

  // Fast index map to honor the custom order set in Channels tab
  const orderIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    orderedChannels.forEach((c, idx) => map.set(c.channel_id, idx));
    return map;
  }, [orderedChannels]);

  // In-memory cache ref to retain fetched overviews across filter/search operations
  const cacheRef = useRef<Record<string, ChannelAssetsOverviewResponse>>({});

  const fetchChannelOverview = useCallback(async (channel: Channel): Promise<ChannelAssetsOverviewResponse> => {
    if (cacheRef.current[channel.channel_id]) {
      return cacheRef.current[channel.channel_id];
    }
    try {
      const response = await api.channelAssets.getChannelAssets(channel.channel_id);
      cacheRef.current[channel.channel_id] = response;
      return response;
    } catch {
      const fallback = createFallbackOverview(channel);
      cacheRef.current[channel.channel_id] = fallback;
      return fallback;
    }
  }, []);

  const fetchAllOverviews = useCallback(async (targetChannels: Channel[]) => {
    if (targetChannels.length === 0) {
      setChannelOverviews({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        targetChannels.map((channel) => fetchChannelOverview(channel)),
      );

      const nextOverviews: Record<string, ChannelAssetsOverviewResponse | null> = {};
      targetChannels.forEach((channel, index) => {
        nextOverviews[channel.channel_id] = results[index] ?? null;
      });

      setChannelOverviews(nextOverviews);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load channel asset overviews");
    } finally {
      setIsLoading(false);
    }
  }, [fetchChannelOverview]);

  const channelsRef = useRef(channels);
  channelsRef.current = channels;

  const channelKey = useMemo(
    () => channels.map((c) => `${c.channel_id}:${c.updated_at ?? ""}`).join(","),
    [channels],
  );

  useEffect(() => {
    void fetchAllOverviews(channelsRef.current);
  }, [channelKey, fetchAllOverviews]);

  const refresh = useCallback(async () => {
    cacheRef.current = {};
    await fetchAllOverviews(channelsRef.current);
  }, [fetchAllOverviews]);

  const filteredChannels = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    const matches = trimmed
      ? channels.filter((ch) => {
          const name = ch.display_name?.toLowerCase() ?? "";
          const slug = ch.slug?.toLowerCase() ?? "";
          return name.includes(trimmed) || slug.includes(trimmed);
        })
      : [...channels];

    return matches.sort((a, b) => {
      if (sortBy === "custom" && hasCustomOrder) {
        return (orderIndexMap.get(a.channel_id) ?? 0) - (orderIndexMap.get(b.channel_id) ?? 0);
      }
      if (sortBy === "episodes") {
        return (b.episode_count || 0) - (a.episode_count || 0);
      }
      if (sortBy === "name") {
        return (a.display_name || "").localeCompare(b.display_name || "");
      }
      // Default to "latest" updated channels first (exact same ordering as Channels tab)
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [channels, searchTerm, sortBy, hasCustomOrder, orderIndexMap]);

  return {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    hasCustomOrder,
    filteredChannels,
    channelOverviews,
    isLoading,
    error,
    refresh,
  };
}
