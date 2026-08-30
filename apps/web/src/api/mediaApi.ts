import type { Scene, Task } from "@studio/shared";
import { request } from "./client";

export const mediaApi = {
  generateAllAudio: (channelId: string, episodeId: string, force = false) =>
    request<{ tasks: Task[] }>(`/api/channels/${channelId}/episodes/${episodeId}/audio/generate-all`, {
      method: "POST",
      body: JSON.stringify({ force }),
    }),
  downloadAudioUrl: (channelId: string, episodeId: string, mode: "separate" | "merged") =>
    `/api/channels/${channelId}/episodes/${episodeId}/audio/download?mode=${mode}`,
  generateAudio: (channelId: string, episodeId: string, sceneNumber: number) =>
    request<{ task: Task }>(`/api/channels/${channelId}/episodes/${episodeId}/scenes/${sceneNumber}/audio`, { method: "POST", body: "{}" }),
  mergeNextScene: (channelId: string, episodeId: string, sceneNumber: number) =>
    request<{ scenes: Scene[] }>(`/api/channels/${channelId}/episodes/${episodeId}/scenes/${sceneNumber}/merge-next`, {
      method: "POST",
      body: "{}",
    }),
  voiceRenderedMetrics: () =>
    request<{
      rendered_characters: number;
      rendered_duration_seconds: number;
      rendered_segments_count: number;
      rendered_episodes_count: number;
    }>("/api/voice/rendered-metrics"),
  narrationAudioUrl: (channelId: string, episodeId: string, filename = "narration.wav") =>
    `/api/channels/${channelId}/episodes/${episodeId}/assets/${encodeURIComponent(filename)}`,
  videoUrl: (channelId: string, episodeId: string) => `/api/channels/${channelId}/episodes/${episodeId}/video`,
  openVideoFolder: (channelId: string, episodeId: string) =>
    request<{ opened: true; folder_path: string }>(`/api/channels/${channelId}/episodes/${episodeId}/video/open-folder`, {
      method: "POST",
      body: "{}",
    }),
};
