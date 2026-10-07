import type {
  ChannelMotionPreset,
  ChannelMotionPresetsResponse,
  MotionPreviewMarkupRequest,
  MotionPreviewMarkupResponse,
  MotionPromptOutput,
  MotionPromptRequest,
  MotionTemplateDefinition,
  MotionTemplatePlacement,
  SaveChannelMotionPresetRequest,
} from "@studio/shared";
import { request } from "./client";

export const motionApi = {
  listMotionTemplates: (placement?: MotionTemplatePlacement): Promise<{ templates: MotionTemplateDefinition[] }> => {
    const query = placement ? `?placement=${encodeURIComponent(placement)}` : "";
    return request(`/api/motion/templates${query}`);
  },

  generateMotionPrompt: (payload: MotionPromptRequest): Promise<MotionPromptOutput> =>
    request("/api/motion/prompt-generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  previewMotionMarkup: (payload: MotionPreviewMarkupRequest): Promise<MotionPreviewMarkupResponse> =>
    request("/api/motion/preview-markup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listChannelMotionPresets: (channelId: string): Promise<ChannelMotionPresetsResponse> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/motion-presets`),

  saveChannelMotionPreset: (
    channelId: string,
    payload: SaveChannelMotionPresetRequest,
  ): Promise<{ success: boolean; preset: ChannelMotionPreset }> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/motion-presets`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteChannelMotionPreset: (channelId: string, presetId: string): Promise<{ success: boolean }> =>
    request(`/api/channels/${encodeURIComponent(channelId)}/motion-presets/${encodeURIComponent(presetId)}`, {
      method: "DELETE",
    }),
};
