import type { AppConfig } from "@studio/shared";
import type { Notice } from "../../components/types";
import { useMediaSettings } from "./hooks/useMediaSettings";
import { VideoTimingSettingsCard } from "./components/VideoTimingSettingsCard";
import { ImageProviderSettingsCard } from "./components/ImageProviderSettingsCard";
import { TopicDeduplicationSettingsCard } from "./components/TopicDeduplicationSettingsCard";

export interface MediaSettingsTabProps {
  appConfig: AppConfig | null;
  onVideoSaved: (video: AppConfig["video_generation"]) => void | Promise<void>;
  onImageSaved: (image: AppConfig["image_generation"]) => void | Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
}

export function MediaSettingsTab({ appConfig, onVideoSaved, onImageSaved, onNotice }: MediaSettingsTabProps) {
  const {
    maxSceneDuration,
    setMaxSceneDuration,
    narrationWordsPerSecond,
    setNarrationWordsPerSecond,
    aspectRatio,
    setAspectRatio,
    maxConcurrentVideoTasks,
    setMaxConcurrentVideoTasks,
    renderWorkers,
    setRenderWorkers,
    renderQuality,
    setRenderQuality,
    fps,
    setFps,
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
  } = useMediaSettings({
    appConfig,
    onVideoSaved,
    onImageSaved,
    onNotice,
  });

  const maxDuration = appConfig?.video_generation.max_scene_duration_seconds ?? 8;
  const estimatedWpm = Math.round(narrationWordsPerSecond * 60);

  return (
    <div className="settings-grid">
      <VideoTimingSettingsCard
        maxDuration={maxDuration}
        estimatedWpm={estimatedWpm}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        maxConcurrentVideoTasks={maxConcurrentVideoTasks}
        setMaxConcurrentVideoTasks={setMaxConcurrentVideoTasks}
        renderWorkers={renderWorkers}
        setRenderWorkers={setRenderWorkers}
        renderQuality={renderQuality}
        setRenderQuality={setRenderQuality}
        fps={fps}
        setFps={setFps}
        maxSceneDuration={maxSceneDuration}
        setMaxSceneDuration={setMaxSceneDuration}
        narrationWordsPerSecond={narrationWordsPerSecond}
        setNarrationWordsPerSecond={setNarrationWordsPerSecond}
        savingVideo={savingVideo}
        onSaveVideo={saveVideo}
      />

      <ImageProviderSettingsCard
        imageProvider={imageProvider}
        setImageProvider={setImageProvider}
        hasImageApiKey={hasImageApiKey}
        imageApiKey={imageApiKey}
        setImageApiKey={setImageApiKey}
        showImageKey={showImageKey}
        setShowImageKey={setShowImageKey}
        imageBalanceInfo={imageBalanceInfo}
        imageEnabled={imageEnabled}
        setImageEnabled={setImageEnabled}
        imageBaseUrl={imageBaseUrl}
        setImageBaseUrl={setImageBaseUrl}
        imageModel={imageModel}
        setImageModel={setImageModel}
        maxConcurrentImageTasks={maxConcurrentImageTasks}
        setMaxConcurrentImageTasks={setMaxConcurrentImageTasks}
        imagesPerBundle={imagesPerBundle}
        setImagesPerBundle={setImagesPerBundle}
        savingImage={savingImage}
        checkingImageBalance={checkingImageBalance}
        onSaveImage={saveImage}
        onClearImageKey={clearImageKey}
        onCheckImageBalance={checkImageBalance}
      />

      <TopicDeduplicationSettingsCard
        historyEnabled={historyEnabled}
        setHistoryEnabled={setHistoryEnabled}
        passThreshold={passThreshold}
        setPassThreshold={setPassThreshold}
        ttlDays={ttlDays}
        setTtlDays={setTtlDays}
        autoRemix={autoRemix}
        setAutoRemix={setAutoRemix}
        savingHistory={savingHistory}
        onSaveHistory={saveHistory}
      />
    </div>
  );
}
