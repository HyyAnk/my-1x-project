import { useEffect, useState, type FormEvent } from "react";
import type { AppConfig, ImageProviderId } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

type UseMediaSettingsProps = {
  appConfig: AppConfig | null;
  onVideoSaved: (video: AppConfig["video_generation"]) => void | Promise<void>;
  onImageSaved: (image: AppConfig["image_generation"]) => void | Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function useMediaSettings({
  appConfig,
  onVideoSaved,
  onImageSaved,
  onNotice,
}: UseMediaSettingsProps) {
  const [maxSceneDuration, setMaxSceneDuration] = useState(
    appConfig?.video_generation.max_scene_duration_seconds ?? 8
  );
  const [narrationWordsPerSecond, setNarrationWordsPerSecond] = useState(
    appConfig?.video_generation.narration_words_per_second ?? 2.3
  );
  const [maxConcurrentVideoTasks, setMaxConcurrentVideoTasks] = useState(
    appConfig?.video_generation.max_concurrent_tasks ?? 2
  );
  const [savingVideo, setSavingVideo] = useState(false);

  const [imageEnabled, setImageEnabled] = useState(appConfig?.image_generation?.enabled ?? true);
  const [imagesPerBundle, setImagesPerBundle] = useState(appConfig?.image_generation?.images_per_bundle ?? 1);
  const [imageProvider, setImageProvider] = useState<ImageProviderId>(
    (appConfig?.image_generation?.provider as ImageProviderId) ?? "gpti2"
  );
  const [imageBaseUrl, setImageBaseUrl] = useState(appConfig?.image_generation?.base_url ?? "");
  const [imageModel, setImageModel] = useState(appConfig?.image_generation?.model ?? "gpt-image-2");
  const [imageApiKey, setImageApiKey] = useState(appConfig?.image_generation?.api_key ?? "");
  const [showImageKey, setShowImageKey] = useState(false);
  const [hasImageApiKey, setHasImageApiKey] = useState(
    Boolean(appConfig?.image_generation?.has_api_key || appConfig?.image_generation?.api_key)
  );
  const [maxConcurrentImageTasks, setMaxConcurrentImageTasks] = useState(
    appConfig?.image_generation?.max_concurrent_tasks ?? 3
  );
  const [savingImage, setSavingImage] = useState(false);
  const [checkingImageBalance, setCheckingImageBalance] = useState(false);
  const [imageBalanceInfo, setImageBalanceInfo] = useState<{ balance_vnd: number; rpm?: number } | null>(null);

  const [historyEnabled, setHistoryEnabled] = useState(appConfig?.question_history?.enabled ?? true);
  const [passThreshold, setPassThreshold] = useState(appConfig?.question_history?.pass_threshold ?? 2);
  const [ttlDays, setTtlDays] = useState(appConfig?.question_history?.ttl_days ?? 30);
  const [autoRemix, setAutoRemix] = useState(appConfig?.question_history?.auto_remix ?? false);
  const [savingHistory, setSavingHistory] = useState(false);

  useEffect(() => {
    const video = appConfig?.video_generation;
    if (video) {
      setMaxSceneDuration(video.max_scene_duration_seconds ?? 8);
      setNarrationWordsPerSecond(video.narration_words_per_second ?? 2.3);
      setMaxConcurrentVideoTasks(video.max_concurrent_tasks ?? 2);
    }
    if (appConfig?.image_generation) {
      setImageEnabled(appConfig.image_generation.enabled);
      setImagesPerBundle(appConfig.image_generation.images_per_bundle);
      setImageProvider((appConfig.image_generation.provider as ImageProviderId) ?? "gpti2");
      setImageBaseUrl(appConfig.image_generation.base_url ?? "");
      setImageModel(appConfig.image_generation.model ?? "gpt-image-2");
      setMaxConcurrentImageTasks(appConfig.image_generation.max_concurrent_tasks ?? 3);
      setHasImageApiKey(Boolean(appConfig.image_generation.has_api_key || appConfig.image_generation.api_key));
      setImageApiKey(appConfig.image_generation.api_key ?? "");
    }
    if (appConfig?.question_history) {
      setHistoryEnabled(appConfig.question_history.enabled ?? true);
      setPassThreshold(appConfig.question_history.pass_threshold ?? 2);
      setTtlDays(appConfig.question_history.ttl_days ?? 30);
      setAutoRemix(appConfig.question_history.auto_remix ?? false);
    }
  }, [appConfig]);

  const saveVideo = async (event: FormEvent) => {
    event.preventDefault();
    setSavingVideo(true);
    try {
      const next = await api.saveVideoSettings({
        max_scene_duration_seconds: maxSceneDuration,
        narration_words_per_second: narrationWordsPerSecond,
        max_concurrent_tasks: maxConcurrentVideoTasks,
      });
      await onVideoSaved(next.video_generation);
      onNotice({ tone: "good", message: "Video settings saved locally" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not save video settings" });
    } finally {
      setSavingVideo(false);
    }
  };

  const saveImage = async (event: FormEvent) => {
    event.preventDefault();
    setSavingImage(true);
    try {
      const next = await api.saveImageSettings({
        enabled: imageEnabled,
        images_per_bundle: imagesPerBundle,
        provider: imageProvider,
        base_url: imageBaseUrl.trim(),
        model: imageModel.trim() || "gpt-image-2",
        quality: "low",
        max_concurrent_tasks: maxConcurrentImageTasks,
        api_key: imageApiKey.trim(),
      });
      await onImageSaved(next.image_generation);
      setHasImageApiKey(Boolean(next.image_generation.api_key || next.image_generation.has_api_key));
      setImageApiKey(next.image_generation.api_key ?? "");
      onNotice({ tone: "good", message: "Image generation settings saved" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not save image settings" });
    } finally {
      setSavingImage(false);
    }
  };

  const clearImageKey = async () => {
    const providerLabel =
      imageProvider === "gpti2"
        ? "gpti2.store"
        : imageProvider === "shopaikey"
        ? "ShopAiKey"
        : "Custom Provider";
    if (!window.confirm(`Are you sure you want to remove this ${providerLabel} API key?`)) return;
    setSavingImage(true);
    try {
      const next = await api.saveImageSettings({
        api_key: "",
      });
      await onImageSaved(next.image_generation);
      setImageApiKey("");
      setHasImageApiKey(false);
      setImageBalanceInfo(null);
      onNotice({ tone: "good", message: `${providerLabel} API key removed` });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not remove API key" });
    } finally {
      setSavingImage(false);
    }
  };

  const checkImageBalance = async () => {
    setCheckingImageBalance(true);
    try {
      const result = await api.verifyImageConnection({
        provider: imageProvider,
        api_key: imageApiKey.trim(),
        base_url: imageBaseUrl.trim(),
        model: imageModel.trim(),
      });
      if (result.balance_vnd !== undefined) {
        setImageBalanceInfo({ balance_vnd: result.balance_vnd, rpm: result.rpm });
        onNotice({
          tone: "good",
          message: `Valid API key! Balance: ${result.balance_vnd.toLocaleString("en-US")} VND${result.rpm ? ` (RPM: ${result.rpm})` : ""}`,
        });
      } else {
        setImageBalanceInfo(null);
        onNotice({
          tone: "good",
          message: result.message || "Connected to image provider successfully!",
        });
      }
    } catch (error) {
      setImageBalanceInfo(null);
      onNotice({
        tone: "bad",
        message: error instanceof Error ? error.message : "API key verification failed",
      });
    } finally {
      setCheckingImageBalance(false);
    }
  };

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
    maxSceneDuration,
    setMaxSceneDuration,
    narrationWordsPerSecond,
    setNarrationWordsPerSecond,
    maxConcurrentVideoTasks,
    setMaxConcurrentVideoTasks,
    savingVideo,
    saveVideo,
    imageEnabled,
    setImageEnabled,
    imagesPerBundle,
    setImagesPerBundle,
    imageProvider,
    setImageProvider,
    imageBaseUrl,
    setImageBaseUrl,
    imageModel,
    setImageModel,
    imageApiKey,
    setImageApiKey,
    showImageKey,
    setShowImageKey,
    hasImageApiKey,
    maxConcurrentImageTasks,
    setMaxConcurrentImageTasks,
    savingImage,
    checkingImageBalance,
    imageBalanceInfo,
    saveImage,
    clearImageKey,
    checkImageBalance,
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
