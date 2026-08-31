import { useEffect, useState, type FormEvent } from "react";
import type { AppConfig, MascotRenderAspectRatio } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export type UseVideoSettingsProps = {
  appConfig: AppConfig | null;
  onVideoSaved: (video: AppConfig["video_generation"]) => void | Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function useVideoSettingsState({ appConfig, onVideoSaved, onNotice }: UseVideoSettingsProps) {
  const [maxSceneDuration, setMaxSceneDuration] = useState(appConfig?.video_generation.max_scene_duration_seconds ?? 8);
  const [narrationWordsPerSecond, setNarrationWordsPerSecond] = useState(appConfig?.video_generation.narration_words_per_second ?? 2.3);
  const [aspectRatio, setAspectRatio] = useState<MascotRenderAspectRatio>(appConfig?.video_generation.aspect_ratio ?? "16:9");
  const [maxConcurrentVideoTasks, setMaxConcurrentVideoTasks] = useState(appConfig?.video_generation.max_concurrent_tasks ?? 2);
  const [renderWorkers, setRenderWorkers] = useState<number | undefined>(appConfig?.video_generation.render_workers);
  const [renderQuality, setRenderQuality] = useState<"draft" | "standard" | "high">(appConfig?.video_generation.render_quality ?? "draft");
  const [fps, setFps] = useState<number>(appConfig?.video_generation.fps ?? 30);
  const [savingVideo, setSavingVideo] = useState(false);

  useEffect(() => {
    const video = appConfig?.video_generation;
    if (video) {
      setMaxSceneDuration(video.max_scene_duration_seconds ?? 8);
      setNarrationWordsPerSecond(video.narration_words_per_second ?? 2.3);
      setAspectRatio(video.aspect_ratio ?? "16:9");
      setMaxConcurrentVideoTasks(video.max_concurrent_tasks ?? 2);
      setRenderWorkers(video.render_workers);
      setRenderQuality(video.render_quality ?? "draft");
      setFps(video.fps ?? 30);
    }
  }, [appConfig]);

  const saveVideo = async (event: FormEvent) => {
    event.preventDefault();
    setSavingVideo(true);
    try {
      const next = await api.saveVideoSettings({
        max_scene_duration_seconds: maxSceneDuration,
        narration_words_per_second: narrationWordsPerSecond,
        aspect_ratio: aspectRatio,
        max_concurrent_tasks: maxConcurrentVideoTasks,
        render_workers: renderWorkers,
        render_quality: renderQuality,
        fps,
      });
      await onVideoSaved(next.video_generation);
      onNotice({ tone: "good", message: "Video settings saved locally" });
    } catch (error) {
      onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not save video settings" });
    } finally {
      setSavingVideo(false);
    }
  };

  return {
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
  };
}
