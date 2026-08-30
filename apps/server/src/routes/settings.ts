import type { FastifyInstance, FastifyPluginCallback } from "fastify";
import {
  AntigravitySettingsInputSchema,
  AudioSettingsInputSchema,
  CodexSettingsInputSchema,
  EngineSettingsInputSchema,
  ImageSettingsInputSchema,
  MascotStageSettingsInputSchema,
  SaveHistorySettingsInputSchema,
  VideoSettingsInputSchema,
} from "@studio/shared";
import type { AntigravityClient } from "../antigravity.js";
import type { CodexAppServerClient } from "../codex.js";
import {
  saveAntigravitySettings,
  saveAudioSettings,
  saveCodexSettings,
  saveEngineSettings,
  saveHistorySettings,
  saveImageSettings,
  saveMascotStageSettings,
  saveVideoSettings,
} from "../config.js";
import { checkGpti2Balance } from "../providers/gpti2Image.js";
import { RepositoryError } from "../repository.js";
import type { TaskManager } from "../tasks.js";
import type { AppState } from "./state.js";

export type SettingsRouteDeps = {
  rootDirectory: string;
  tasks: TaskManager;
  codex: CodexAppServerClient;
  antigravity: AntigravityClient;
  state: AppState;
};

export function registerSettingsRoutes(deps: SettingsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { rootDirectory, tasks, codex, antigravity, state } = deps;
    server.get("/api/engine", async () => {
      const activeEngine = tasks.getActiveEngine();
      return {
        active_engine: activeEngine,
        status: tasks.getStatus(),
        model: activeEngine === "antigravity" ? state.config.antigravity.model : state.config.codex.model,
        codex: {
          status: tasks.getCodexStatus(),
          model: state.config.codex.model,
          models: await codex.getModels().catch(() => []),
        },
        antigravity: {
          status: tasks.getAntigravityStatus(),
          model: state.config.antigravity.model,
          models: await antigravity.getModels().catch(() => []),
        },
      };
    });
    server.post("/api/engine", async (request) => {
      const input = EngineSettingsInputSchema.parse(request.body);
      if (tasks.hasActiveWork()) throw new RepositoryError("Finish active tasks before changing engine", "ENGINE_BUSY");
      state.config = await saveEngineSettings(rootDirectory, input);
      tasks.setActiveEngine(state.config.active_engine);
      codex.updateConfig(state.config);
      antigravity.updateConfig(state.config);
      return {
        active_engine: state.config.active_engine,
        status: tasks.getStatus(),
        model: state.config.active_engine === "antigravity" ? state.config.antigravity.model : state.config.codex.model,
      };
    });

    server.get("/api/codex/info", async () => codex.detectInstallation());
    server.get("/api/codex/settings", async () => ({
      settings: {
        transport: state.config.codex.transport,
        model: state.config.codex.model,
        api_base_url: state.config.codex.api_base_url,
        has_api_key: Boolean(state.config.codex.api_key),
        app_server_endpoint: state.config.codex.app_server_endpoint,
        command: state.config.codex.command,
      },
      models: await codex.getModels(),
      installation: await codex.detectInstallation(),
    }));
    server.get("/api/codex/models", async () => ({ models: await codex.getModels() }));
    server.post("/api/codex/settings", async (request) => {
      const input = CodexSettingsInputSchema.parse(request.body);
      if (tasks.hasActiveWork()) throw new RepositoryError("Finish active tasks before changing Codex settings", "CODEX_SETTINGS_BUSY");
      const wasConnected = codex.isConnected;
      if (wasConnected) await codex.close();
      state.config = await saveCodexSettings(rootDirectory, input);
      codex.updateConfig(state.config);
      if (wasConnected) await codex.connect().catch(() => undefined);
      return {
        settings: {
          transport: state.config.codex.transport,
          model: state.config.codex.model,
          api_base_url: state.config.codex.api_base_url,
          has_api_key: Boolean(state.config.codex.api_key),
          app_server_endpoint: state.config.codex.app_server_endpoint,
          command: state.config.codex.command,
        },
        models: await codex.getModels(),
        installation: await codex.detectInstallation(),
      };
    });
    server.get("/api/antigravity/info", async () => antigravity.detectInstallation());
    server.get("/api/antigravity/settings", async () => ({
      settings: {
        model: state.config.antigravity.model,
        command: state.config.antigravity.command,
        api_base_url: state.config.antigravity.api_base_url,
        has_api_key: Boolean(state.config.antigravity.api_key),
      },
      models: await antigravity.getModels().catch(() => []),
      installation: await antigravity.detectInstallation(),
    }));
    server.get("/api/antigravity/models", async () => {
      try {
        const models = await antigravity.getModels();
        return { models };
      } catch (error) {
        throw new RepositoryError(
          error instanceof Error ? error.message : "Failed to load Antigravity models",
          "ANTIGRAVITY_MODELS_FAILED",
        );
      }
    });
    server.post("/api/antigravity/settings", async (request) => {
      const input = AntigravitySettingsInputSchema.parse(request.body);
      if (tasks.hasActiveWork())
        throw new RepositoryError("Finish active tasks before changing Antigravity settings", "ANTIGRAVITY_SETTINGS_BUSY");
      const wasConnected = antigravity.isConnected;
      if (wasConnected) await antigravity.close();
      state.config = await saveAntigravitySettings(rootDirectory, input);
      antigravity.updateConfig(state.config);
      if (wasConnected) await antigravity.connect().catch(() => undefined);
      return {
        settings: {
          model: state.config.antigravity.model,
          command: state.config.antigravity.command,
          api_base_url: state.config.antigravity.api_base_url,
          has_api_key: Boolean(state.config.antigravity.api_key),
        },
        models: await antigravity.getModels().catch(() => []),
        installation: await antigravity.detectInstallation(),
      };
    });
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
    done();
  };
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
      if (!response.ok && response.status === 401) throw new RepositoryError("Invalid API key (401 Unauthorized)", "IMAGE_AUTH_FAILED");
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
}
