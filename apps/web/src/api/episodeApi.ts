import type { Episode, ProductionAssessment, Scene, Task } from "@studio/shared";
import { request, type BundleImage } from "./client";

export const episodeApi = {
  episodes: (id: string) => request<{ episodes: Episode[] }>(`/api/channels/${id}/episodes`),
  deleteEpisode: (channelId: string, episodeId: string) =>
    request<{ ok: true }>(`/api/channels/${channelId}/episodes/${episodeId}?confirm=true`, { method: "DELETE" }),
  updateEpisode: (channelId: string, episodeId: string, body: Partial<Episode["quiz_config"]> & { target_duration_minutes?: number }) =>
    request<Episode>(`/api/channels/${channelId}/episodes/${episodeId}`, { method: "PATCH", body: JSON.stringify(body) }),
  file: (channelId: string, episodeId: string, filename: string) =>
    request<{ content: string; path: string; modified_at: string }>(`/api/channels/${channelId}/episodes/${episodeId}/file/${filename}`),
  saveFile: (channelId: string, episodeId: string, filename: string, content: string) =>
    request<{ path: string; modified_at: string }>(`/api/channels/${channelId}/episodes/${episodeId}/file/${filename}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
  scenes: (channelId: string, episodeId: string) => request<{ scenes: Scene[] }>(`/api/channels/${channelId}/episodes/${episodeId}/scenes`),
  saveScenes: (channelId: string, episodeId: string, scenes: Scene[]) =>
    request<{ scenes: Scene[] }>(`/api/channels/${channelId}/episodes/${episodeId}/scenes`, {
      method: "PUT",
      body: JSON.stringify(scenes),
    }),
  bundleImages: (channelId: string, episodeId: string) =>
    request<{ images: BundleImage[] }>(`/api/channels/${channelId}/episodes/${episodeId}/visual-bible/images`),
  generateBundleImage: (channelId: string, episodeId: string, bundleNumber: number) =>
    request<{ task: Task }>(`/api/channels/${channelId}/episodes/${episodeId}/visual-bible/bundles/${bundleNumber}/image`, {
      method: "POST",
      body: "{}",
    }),
  generateAllBundleImages: (channelId: string, episodeId: string, force = false) =>
    request<{ tasks: Task[]; bundle_count: number }>(`/api/channels/${channelId}/episodes/${episodeId}/visual-bible/images/generate-all`, {
      method: "POST",
      body: JSON.stringify({ force }),
    }),
  bundleImageUrl: (channelId: string, episodeId: string, filename: string) =>
    `/api/channels/${channelId}/episodes/${episodeId}/visual-bible/images/${encodeURIComponent(filename)}`,
  downloadBundleImagesUrl: (channelId: string, episodeId: string) =>
    `/api/channels/${channelId}/episodes/${episodeId}/visual-bible/images/download`,
  productionAssessment: (channelId: string, episodeId: string) =>
    request<{ assessment: ProductionAssessment }>(`/api/channels/${channelId}/episodes/${episodeId}/production-assessment`),
  generateShots: (channelId: string, episodeId: string) =>
    request<{ tasks: Task[]; sequence_count: number }>(`/api/channels/${channelId}/episodes/${episodeId}/shots/generate`, {
      method: "POST",
      body: "{}",
    }),
  optimizeShots: (channelId: string, episodeId: string) =>
    request<{ scenes: Scene[]; merged: number }>(`/api/channels/${channelId}/episodes/${episodeId}/shots/optimize`, {
      method: "POST",
      body: "{}",
    }),
  assembleNarration: (channelId: string, episodeId: string) =>
    request<{ episode: Episode; asset_path: string }>(`/api/channels/${channelId}/episodes/${episodeId}/narration/assemble`, {
      method: "POST",
      body: "{}",
    }),
};
