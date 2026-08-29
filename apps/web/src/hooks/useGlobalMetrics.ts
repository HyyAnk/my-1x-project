import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

export type ImageBalanceInfo = { balance_vnd: number; rpm?: number };
export type VoiceMetricsInfo = {
  rendered_characters: number;
  rendered_duration_seconds: number;
  rendered_segments_count: number;
  rendered_episodes_count: number;
};

export function useGlobalMetrics() {
  const [imageBalance, setImageBalance] = useState<ImageBalanceInfo | null>(null);
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceMetricsInfo | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setLoadingBalance(true);
      const [res, vmRes] = await Promise.allSettled([api.imageBalance(), api.voiceRenderedMetrics()]);
      if (res.status === "fulfilled") {
        setImageBalance(res.value);
        setBalanceError(null);
      } else {
        setImageBalance(null);
        setBalanceError(res.reason instanceof Error ? res.reason.message : "Failed to load balance");
      }
      if (vmRes.status === "fulfilled") {
        setVoiceMetrics(vmRes.value);
      }
    } catch (err) {
      setImageBalance(null);
      setBalanceError(err instanceof Error ? err.message : "Failed to load balance");
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    void fetchBalance();
    const interval = setInterval(() => {
      void fetchBalance();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return {
    imageBalance,
    voiceMetrics,
    loadingBalance,
    balanceError,
    fetchBalance,
    setVoiceMetrics,
  };
}
