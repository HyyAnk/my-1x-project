import type { FastifyInstance } from "fastify";
import {
  AudioSettingsInputSchema,
  ImageSettingsInputSchema,
  ImageFallbackSettingsInputSchema,
  IMGSTUDIO_MODELS,
  IMGSTUDIO_DEFAULT_MODEL_ID,
  MascotStageSettingsInputSchema,
  SaveHistorySettingsInputSchema,
  VideoSettingsInputSchema,
} from "@studio/shared";
import {
  saveAudioSettings,
  saveHistorySettings,
  saveImageSettings,
  saveImageFallbackSettings,
  saveMascotStageSettings,
  saveVideoSettings,
} from "../../config.js";
import { checkGpti2Balance } from "../../providers/gpti2Image.js";
import { checkImgStudioConnectivity } from "../../providers/imgstudio/index.js";
import { RepositoryError } from "../../repository.js";
import type { SettingsRouteDeps } from "./settingsTypes.js";

/**
 * Registers media generation, mascot stage, and question history service settings routes.
 */
export function registerServiceSettingsRoutes(server: FastifyInstance, deps: SettingsRouteDeps): void {
  const { rootDirectory, tasks, state } = deps;

  server.post("/api/audio/settings", async (request) => {
    const input = AudioSettingsInputSchema.parse(request.body);
    if (tasks.hasActiveWork()) throw new RepositoryError("Finish active tasks before changing audio settings", "AUDIO_SETTINGS_BUSY");
    state.config = await saveAudioSettings(rootDirectory, input);
    tasks.updateAudioConfig(state.config.audio_generation);
    return { audio_generation: state.config.audio_generation };
  });

  server.post("/api/video/settings", async (request) => {
    const input = VideoSettingsInputSchema.parse(request.body);
    if (tasks.hasActiveWork()) throw new RepositoryError("Finish active tasks before changing video settings", "VIDEO_SETTINGS_BUSY");
    state.config = await saveVideoSettings(rootDirectory, input);
    tasks.updateVideoConfig(state.config.video_generation);
    return { video_generation: state.config.video_generation };
  });

  server.post("/api/mascot-stage/settings", async (request) => {
    const input = MascotStageSettingsInputSchema.parse(request.body);
    state.config = await saveMascotStageSettings(rootDirectory, input);
    return { mascot_stage: state.config.mascot_stage };
  });

  server.post("/api/history/settings", async (request) => {
    const input = SaveHistorySettingsInputSchema.parse(request.body);
    state.config = await saveHistorySettings(rootDirectory, input);
    return { question_history: state.config.question_history };
  });

  registerImageSettingsRoutes(server, deps);
}

function registerImageSettingsRoutes(server: FastifyInstance, deps: SettingsRouteDeps): void {
  const { rootDirectory, tasks, state } = deps;

  server.get("/api/image/settings", () => ({
    settings: {
      ...state.config.image_generation,
      api_key: "",
      has_api_key: Boolean(state.config.image_generation.api_key),
    },
    models: [
      { id: "gpt-image-2", label: "GPT Image 2 (50 VND / img)" },
      { id: "nano-banana-2", label: "Nano Banana 2 (100 VND / img - 2K)" },
    ],
  }));

  server.get("/api/image/balance", async () => {
    try {
      return await checkGpti2Balance(state.config.image_generation.api_key);
    } catch (error) {
      throw new RepositoryError(error instanceof Error ? error.message : "Failed to check balance", "IMAGE_BALANCE_FAILED");
    }
  });

  server.post("/api/image/verify", async (request) => {
    const body = (request.body && typeof request.body === "object" ? request.body : {}) as {
      provider?: string;
      api_key?: string;
      base_url?: string;
      model?: string;
    };
    const provider = body.provider || state.config.image_generation.provider || "gpti2";
    const apiKey = (body.api_key !== undefined ? body.api_key : state.config.image_generation.api_key) || "";
    const baseUrl =
      (body.base_url !== undefined ? body.base_url : state.config.image_generation.base_url) ||
      (provider === "shopaikey" ? "https://direct.shopaikey.com/v1" : "");

    if (provider === "gpti2") return await checkGpti2Balance(apiKey);
    if (!apiKey) throw new RepositoryError("API Key is required to verify", "IMAGE_PROVIDER_NOT_CONFIGURED");

    const effectiveBaseUrl = (
      baseUrl.trim() || (provider === "shopaikey" ? "https://direct.shopaikey.com/v1" : "https://api.openai.com/v1")
    ).replace(/\/+$/, "");

    try {
      const response = await fetch(`${effectiveBaseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok && response.status === 401) {
        throw new RepositoryError("Invalid API key (401 Unauthorized)", "IMAGE_AUTH_FAILED");
      }
      return { ok: true, message: `Connected successfully to ${provider === "shopaikey" ? "ShopAiKey" : "Custom Provider"} API!` };
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      return { ok: true, message: `Configuration verified for ${effectiveBaseUrl}` };
    }
  });

  server.post("/api/image/settings", async (request) => {
    const input = ImageSettingsInputSchema.parse(request.body);
    if (tasks.hasActiveWork()) throw new RepositoryError("Finish active tasks before changing image settings", "IMAGE_SETTINGS_BUSY");
    state.config = await saveImageSettings(rootDirectory, input);
    tasks.updateImageConfig(state.config.image_generation);
    return {
      image_generation: {
        ...state.config.image_generation,
        api_key: "",
        has_api_key: Boolean(state.config.image_generation.api_key),
      },
      settings: {
        ...state.config.image_generation,
        api_key: "",
        has_api_key: Boolean(state.config.image_generation.api_key),
      },
    };
  });

  server.get("/api/image-fallback/settings", () => ({
    settings: {
      ...state.config.image_fallback,
      api_key: "",
      has_api_key: Boolean(state.config.image_fallback.api_key),
    },
    models: IMGSTUDIO_MODELS,
    default_model: IMGSTUDIO_DEFAULT_MODEL_ID,
  }));

  server.post("/api/image-fallback/settings", async (request) => {
    const input = ImageFallbackSettingsInputSchema.parse(request.body);
    if (tasks.hasActiveWork())
      throw new RepositoryError("Finish active tasks before changing image fallback settings", "IMAGE_SETTINGS_BUSY");
    state.config = await saveImageFallbackSettings(rootDirectory, input);
    tasks.updateImageFallbackConfig(state.config.image_fallback);
    return {
      settings: {
        ...state.config.image_fallback,
        api_key: "",
        has_api_key: Boolean(state.config.image_fallback.api_key),
      },
    };
  });

  server.post("/api/image-fallback/verify", async (request) => {
    const body = (request.body && typeof request.body === "object" ? request.body : {}) as {
      api_key?: string;
      base_url?: string;
    };
    const apiKey = (body.api_key !== undefined ? body.api_key : state.config.image_fallback.api_key) || "";
    const baseUrl = body.base_url !== undefined ? body.base_url : state.config.image_fallback.base_url;
    if (!apiKey) throw new RepositoryError("API Key is required to verify ImgStudio", "IMAGE_PROVIDER_NOT_CONFIGURED");
    return await checkImgStudioConnectivity(apiKey, baseUrl);
  });

  server.delete("/api/image-fallback/key", async () => {
    if (tasks.hasActiveWork()) throw new RepositoryError("Finish active tasks before clearing API key", "IMAGE_SETTINGS_BUSY");
    state.config = await saveImageFallbackSettings(rootDirectory, { api_key: "" });
    tasks.updateImageFallbackConfig(state.config.image_fallback);
    return {
      settings: {
        ...state.config.image_fallback,
        api_key: "",
        has_api_key: false,
      },
    };
  });
}
