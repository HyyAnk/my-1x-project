import type { FastifyInstance } from "fastify";
import type { TaskEvent } from "@studio/shared";
import type { AntigravityClient } from "../antigravity.js";
import type { CodexAppServerClient } from "../codex.js";
import type { StudioLogger } from "../logger.js";
import type { RepositoryService } from "../repository.js";
import type { TaskManager } from "../tasks.js";
import type { LLMClient } from "../utils/promptSanitizer.js";
import type {
  AnimationStorageAdapter,
  FfmpegAdapter,
  VideoUploadService,
  VideoProcessingRepository,
} from "../quiz/mascot/videoAnimation/index.js";
import type { MascotSlotJobManager } from "../quiz/mascot/slotJobs/index.js";
import type { MascotStyleJobManager } from "../quiz/mascot/styleJobs/index.js";
import type { MascotGreenScreenAuditService } from "../quiz/mascot/audit/index.js";
import type { AppState } from "./state.js";
import { registerEventsRoutes, type EventClient } from "./events.js";
import { createPortraitImageClient } from "../providers/imageGeneration/portraitImageClient.js";
import { revealFileInSystem } from "../server/fileReveal.js";
import { createTransitionPreviewService } from "../quiz/transitionPreview/transitionPreviewFactory.js";
import { registerAnalyticsRoutes } from "./analytics.js";
import { registerAudioVideoRoutes } from "./audioVideo.js";
import { registerChannelsRoutes } from "./channels.js";
import { registerChannelAssetsRoutes } from "./channelAssets.js";
import { registerEpisodesRoutes } from "./episodes.js";
import { registerIntroOutroStylesRoutes } from "./introOutroStyles.js";
import { registerIntroOutroScriptRoutes } from "./introOutroScripts.js";
import { IntroOutroScriptJobManager } from "../introOutroScripts/jobManager.js";
import { IntroOutroScriptRepository } from "../introOutroScripts/repository.js";
import { resolveIntroOutroScriptModel } from "../introOutroScripts/model.js";
import { registerMascotsRoutes } from "./mascots.js";
import { registerQuestionBankRoutes } from "./questionBank.js";
import { registerQuizV2Routes } from "./quizV2.js";
import { registerSettingsRoutes } from "./settings.js";
import { registerShortReelsRoutes } from "./shortReels.js";
import { registerStyleModulesRoutes } from "./styleModules.js";
import { registerStylePresetsRoutes } from "./stylePresets.js";
import { registerSystemRoutes } from "./system.js";
import { registerTasksRoutes } from "./tasks.js";
import { registerThumbnailsRoutes } from "./thumbnails.js";
import { registerTransitionPreviewsRoutes } from "./transitionPreviews.js";
import { registerVisualBibleRoutes } from "./visualBible.js";
import { registerVoicesRoutes } from "./voices.js";

export type RegisterAllRoutesOptions = {
  server: FastifyInstance;
  rootDirectory: string;
  repository: RepositoryService;
  tasks: TaskManager;
  codex: CodexAppServerClient;
  antigravity: AntigravityClient;
  logger: StudioLogger;
  state: AppState;
  revealFile?: (filePath: string) => Promise<void>;
  llmClient?: LLMClient | null;
  introOutroScriptClient?: LLMClient | null;
  ffmpegAdapter?: FfmpegAdapter;
  animationStorageAdapter?: AnimationStorageAdapter;
  videoUploadService?: VideoUploadService;
  videoProcessingRepository?: VideoProcessingRepository;
  mascotSlotJobManager?: MascotSlotJobManager;
  mascotStyleJobManager?: MascotStyleJobManager;
  mascotGreenScreenAuditService?: MascotGreenScreenAuditService;
};

export async function registerAllRoutes(deps: RegisterAllRoutesOptions): Promise<void> {
  const { server, rootDirectory, repository, tasks, codex, antigravity, logger, state } = deps;
  const revealFile = deps.revealFile ?? revealFileInSystem;
  const activeLlmClient: LLMClient | undefined =
    deps.llmClient !== undefined ? (deps.llmClient ?? undefined) : state.config.active_engine === "antigravity" ? antigravity : codex;
  const scriptClient = deps.introOutroScriptClient !== undefined ? deps.introOutroScriptClient : antigravity;
  const scriptRepository = new IntroOutroScriptRepository(repository);
  const scriptModel = resolveIntroOutroScriptModel(state.config.antigravity.model);
  const scriptJobs = new IntroOutroScriptJobManager(repository, scriptRepository, scriptClient, scriptModel, logger);
  await scriptJobs.initialize();
  const portraitImageClient = createPortraitImageClient(state.config.image_generation, state.config.image_fallback);

  const clients = new Set<EventClient>();
  tasks.on("event", (event: TaskEvent) => {
    const payload = JSON.stringify(event);
    for (const client of clients) {
      if (client.readyState === client.OPEN) client.send(payload);
    }
  });

  await server.register(registerSystemRoutes({ rootDirectory, repository, tasks, codex, antigravity, logger, state }));
  await server.register(registerSettingsRoutes({ rootDirectory, tasks, codex, antigravity, state }));
  await server.register(registerVoicesRoutes({ repository, logger, state }));
  await server.register(registerChannelsRoutes({ repository, tasks, logger, state, llmClient: activeLlmClient }));
  await server.register(registerChannelAssetsRoutes({ repository, logger }));
  await server.register(
    registerMascotsRoutes({
      repository,
      logger,
      state,
      ffmpegAdapter: deps.ffmpegAdapter,
      animationStorageAdapter: deps.animationStorageAdapter,
      videoUploadService: deps.videoUploadService,
      videoProcessingRepository: deps.videoProcessingRepository,
      mascotSlotJobManager: deps.mascotSlotJobManager,
      mascotStyleJobManager: deps.mascotStyleJobManager,
      mascotGreenScreenAuditService: deps.mascotGreenScreenAuditService,
    }),
  );
  await server.register(registerEpisodesRoutes({ repository, state, tasks }));
  await server.register(
    registerShortReelsRoutes({ repository, tasks, logger, llmClient: activeLlmClient, imageClient: portraitImageClient }),
  );
  await server.register(registerQuizV2Routes({ repository, tasks, codex, antigravity, state }));
  await server.register(registerVisualBibleRoutes({ repository, tasks, state }));
  await server.register(registerAudioVideoRoutes({ repository, tasks, state, revealFile }));
  await server.register(registerTasksRoutes({ tasks, codex }));
  await server.register(registerThumbnailsRoutes({ repository, state, antigravity }));
  await server.register(registerAnalyticsRoutes({ repository }));
  await server.register(registerEventsRoutes({ tasks, clients }));
  await server.register(registerStylePresetsRoutes({ repository }));
  await server.register(registerStyleModulesRoutes({ repository }));
  await server.register(registerQuestionBankRoutes({ repository, tasks, codex, antigravity, state }));
  await server.register(registerIntroOutroStylesRoutes({ repository, logger, state, scripts: scriptRepository }));
  await server.register(
    registerIntroOutroScriptRoutes({
      repository,
      scripts: scriptRepository,
      jobs: scriptJobs,
      client: scriptClient,
      model: scriptModel,
      logger,
    }),
  );

  const { service: transitionPreviewService, store: transitionPreviewStore } = createTransitionPreviewService(
    repository,
    tasks.videoRenderLimiter,
  );
  await server.register(
    registerTransitionPreviewsRoutes({
      service: transitionPreviewService,
      store: transitionPreviewStore,
    }),
  );
}
