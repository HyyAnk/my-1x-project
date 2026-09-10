import type { Channel, IntroOutroStyle, IntroOutroTransitionType } from "@studio/shared";
import { request } from "./client";

export interface CreateIntroOutroStylePayload {
  name: string;
  style_id?: string;
  transition_type?: IntroOutroTransitionType;
  transition_duration_seconds?: number;
  audio_mode?: "use_video_audio" | "overlay_bgm";
  intro_data: string;
  outro_data: string;
  intro_filename?: string;
  outro_filename?: string;
}

export const introOutroApi = {
  listIntroOutroStyles: (channelId: string): Promise<{ styles: IntroOutroStyle[] }> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/intro-outro-styles`),

  createIntroOutroStyle: (channelId: string, payload: CreateIntroOutroStylePayload): Promise<{ style: IntroOutroStyle }> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/intro-outro-styles`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteIntroOutroStyle: (channelId: string, styleId: string): Promise<{ ok: boolean }> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/intro-outro-styles/${encodeURIComponent(styleId)}`, {
      method: "DELETE",
    }),

  setDefaultIntroOutroStyle: (channelId: string, styleId: string | null): Promise<{ ok: boolean; channel: Channel }> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/default-intro-outro-style`, {
      method: "PUT",
      body: JSON.stringify({ style_id: styleId }),
    }),

  getIntroOutroClipUrl: (channelId: string, styleId: string, kind: "intro" | "outro"): string =>
    `/api/channels/${encodeURIComponent(channelId)}/intro-outro-styles/${encodeURIComponent(styleId)}/clips/${kind}`,

  getIntroOutroThumbUrl: (channelId: string, styleId: string, kind: "intro" | "outro"): string =>
    `/api/channels/${encodeURIComponent(channelId)}/intro-outro-styles/${encodeURIComponent(styleId)}/thumbs/${kind}`,
};
