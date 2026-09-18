import Fastify, { type FastifyInstance } from "fastify";
import { AntigravityClient } from "./antigravity.js";
import { CodexAppServerClient } from "./codex.js";
import { loadConfig, loadStorageRoot } from "./config.js";
import { ContextEngine } from "./context.js";
import { loadServerEnv } from "./env.js";
import { StudioLogger } from "./logger.js";
import { RepositoryService } from "./repository.js";
import { registerAllRoutes } from "./routes/registerAllRoutes.js";
import { studioRuntimePath } from "./runtimePaths.js";
import { registerErrorHandler } from "./server/errorHandler.js";
import { registerServerPlugins } from "./server/serverPlugins.js";
import { styleActivationManager } from "./quiz/visual/styleModules/activation.js";
import { TaskManager } from "./tasks.js";
import type { LLMClient } from "./utils/promptSanitizer.js";
import type {
  AnimationStorageAdapter,
  FfmpegAdapter,
  VideoUploadService,
  VideoProcessingRepository,
} from "./quiz/mascot/videoAnimation/index.js";
import { createMascotSlotJobManager, createMascotSlotJobRepository, type MascotSlotJobManager } from "./quiz/mascot/slotJobs/index.js";
import { createMascotStyleJobManager, createMascotStyleJobRepository, type MascotStyleJobManager } from "./quiz/mascot/styleJobs/index.js";
import type { AppState } from "./routes/state.js";

export type StudioApp = {
  server: FastifyInstance;
  repository: RepositoryService;
  tasks: TaskManager;
  logger: StudioLogger;
  mascotSlotJobManager: MascotSlotJobManager;
  mascotStyleJobManager: MascotStyleJobManager;
  close: () => Promise<void>;
};

export type BuildAppOptions = {
  /** Keep credentials outside isolated episode/demo storage roots. */
  environmentRoot?: string;
  /** Optional LLM client used by synchronous channel content flows (topic confirm). */
  llmClient?: LLMClient | null;
  /** Allows test hosts to replace the local file explorer integration. */
  revealFile?: (filePath: string) => Promise<void>;
  ffmpegAdapter?: FfmpegAdapter;
  animationStorageAdapter?: AnimationStorageAdapter;
  videoUploadService?: VideoUploadService;
  videoProcessingRepository?: VideoProcessingRepository;
  mascotSlotJobManager?: MascotSlotJobManager;
  mascotStyleJobManager?: MascotStyleJobManager;
};

export async function buildApp(
  rootDirectory = process.env.STUDIO_ROOT ?? process.cwd(),
  options: BuildAppOptions = {},
): Promise<StudioApp> {
  await loadServerEnv(options.environmentRoot ?? rootDirectory);
  const configuredStorageRoot = await loadStorageRoot(rootDirectory);
  const logger = new StudioLogger(rootDirectory, process.env.STUDIO_DEBUG === "1");
  logger.setRuntimeRoot(studioRuntimePath(configuredStorageRoot ?? rootDirectory));
  await logger.init();

  const repository = new RepositoryService(rootDirectory, configuredStorageRoot ?? rootDirectory);
  await repository.ensureBootstrap();
  styleActivationManager.configurePersistence(repository.resolvePath("runtime", "style-modules", "state.json"));

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
    state.config.image_fallback,
  );
  await tasks.load();

  const mascotSlotJobRepository = createMascotSlotJobRepository(repository);
  const mascotSlotJobManager =
    options.mascotSlotJobManager ??
    createMascotSlotJobManager({
      repository,
      jobRepository: mascotSlotJobRepository,
      imageConfig: state.config.image_generation,
      imageFallbackConfig: state.config.image_fallback,
      logger,
    });
  await mascotSlotJobManager.initialize();

  const mascotStyleJobRepository = createMascotStyleJobRepository(repository);
  const mascotStyleJobManager =
    options.mascotStyleJobManager ??
    createMascotStyleJobManager({
      repository,
      jobRepository: mascotStyleJobRepository,
      imageConfig: state.config.image_generation,
      imageFallbackConfig: state.config.image_fallback,
      logger,
    });
  await mascotStyleJobManager.initialize();

  const server = Fastify({ logger: false, bodyLimit: 50 * 1024 * 1024 });
  await registerServerPlugins(server, rootDirectory);
  registerErrorHandler(server, logger);
  await registerAllRoutes({
    server,
    rootDirectory,
    repository,
    tasks,
    codex,
    antigravity,
    logger,
    state,
    mascotSlotJobManager,
    mascotStyleJobManager,
    ...options,
  });

  return {
    server,
    repository,
    tasks,
    logger,
    mascotSlotJobManager,
    mascotStyleJobManager,
    close: async () => {
      mascotSlotJobManager.destroy();
      mascotStyleJobManager.destroy();
      await codex.close();
      await server.close();
      await repository.close();
    },
  };
}
