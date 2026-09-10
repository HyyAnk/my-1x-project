import { useEffect, useState, type FormEvent } from "react";
import type { AppConfig, ImageFallbackConfig } from "@studio/shared";
import { IMGSTUDIO_DEFAULT_MODEL_ID, IMGSTUDIO_MODELS } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export type UseImageFallbackSettingsProps = {
  appConfig: AppConfig | null;
  onFallbackSaved?: (fallback: ImageFallbackConfig) => void | Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function useImageFallbackSettingsState({
  appConfig,
  onFallbackSaved,
  onNotice,
}: UseImageFallbackSettingsProps) {
  const [fallbackEnabled, setFallbackEnabled] = useState(appConfig?.image_fallback?.enabled ?? true);
  const [fallbackModel, setFallbackModel] = useState(
    appConfig?.image_fallback?.model ?? IMGSTUDIO_DEFAULT_MODEL_ID,
  );
  const [fallbackResolution, setFallbackResolution] = useState<"1K" | "2K" | "4K">(
    appConfig?.image_fallback?.resolution ?? "2K",
  );
  const [fallbackQuality, setFallbackQuality] = useState<"standard" | "high">(
    appConfig?.image_fallback?.quality ?? "standard",
  );
  const [fallbackApiKey, setFallbackApiKey] = useState(appConfig?.image_fallback?.api_key ?? "");
  const [fallbackBaseUrl, setFallbackBaseUrl] = useState(
    appConfig?.image_fallback?.base_url ?? "https://imgstudio.site",
  );
  const [showFallbackKey, setShowFallbackKey] = useState(false);
  const [hasFallbackApiKey, setHasFallbackApiKey] = useState(
    Boolean(appConfig?.image_fallback?.has_api_key || appConfig?.image_fallback?.api_key),
  );
  const [savingFallback, setSavingFallback] = useState(false);
  const [verifyingFallback, setVerifyingFallback] = useState(false);
  const [availableModels] = useState(IMGSTUDIO_MODELS);

  useEffect(() => {
    if (appConfig?.image_fallback) {
      setFallbackEnabled(appConfig.image_fallback.enabled);
      setFallbackModel(appConfig.image_fallback.model || IMGSTUDIO_DEFAULT_MODEL_ID);
      setFallbackResolution(appConfig.image_fallback.resolution || "2K");
      setFallbackQuality(appConfig.image_fallback.quality || "standard");
      setFallbackBaseUrl(appConfig.image_fallback.base_url || "https://imgstudio.site");
      setHasFallbackApiKey(
        Boolean(appConfig.image_fallback.has_api_key || appConfig.image_fallback.api_key),
      );
      setFallbackApiKey(appConfig.image_fallback.api_key ?? "");
    }
  }, [appConfig]);

  const saveFallbackSettings = async (event: FormEvent) => {
    event.preventDefault();
    setSavingFallback(true);
    try {
      const response = await api.saveImageFallbackSettings({
        enabled: fallbackEnabled,
        provider: "imgstudio",
        base_url: fallbackBaseUrl.trim() || "https://imgstudio.site",
        model: fallbackModel,
        resolution: fallbackResolution,
        quality: fallbackQuality,
        ...(fallbackApiKey.trim() ? { api_key: fallbackApiKey.trim() } : {}),
      });
      await onFallbackSaved?.(response.settings);
      setHasFallbackApiKey(Boolean(response.settings.has_api_key || response.settings.api_key));
      setFallbackApiKey(response.settings.api_key ?? "");
      onNotice({ tone: "good", message: "Image fallback settings saved successfully" });
    } catch (error) {
      onNotice({
        tone: "bad",
        message: error instanceof Error ? error.message : "Could not save image fallback settings",
      });
    } finally {
      setSavingFallback(false);
    }
  };

  const clearFallbackKey = async () => {
    if (!window.confirm("Are you sure you want to remove the ImgStudio API key?")) return;
    setSavingFallback(true);
    try {
      const response = await api.clearImageFallbackKey();
      await onFallbackSaved?.(response.settings);
      setFallbackApiKey("");
      setHasFallbackApiKey(false);
      onNotice({ tone: "good", message: "ImgStudio API key removed" });
    } catch (error) {
      onNotice({
        tone: "bad",
        message: error instanceof Error ? error.message : "Could not remove API key",
      });
    } finally {
      setSavingFallback(false);
    }
  };

  const verifyFallbackConnection = async () => {
    setVerifyingFallback(true);
    try {
      const result = await api.verifyImageFallback({
        api_key: fallbackApiKey.trim(),
        base_url: fallbackBaseUrl.trim(),
      });
      if (result.ok) {
        onNotice({
          tone: "good",
          message: `Connected successfully to ImgStudio API! (${result.models?.length ?? 10} models verified)`,
        });
      }
    } catch (error) {
      onNotice({
        tone: "bad",
        message: error instanceof Error ? error.message : "ImgStudio connection verification failed",
      });
    } finally {
      setVerifyingFallback(false);
    }
  };

  return {
    fallbackEnabled,
    setFallbackEnabled,
    fallbackModel,
    setFallbackModel,
    fallbackResolution,
    setFallbackResolution,
    fallbackQuality,
    setFallbackQuality,
    fallbackApiKey,
    setFallbackApiKey,
    fallbackBaseUrl,
    setFallbackBaseUrl,
    showFallbackKey,
    setShowFallbackKey,
    hasFallbackApiKey,
    savingFallback,
    verifyingFallback,
    availableModels,
    saveFallbackSettings,
    clearFallbackKey,
    verifyFallbackConnection,
  };
}
