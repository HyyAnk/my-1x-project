import type {
  CancelShortReelRequest,
  CancelShortReelResponse,
  GenerateShortReelRequest,
  GenerateShortReelResponse,
  GetShortReelResponse,
  ShortReelRecord,
  UpdateShortReelRequest,
  UpdateShortReelResponse,
} from "@studio/shared";
import { request, ApiError } from "./client";

export { ApiError };

export const shortReelApi = {
  listShortReels: (channelId: string) => request<{ short_reels: ShortReelRecord[] }>(`/api/channels/${channelId}/short-reels`),

  getShortReel: (channelId: string, reelId: string) => request<GetShortReelResponse>(`/api/channels/${channelId}/short-reels/${reelId}`),

  updateShortReel: (channelId: string, reelId: string, body: UpdateShortReelRequest) =>
    request<UpdateShortReelResponse>(`/api/channels/${channelId}/short-reels/${reelId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  generateShortReel: (channelId: string, reelId: string, body: GenerateShortReelRequest) =>
    request<GenerateShortReelResponse>(`/api/channels/${channelId}/short-reels/${reelId}/generate`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  cancelShortReel: (channelId: string, reelId: string, body: CancelShortReelRequest) =>
    request<CancelShortReelResponse>(`/api/channels/${channelId}/short-reels/${reelId}/cancel`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getExportUrl: (channelId: string, reelId: string, revision: number): string =>
    `/api/channels/${channelId}/short-reels/${reelId}/export?revision=${revision}`,

  getAssetUrl: (channelId: string, reelId: string, assetId: string): string =>
    `/api/channels/${encodeURIComponent(channelId)}/short-reels/${encodeURIComponent(reelId)}/assets/${encodeURIComponent(assetId)}`,

  exportPackage: async (channelId: string, reelId: string, revision: number): Promise<Blob> => {
    const url = `/api/channels/${channelId}/short-reels/${reelId}/export?revision=${revision}`;
    const response = await fetch(url);
    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;
      let code: string | undefined;
      try {
        const body: unknown = await response.json();
        if (body && typeof body === "object" && !Array.isArray(body)) {
          const record = body as Record<string, unknown>;
          if (typeof record.error === "string") message = record.error;
          if (typeof record.code === "string") code = record.code;
        }
      } catch {
        // ignore
      }
      throw new ApiError(message, response.status, code);
    }
    return response.blob();
  },
};
