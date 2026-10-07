import { useEffect, useState, type FormEvent } from "react";
import type { AppConfig, MascotRenderAspectRatio, MascotStateMediaMode } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export type UseVideoSettingsProps = {
  appConfig: AppConfig | null;
  onVideoSaved: (video: AppConfig["video_generation"]) => void | Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export interface BuildVideoPayloadOptions {
  maxSceneDuration: number;
  narrationWordsPerSecond: number;
  maxConcurrentVideoTasks: number;
  renderWorkers?: number;
  renderQuality: "draft" | "standard" | "high";
  fps: number;
  mascotMediaMode: MascotStateMediaMode;
  fastRenderMode?: boolean;
}

export function buildVideoPayload(options: BuildVideoPayloadOptions): Partial<AppConfig["video_generation"]> {
  return {
    max_scene_duration_seconds: options.maxSceneDuration,
    narration_words_per_second: options.narrationWordsPerSecond,
    aspect_ratio: "16:9",
    max_concurrent_tasks: options.maxConcurrentVideoTasks,
    render_workers: options.renderWorkers,
    render_quality: options.renderQuality,
    fps: options.fps,
    mascot_media_mode: options.mascotMediaMode,
    ...(options.fastRenderMode !== undefined ? { fast_render_mode: options.fastRenderMode } : {}),
  };
}

export function useVideoSettingsState({ appConfig, onVideoSaved, onNotice }: UseVideoSettingsProps) {
  const [maxSceneDuration, setMaxSceneDuration] = useState(appConfig?.video_generation.max_scene_duration_seconds ?? 8);
  const [narrationWordsPerSecond, setNarrationWordsPerSecond] = useState(appConfig?.video_generation.narration_words_per_second ?? 2.3);
  const [aspectRatio, setAspectRatio] = useState<MascotRenderAspectRatio>("16:9");
  const [maxConcurrentVideoTasks, setMaxConcurrentVideoTasks] = useState(appConfig?.video_generation.max_concurrent_tasks ?? 1);
  const [renderWorkers, setRenderWorkers] = useState<number | undefined>(appConfig?.video_generation.render_workers);
  const [renderQuality, setRenderQuality] = useState<"draft" | "standard" | "high">(appConfig?.video_generation.render_quality ?? "draft");
  const [fps, setFps] = useState<number>(appConfig?.video_generation.fps ?? 30);
  const [mascotMediaMode, setMascotMediaMode] = useState<MascotStateMediaMode>(
    appConfig?.video_generation.mascot_media_mode ?? "static",
  );
  const [fastRenderMode, setFastRenderMode] = useState<boolean>(appConfig?.video_generation.fast_render_mode ?? true);
  const [savingVideo, setSavingVideo] = useState(false);

  useEffect(() => {
    const video = appConfig?.video_generation;
    if (video) {
      setMaxSceneDuration(video.max_scene_duration_seconds ?? 8);
      setNarrationWordsPerSecond(video.narration_words_per_second ?? 2.3);
      setAspectRatio("16:9");
      setMaxConcurrentVideoTasks(video.max_concurrent_tasks ?? 1);
      setRenderWorkers(video.render_workers);
      setRenderQuality(video.render_quality ?? "draft");
      setFps(video.fps ?? 30);
      setMascotMediaMode(video.mascot_media_mode ?? "static");
      setFastRenderMode(video.fast_render_mode ?? true);
    }
  }, [appConfig]);

  const saveVideo = async (event: FormEvent) => {
    event.preventDefault();
    setSavingVideo(true);
    try {
      const payload = buildVideoPayload({
        maxSceneDuration,
        narrationWordsPerSecond,
        maxConcurrentVideoTasks,
        renderWorkers,
        renderQuality,
        fps,
        mascotMediaMode,
        fastRenderMode,
      });
      const next = await api.saveVideoSettings(payload);
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
    mascotMediaMode,
    setMascotMediaMode,
    fastRenderMode,
    setFastRenderMode,
    savingVideo,
    saveVideo,
  };
}
