import path from "node:path";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import { ZodError } from "zod";
import type { TaskEvent } from "@studio/shared";
import { AntigravityClient } from "./antigravity.js";
import { CodexAppServerClient } from "./codex.js";
import { loadConfig, loadStorageRoot } from "./config.js";
import { ContextEngine } from "./context.js";
import { loadServerEnv } from "./env.js";
import { StudioLogger } from "./logger.js";
import { RepositoryError, RepositoryService } from "./repository.js";
import { TaskManager } from "./tasks.js";
import { registerAudioVideoRoutes } from "./routes/audioVideo.js";
import { registerChannelsRoutes } from "./routes/channels.js";
import { registerEpisodesRoutes } from "./routes/episodes.js";
import { registerEventsRoutes, type EventClient } from "./routes/events.js";
import { registerMascotsRoutes } from "./routes/mascots.js";
import { registerQuizV2Routes } from "./routes/quizV2.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import type { AppState } from "./routes/state.js";
import { registerSystemRoutes } from "./routes/system.js";
import { registerTasksRoutes } from "./routes/tasks.js";
import { registerVisualBibleRoutes } from "./routes/visualBible.js";
import { registerVoicesRoutes } from "./routes/voices.js";

export type StudioApp = {
  server: FastifyInstance;
  repository: RepositoryService;
  tasks: TaskManager;
  logger: StudioLogger;
  close: () => Promise<void>;
};

export type BuildAppOptions = {
  /** Keep credentials outside isolated episode/demo storage roots. */
  environmentRoot?: string;
  /** Allows test hosts to replace the local file explorer integration. */
  revealFile?: (filePath: string) => Promise<void>;
};

export async function buildApp(
  rootDirectory = process.env.STUDIO_ROOT ?? process.cwd(),
  options: BuildAppOptions = {},
): Promise<StudioApp> {
  await loadServerEnv(options.environmentRoot ?? rootDirectory);
  const revealFile = options.revealFile ?? revealFileInSystem;
  const configuredStorageRoot = await loadStorageRoot(rootDirectory);
  const logger = new StudioLogger(rootDirectory, process.env.STUDIO_DEBUG === "1");
  logger.setRuntimeRoot(path.join(configuredStorageRoot ?? rootDirectory, ".documentary-studio"));
  await logger.init();
  const repository = new RepositoryService(rootDirectory, configuredStorageRoot ?? rootDirectory);
  await repository.ensureBootstrap();
  const state: AppState = {
    config: await loadConfig(rootDirectory),
    storageConfigured: Boolean(configuredStorageRoot),
  };
  const codex = new CodexAppServerClient(rootDirectory, state.config, logger);
  const antigravity = new AntigravityClient(rootDirectory, state.config, logger);
  const contextEngine = new ContextEngine(repository, logger);
  const tasks = new TaskManager(
    repository,
    contextEngine,
    codex,
    state.config.codex.max_concurrent_tasks,
    state.config.video_generation,
    logger,
    state.config.audio_generation,
    undefined,
    state.config.image_generation,
    antigravity,
    state.config.active_engine,
  );
  await tasks.load();

  const server = Fastify({ logger: false, bodyLimit: 50 * 1024 * 1024 });
  const clients = new Set<EventClient>();
  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. same-origin, curl, server-to-server, desktop tools)
      if (!origin) {
        cb(null, true);
        return;
      }
      try {
        const parsed = new URL(origin);
        const isLoopback =
          parsed.hostname === "localhost" ||
          parsed.hostname === "127.0.0.1" ||
          parsed.hostname === "::1" ||
          parsed.hostname === "[::1]" ||
          parsed.hostname.endsWith(".localhost");
        if (isLoopback) {
          cb(null, true);
          return;
        }
      } catch {
        // Invalid URL format
      }
      cb(new Error("Not allowed by CORS"), false);
    },
  });
  await server.register(websocket);
  await registerFrontend(server, rootDirectory);

  tasks.on("event", (event: TaskEvent) => {
    const payload = JSON.stringify(event);
    for (const client of clients) {
      if (client.readyState === client.OPEN) client.send(payload);
    }
  });

  server.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : "Request failed";
    let statusCode = 500;
    if (error instanceof RepositoryError) {
      statusCode = error.code.endsWith("NOT_FOUND") ? 404 : 400;
    } else if (error instanceof ZodError || (error && typeof error === "object" && "issues" in error)) {
      statusCode = 400;
    } else if (error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number") {
      statusCode = error.statusCode;
    }

    if (statusCode >= 500) {
      logger.error(`Internal server error: ${message}${error instanceof Error && error.stack ? `\n${error.stack}` : ""}`, {
        step: "http",
      });
    } else {
      logger.warn(`Request failed: ${message}`, { step: "http" });
    }
    void reply.code(statusCode).send({ error: message });
  });

  await server.register(registerSystemRoutes({ rootDirectory, repository, tasks, codex, antigravity, logger, state }));
  await server.register(registerSettingsRoutes({ rootDirectory, tasks, codex, antigravity, state }));
  await server.register(registerVoicesRoutes({ repository, logger, state }));
  await server.register(registerChannelsRoutes({ repository, tasks, logger, state }));
  await server.register(registerMascotsRoutes({ repository, logger, state }));
  await server.register(registerEpisodesRoutes({ repository, state }));
  await server.register(registerQuizV2Routes({ repository, tasks, codex, antigravity, state }));
  await server.register(registerVisualBibleRoutes({ repository, tasks, state }));
  await server.register(registerAudioVideoRoutes({ repository, tasks, state, revealFile }));
  await server.register(registerTasksRoutes({ tasks, codex }));
  await server.register(registerEventsRoutes({ tasks, clients }));

  return {
    server,
    repository,
    tasks,
    logger,
    close: async () => {
      await codex.close();
      await server.close();
    },
  };
}

async function registerFrontend(server: FastifyInstance, rootDirectory: string): Promise<void> {
  const frontendDirectory = path.join(rootDirectory, "apps", "web", "dist");
  try {
    await access(frontendDirectory);
    await server.register(fastifyStatic, { root: frontendDirectory, prefix: "/", index: false });
    server.get("/", async (_request, reply) => reply.sendFile("index.html"));
  } catch {
    // Vite serves the web app during development.
  }
}

async function revealFileInSystem(filePath: string): Promise<void> {
  const launch =
    process.platform === "win32"
      ? { command: "explorer.exe", args: ["/select,", filePath], windowsHide: false }
      : process.platform === "darwin"
        ? { command: "open", args: ["-R", filePath], windowsHide: true }
        : { command: "xdg-open", args: [path.dirname(filePath)], windowsHide: true };
  await new Promise<void>((resolve, reject) => {
    const child = spawn(launch.command, launch.args, { detached: true, stdio: "ignore", windowsHide: launch.windowsHide });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
