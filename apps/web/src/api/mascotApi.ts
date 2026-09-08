import type {
  AssignMascotInput,
  BatchGenerateStyleSlotsInput,
  CalibrateMascotActionRequest,
  Channel,
  CreateMascotInput,
  CreateMascotStyleInput,
  GenerateMascotConceptInput,
  GenerateMascotSlotInput,
  GenerateMascotSpriteInput,
  GenerateMascotStyleConceptResponse,
  MascotActionType,
  MascotProfile,
  MascotSpriteAction,
  MascotStateVariant,
  MascotStyle,
  RemoveMascotBackgroundInput,
  UpdateMascotInput,
  UpdateMascotSlotInput,
  UpdateMascotStyleInput,
  UploadMascotSpriteInput,
} from "@studio/shared";
import { request } from "./client";

export type UpdateMascotStylePayload = UpdateMascotStyleInput & {
  anchor_image_url?: string | null;
};

export const mascotApi = {
  mascots: () => request<{ mascots: MascotProfile[] }>("/api/mascots"),
  mascot: (id: string) => request<{ mascot: MascotProfile }>(`/api/mascots/${id}`),
  createMascot: (body: CreateMascotInput) =>
    request<{ mascot: MascotProfile }>("/api/mascots", { method: "POST", body: JSON.stringify(body) }),
  updateMascot: (id: string, body: UpdateMascotInput) =>
    request<{ mascot: MascotProfile }>(`/api/mascots/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteMascot: (id: string) => request<{ ok: true }>(`/api/mascots/${id}`, { method: "DELETE" }),
  generateMascotConcept: (id: string, body?: GenerateMascotConceptInput) =>
    request<{ mascot: MascotProfile; master_image_url: string; prompt_used: string; placeholder?: boolean }>(
      `/api/mascots/${id}/generate-concept`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
    ),
  generateMascotSprite: (id: string, body: GenerateMascotSpriteInput) =>
    request<{ mascot: MascotProfile; action_sprite: MascotSpriteAction; prompt_used: string; placeholder?: boolean }>(
      `/api/mascots/${id}/generate-sprite`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ),
  uploadMascotSprite: (id: string, body: UploadMascotSpriteInput) =>
    request<{ mascot: MascotProfile; action_sprite: MascotSpriteAction }>(`/api/mascots/${id}/upload-sprite`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  removeMascotBackground: (id: string, target: RemoveMascotBackgroundInput["target"] = "all") =>
    request<{ mascot: MascotProfile }>(`/api/mascots/${id}/remove-background`, { method: "POST", body: JSON.stringify({ target }) }),
  assignMascotToChannel: (channelId: string, body: AssignMascotInput) =>
    request<{ channel: Channel }>(`/api/channels/${channelId}/mascot`, { method: "PUT", body: JSON.stringify(body) }),
  exportMascotUrl: (id: string) => `/api/mascots/${id}/export`,
  importMascotZip: (data: string) =>
    request<{ mascot: MascotProfile }>("/api/mascots/import", { method: "POST", body: JSON.stringify({ data }) }),
  calibrateMascotAction: (id: string, action: MascotActionType, body: CalibrateMascotActionRequest) =>
    request<{ mascot: MascotProfile; action: MascotSpriteAction }>(`/api/mascots/${id}/actions/${action}/calibrate`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createMascotStyle: (mascotId: string, input: CreateMascotStyleInput) =>
    request<{ mascot: MascotProfile; style: MascotStyle }>(`/api/mascots/${mascotId}/styles`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateMascotStyle: (mascotId: string, styleId: string, input: UpdateMascotStylePayload) =>
    request<{ mascot: MascotProfile }>(`/api/mascots/${mascotId}/styles/${styleId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  generateStyleConcept: async (
    mascotId: string,
    styleId: string,
    options?: { prompt?: string },
  ): Promise<GenerateMascotStyleConceptResponse> => {
    return request<GenerateMascotStyleConceptResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/styles/${encodeURIComponent(styleId)}/concept`,
      {
        method: "POST",
        body: JSON.stringify(options || {}),
      },
    );
  },
  deleteMascotStyle: (mascotId: string, styleId: string) =>
    request<{ ok: boolean; mascot: MascotProfile }>(`/api/mascots/${mascotId}/styles/${styleId}`, {
      method: "DELETE",
    }),
  updateMascotSlot: (mascotId: string, styleId: string, input: UpdateMascotSlotInput) =>
    request<{ mascot: MascotProfile }>(`/api/mascots/${mascotId}/styles/${styleId}/slots`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  setActiveMascotStyle: (mascotId: string, styleId: string) =>
    request<{ mascot: MascotProfile }>(`/api/mascots/${mascotId}/active-style`, {
      method: "POST",
      body: JSON.stringify({ style_id: styleId }),
    }),
  generateMascotStyleSlot: (mascotId: string, styleId: string, input: GenerateMascotSlotInput) =>
    request<{ mascot: MascotProfile; slot: MascotStateVariant; prompt_used: string; placeholder?: boolean }>(
      `/api/mascots/${mascotId}/styles/${styleId}/generate-slot`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  generateMascotStyleBatch: (mascotId: string, styleId: string, input: BatchGenerateStyleSlotsInput, signal?: AbortSignal) =>
    request<{ mascot: MascotProfile; generated_count: number; cancelled?: boolean }>(
      `/api/mascots/${mascotId}/styles/${styleId}/generate-batch`,
      {
        method: "POST",
        body: JSON.stringify(input),
        signal,
      },
    ),
};
