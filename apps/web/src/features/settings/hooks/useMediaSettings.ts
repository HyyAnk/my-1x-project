import { useEffect, useState, type FormEvent } from "react";
import type { AppConfig } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";
import { useVideoSettingsState } from "./useVideoSettingsState";
import { useImageProviderSettingsState } from "./useImageProviderSettingsState";

export type UseMediaSettingsProps = {
  appConfig: AppConfig | null;
  onVideoSaved: (video: AppConfig["video_generation"]) => void | Promise<void>;
  onImageSaved: (image: AppConfig["image_generation"]) => void | Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function useMediaSettings({ appConfig, onVideoSaved, onImageSaved, onNotice }: UseMediaSettingsProps) {
  const videoState = useVideoSettingsState({ appConfig, onVideoSaved, onNotice });
  const imageState = useImageProviderSettingsState({ appConfig, onImageSaved, onNotice });

  const [historyEnabled, setHistoryEnabled] = useState(appConfig?.question_history?.enabled ?? true);
  const [passThreshold, setPassThreshold] = useState(appConfig?.question_history?.pass_threshold ?? 2);
  const [ttlDays, setTtlDays] = useState(appConfig?.question_history?.ttl_days ?? 30);
  const [autoRemix, setAutoRemix] = useState(appConfig?.question_history?.auto_remix ?? false);
  const [savingHistory, setSavingHistory] = useState(false);

  useEffect(() => {
    if (appConfig?.question_history) {
      setHistoryEnabled(appConfig.question_history.enabled ?? true);
      setPassThreshold(appConfig.question_history.pass_threshold ?? 2);
      setTtlDays(appConfig.question_history.ttl_days ?? 30);
      setAutoRemix(appConfig.question_history.auto_remix ?? false);
    }
  }, [appConfig]);

  const saveHistory = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSavingHistory(true);
      await api.saveHistorySettings({
        enabled: historyEnabled,
        pass_threshold: passThreshold,
        ttl_days: ttlDays,
        auto_remix: autoRemix,
      });
      onNotice({ tone: "good", message: "Saved Question History & Anti-Duplicate settings successfully!" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Failed to save history settings" });
    } finally {
      setSavingHistory(false);
    }
  };

  return {
    ...videoState,
    ...imageState,
    historyEnabled,
    setHistoryEnabled,
    passThreshold,
    setPassThreshold,
    ttlDays,
    setTtlDays,
    autoRemix,
    setAutoRemix,
    savingHistory,
    saveHistory,
  };
}
