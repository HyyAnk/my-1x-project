import type {
  AssignMascotInput,
  CalibrateMascotActionRequest,
  Channel,
  CreateMascotInput,
  GenerateMascotConceptInput,
  GenerateMascotSpriteInput,
  MascotActionType,
  MascotProfile,
  MascotSpriteAction,
  RemoveMascotBackgroundInput,
  UpdateMascotInput,
  UploadMascotSpriteInput,
} from "@studio/shared";
import { request } from "./client";

export const mascotApi = {
  mascots: () => request<{ mascots: MascotProfile[] }>("/api/mascots"),
  mascot: (id: string) => request<{ mascot: MascotProfile }>(`/api/mascots/${id}`),
  createMascot: (body: CreateMascotInput) =>
    request<{ mascot: MascotProfile }>("/api/mascots", { method: "POST", body: JSON.stringify(body) }),
  updateMascot: (id: string, body: UpdateMascotInput) =>
    request<{ mascot: MascotProfile }>(`/api/mascots/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteMascot: (id: string) => request<{ ok: true }>(`/api/mascots/${id}`, { method: "DELETE" }),
  generateMascotConcept: (id: string, body?: GenerateMascotConceptInput) =>
    request<{ mascot: MascotProfile; master_image_url: string; prompt_used: string }>(`/api/mascots/${id}/generate-concept`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  generateMascotSprite: (id: string, body: GenerateMascotSpriteInput) =>
    request<{ mascot: MascotProfile; action_sprite: MascotSpriteAction; prompt_used: string }>(`/api/mascots/${id}/generate-sprite`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
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
};
