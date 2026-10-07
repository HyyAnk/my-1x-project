import { useCallback, useEffect, useState } from "react";
import type { ChannelMotionPreset, SaveChannelMotionPresetRequest } from "@studio/shared";
import { api } from "../../../api";

export interface UseChannelMotionPresetsResult {
  presets: ChannelMotionPreset[];
  isLoading: boolean;
  error: string | null;
  refreshPresets: () => Promise<void>;
  savePreset: (request: SaveChannelMotionPresetRequest) => Promise<boolean>;
  deletePreset: (presetId: string) => Promise<boolean>;
}

export function useChannelMotionPresets(channelId: string | null | undefined): UseChannelMotionPresetsResult {
  const [presets, setPresets] = useState<ChannelMotionPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPresets = useCallback(async () => {
    if (!channelId) {
      setPresets([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.listChannelMotionPresets(channelId);
      setPresets(response.presets);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load channel motion presets";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    void refreshPresets();
  }, [refreshPresets]);

  const savePreset = useCallback(
    async (request: SaveChannelMotionPresetRequest): Promise<boolean> => {
      if (!channelId) return false;
      try {
        await api.saveChannelMotionPreset(channelId, request);
        await refreshPresets();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save preset";
        setError(message);
        return false;
      }
    },
    [channelId, refreshPresets],
  );

  const deletePreset = useCallback(
    async (presetId: string): Promise<boolean> => {
      if (!channelId) return false;
      try {
        await api.deleteChannelMotionPreset(channelId, presetId);
        await refreshPresets();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete preset";
        setError(message);
        return false;
      }
    },
    [channelId, refreshPresets],
  );

  return {
    presets,
    isLoading,
    error,
    refreshPresets,
    savePreset,
    deletePreset,
  };
}
