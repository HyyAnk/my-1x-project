import type {
  AntigravitySettingsInput,
  AntigravitySettingsResponse,
  AppConfig,
  CodexSettingsInput,
  CodexSettingsResponse,
  QuestionHistorySettings,
  StorageInfo,
} from "@studio/shared";
import { request, type EngineInfoResponse } from "./client";

export const settingsApi = {
  config: () => request<AppConfig>("/api/config"),
  engine: () => request<EngineInfoResponse>("/api/engine"),
  setEngine: (active_engine: "codex" | "antigravity", model?: string) =>
    request<{ active_engine: "codex" | "antigravity"; status: string; model: string }>("/api/engine", {
      method: "POST",
      body: JSON.stringify({ active_engine, model }),
    }),
  codexSettings: () => request<CodexSettingsResponse>("/api/codex/settings"),
  saveCodexSettings: (body: CodexSettingsInput) =>
    request<CodexSettingsResponse>("/api/codex/settings", { method: "POST", body: JSON.stringify(body) }),
  cleanupCodex: () => request<{ removed: number }>("/api/codex/cleanup", { method: "POST", body: "{}" }),
  cleanupAntigravity: () => request<{ removed: number }>("/api/antigravity/cleanup", { method: "POST", body: "{}" }),
  antigravitySettings: () => request<AntigravitySettingsResponse>("/api/antigravity/settings"),
  saveAntigravitySettings: (body: AntigravitySettingsInput) =>
    request<AntigravitySettingsResponse>("/api/antigravity/settings", { method: "POST", body: JSON.stringify(body) }),
  antigravityModels: () => request<{ models: AntigravitySettingsResponse["models"] }>("/api/antigravity/models"),
  saveAudioSettings: (body: AppConfig["audio_generation"]) =>
    request<{ audio_generation: AppConfig["audio_generation"] }>("/api/audio/settings", { method: "POST", body: JSON.stringify(body) }),
  saveVideoSettings: (body: Partial<AppConfig["video_generation"]>) =>
    request<{ video_generation: AppConfig["video_generation"] }>("/api/video/settings", { method: "POST", body: JSON.stringify(body) }),
  saveMascotStageSettings: (body: AppConfig["mascot_stage"]) =>
    request<{ mascot_stage: AppConfig["mascot_stage"] }>("/api/mascot-stage/settings", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  saveHistorySettings: (body: Partial<QuestionHistorySettings>) =>
    request<{ question_history: QuestionHistorySettings }>("/api/history/settings", { method: "POST", body: JSON.stringify(body) }),
  imageSettings: () =>
    request<{ settings: AppConfig["image_generation"] & { has_api_key?: boolean }; models: Array<{ id: string; label: string }> }>(
      "/api/image/settings",
    ),
  imageBalance: () => request<{ balance_vnd: number; rpm?: number }>("/api/image/balance"),
  verifyImageConnection: (body?: { provider?: string; api_key?: string; base_url?: string; model?: string }) =>
    request<{ balance_vnd?: number; rpm?: number; ok?: boolean; message?: string }>("/api/image/verify", {
      method: "POST",
      body: JSON.stringify(body || {}),
    }),
  saveImageSettings: (body: Partial<AppConfig["image_generation"]>) =>
    request<{ image_generation: AppConfig["image_generation"] }>("/api/image/settings", { method: "POST", body: JSON.stringify(body) }),
  codexModels: () => request<{ models: CodexSettingsResponse["models"] }>("/api/codex/models"),
  storage: () => request<StorageInfo>("/api/storage"),
  setStorage: (path: string) => request<StorageInfo>("/api/storage", { method: "POST", body: JSON.stringify({ path }) }),
};
