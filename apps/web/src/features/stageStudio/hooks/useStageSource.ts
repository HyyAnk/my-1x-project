import { useCallback, useEffect, useRef, useState } from "react";
import { resolveMascotStageDefaultPlacement, type Channel, type MascotPlacementPreset } from "@studio/shared";
import { api } from "../../../api";
import { STAGE_SOURCE_CHANGED } from "../services/stageSourceEvents";

const EMPTY_CHANNELS: Channel[] = [];

/** Reads confirmed assignments; polling also covers changes in other tabs. */
export function useStageSource(initialChannels: Channel[] = EMPTY_CHANNELS, includeDefault = true) {
  const [channels, setChannels] = useState(initialChannels);
  const [defaultPlacement, setDefaultPlacement] = useState<MascotPlacementPreset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    revision.current += 1;
    setChannels(initialChannels);
  }, [initialChannels]);

  const refresh = useCallback(async () => {
    const requestId = ++revision.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const [response, config] = await Promise.all([
        api.channels(controller.signal),
        includeDefault ? api.config(controller.signal) : null,
      ]);
      if (requestId !== revision.current) return;
      setChannels((current) => (JSON.stringify(current) === JSON.stringify(response.channels) ? current : response.channels));
      if (config) {
        const placement = resolveMascotStageDefaultPlacement(config.mascot_stage, "16:9");
        setDefaultPlacement((current) => (JSON.stringify(current) === JSON.stringify(placement) ? current : placement));
      }
      setError(null);
    } catch {
      if (requestId === revision.current) setError("Stage Studio sync failed. Retrying automatically.");
    } finally {
      clearTimeout(timeout);
    }
  }, [includeDefault]);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await refresh();
      if (!disposed) timer = setTimeout(() => void poll(), 5000);
    };
    void poll();
    const update = () => void refresh();
    window.addEventListener(STAGE_SOURCE_CHANGED, update);
    window.addEventListener("focus", update);
    return () => {
      disposed = true;
      revision.current += 1;
      controllerRef.current?.abort();
      clearTimeout(timer);
      window.removeEventListener(STAGE_SOURCE_CHANGED, update);
      window.removeEventListener("focus", update);
    };
  }, [refresh]);

  return { channels, defaultPlacement, error, refresh };
}
