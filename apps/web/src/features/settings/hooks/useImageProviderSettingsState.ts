import { useEffect, useState, type FormEvent } from "react";
import type { AppConfig, ImageProviderId } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export type UseImageProviderSettingsProps = {
  appConfig: AppConfig | null;
  onImageSaved: (image: AppConfig["image_generation"]) => void | Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function useImageProviderSettingsState({ appConfig, onImageSaved, onNotice }: UseImageProviderSettingsProps) {
  const [imageEnabled, setImageEnabled] = useState(appConfig?.image_generation?.enabled ?? true);
  const [imagesPerBundle, setImagesPerBundle] = useState(appConfig?.image_generation?.images_per_bundle ?? 1);
  const [imageProvider, setImageProvider] = useState<ImageProviderId>(
    (appConfig?.image_generation?.provider as ImageProviderId) ?? "gpti2",
  );
  const [imageBaseUrl, setImageBaseUrl] = useState(appConfig?.image_generation?.base_url ?? "");
  const [imageModel, setImageModel] = useState(appConfig?.image_generation?.model ?? "gpt-image-2");
  const [imageApiKey, setImageApiKey] = useState(appConfig?.image_generation?.api_key ?? "");
  const [showImageKey, setShowImageKey] = useState(false);
  const [hasImageApiKey, setHasImageApiKey] = useState(
    Boolean(appConfig?.image_generation?.has_api_key || appConfig?.image_generation?.api_key),
  );
  const [maxConcurrentImageTasks, setMaxConcurrentImageTasks] = useState(appConfig?.image_generation?.max_concurrent_tasks ?? 3);
  const [savingImage, setSavingImage] = useState(false);
  const [checkingImageBalance, setCheckingImageBalance] = useState(false);
  const [imageBalanceInfo, setImageBalanceInfo] = useState<{ balance_vnd: number; rpm?: number } | null>(null);

  useEffect(() => {
    if (appConfig?.image_generation) {
      setImageEnabled(appConfig.image_generation.enabled);
      setImagesPerBundle(appConfig.image_generation.images_per_bundle);
      setImageProvider(appConfig.image_generation.provider ?? "gpti2");
      setImageBaseUrl(appConfig.image_generation.base_url ?? "");
      setImageModel(appConfig.image_generation.model ?? "gpt-image-2");
      setMaxConcurrentImageTasks(appConfig.image_generation.max_concurrent_tasks ?? 3);
      setHasImageApiKey(Boolean(appConfig.image_generation.has_api_key || appConfig.image_generation.api_key));
      setImageApiKey(appConfig.image_generation.api_key ?? "");
    }
  }, [appConfig]);

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
        ...(imageApiKey.trim() ? { api_key: imageApiKey.trim() } : {}),
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
    const providerLabel = imageProvider === "gpti2" ? "gpti2.store" : imageProvider === "shopaikey" ? "ShopAiKey" : "Custom Provider";
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

  return {
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
  };
}
