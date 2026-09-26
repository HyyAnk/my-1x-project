import { useCallback, useEffect, useRef, useState } from "react";
import { loadPairResources, type PairResource } from "./pairResourceApi";

export function usePairResources(channelId: string, stylePresetId: string) {
  const [resources, setResources] = useState<PairResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    setLoading(true);
    setError(false);
    try {
      const result = await loadPairResources(channelId, stylePresetId);
      if (current === version.current) setResources(result.resources);
    } catch {
      if (current === version.current) setError(true);
    } finally {
      if (current === version.current) setLoading(false);
    }
  }, [channelId, stylePresetId]);
  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      version.current++;
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  return { resources, loading, error, refresh };
}
