import type { Channel, VoiceProfile } from "@studio/shared";
import { request } from "./client";

export const voiceApi = {
  saveVoiceReference: (channelId: string, data: string) =>
    request<{ path: string; modified_at: string }>(`/api/channels/${channelId}/voice-reference`, {
      method: "PUT",
      body: JSON.stringify({ data }),
    }),
  voices: () => request<{ voices: VoiceProfile[] }>("/api/voices"),
  createVoice: (name: string, data: string) =>
    request<VoiceProfile>("/api/voices", { method: "POST", body: JSON.stringify({ name, data }) }),
  deleteVoice: (voiceId: string) => request<{ ok: true }>(`/api/voices/${voiceId}`, { method: "DELETE" }),
  assignVoice: (channelId: string, voiceId: string | null) =>
    request<Channel>(`/api/channels/${channelId}/voice`, { method: "PUT", body: JSON.stringify({ voice_id: voiceId }) }),
  voiceSampleUrl: (voiceId: string) => `/api/voices/${voiceId}/sample`,
};
