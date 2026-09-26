import type { Channel, IntroOutroStyle, IntroOutroTransitionType } from "@studio/shared";
import { request } from "./client";

export interface CreateIntroOutroStylePayload {
  name?: string;
  auto_name?: boolean;
  intro_mute_audio?: boolean;
  outro_mute_audio?: boolean;
  intro_script_text?: string;
  outro_script_text?: string;
  script_project_id?: string;
  script_project_version?: number;
  style_id?: string;
  style_preset_id: string;
  transition_type?: IntroOutroTransitionType;
  transition_duration_seconds?: number;
  audio_mode?: "use_video_audio" | "overlay_bgm";
  intro_data: string;
  outro_data: string;
  intro_filename?: string;
  outro_filename?: string;
  intro_script_provenance?: { project_id: string; revision_id: string };
  outro_script_provenance?: { project_id: string; revision_id: string };
}

export interface IntroOutroCategorySummary {
  style_preset_id: string;
  name: string;
  icon: string;
  total_count: number;
  ready_count: number;
}

export const introOutroApi = {
  listIntroOutroStyles: (channelId: string): Promise<{ styles: IntroOutroStyle[] }> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/intro-outro-styles`),

  listIntroOutroCategories: (channelId: string): Promise<{ categories: IntroOutroCategorySummary[] }> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/intro-outro-categories`),

  createIntroOutroStyle: (channelId: string, payload: CreateIntroOutroStylePayload): Promise<{ style: IntroOutroStyle }> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/intro-outro-styles`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteIntroOutroStyle: (channelId: string, styleId: string): Promise<{ ok: boolean }> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/intro-outro-styles/${encodeURIComponent(styleId)}`, {
      method: "DELETE",
    }),

  updateIntroOutroStyle: (
    channelId: string,
    styleId: string,
    payload: { style_preset_id?: string; status?: "active" | "disabled" },
  ): Promise<{ style: IntroOutroStyle }> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/intro-outro-styles/${encodeURIComponent(styleId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
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
