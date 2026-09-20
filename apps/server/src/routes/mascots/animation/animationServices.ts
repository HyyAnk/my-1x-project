import path from "node:path";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import {
  createAnimationJobService,
  createAnimationPublishService,
  createAnimationRepository,
  DefaultSpriteGenAdapter,
  type AnimationJobService,
  type AnimationPublishService,
  type AnimationRepository,
} from "../../../quiz/mascot/animation/index.js";
import {
  createAnimationPackagingService,
  createAnimationStorageAdapter,
  createFfmpegAdapter,
  createFrameExtractionService,
  createFrameMattingService,
  createFrameRegistrationService,
  createMascotMattingAdapter,
  createVideoProcessingOrchestrator,
  createVideoProcessingRepository,
  createVideoUploadService,
  type AnimationStorageAdapter,
  type VideoProcessingOrchestrator,
  type VideoProcessingRepository,
  type VideoUploadService,
} from "../../../quiz/mascot/videoAnimation/index.js";
import type { MascotsRouteDeps } from "../mascotTypes.js";

export interface MascotAnimationSpriteRouteDeps {
  repository: RepositoryService;
  logger: StudioLogger;
  animRepo: AnimationRepository;
  jobService: AnimationJobService;
  publishService: AnimationPublishService;
}

export interface MascotAnimationVideoRouteDeps {
  repository: RepositoryService;
  storageAdapter: AnimationStorageAdapter;
  videoProcessingRepo: VideoProcessingRepository;
  videoUploadService: VideoUploadService;
  orchestrator: VideoProcessingOrchestrator;
}

export interface MascotAnimationArtifactRouteDeps {
  outputBaseDir: string;
  storageAdapter: AnimationStorageAdapter;
  videoProcessingRepo: VideoProcessingRepository;
}

export interface ResolvedMascotAnimationServices {
  sprite: MascotAnimationSpriteRouteDeps;
  video: MascotAnimationVideoRouteDeps;
  artifact: MascotAnimationArtifactRouteDeps;
}

/**
 * Resolves or initializes all services and adapters required across the animation sub-routers.
 */
export function resolveMascotAnimationServices(deps: MascotsRouteDeps): ResolvedMascotAnimationServices {
  const { repository, logger } = deps;
  const storageRoot = path.dirname(repository.roots.mascots);
  const outputBaseDir = path.join(storageRoot, "runtime", "animations");
  const animRepo = deps.animationRepository ?? createAnimationRepository({ storageRoot });
  const jobService =
    deps.animationJobService ??
    createAnimationJobService({
      repository: animRepo,
      adapter: new DefaultSpriteGenAdapter(),
      outputBaseDir,
    });
  const publishService = deps.animationPublishService ?? createAnimationPublishService({ repository: animRepo });

  const storageAdapter = deps.animationStorageAdapter ?? createAnimationStorageAdapter(storageRoot);
  const ffmpegAdapter = deps.ffmpegAdapter ?? createFfmpegAdapter({ timeoutMs: 300_000 });
  const videoUploadService = deps.videoUploadService ?? createVideoUploadService(storageAdapter, ffmpegAdapter);
  const videoProcessingRepo = deps.videoProcessingRepository ?? createVideoProcessingRepository(storageAdapter);
  const extractionService = deps.frameExtractionService ?? createFrameExtractionService(storageAdapter, ffmpegAdapter);
  const mattingAdapter = deps.mascotMattingAdapter ?? createMascotMattingAdapter();
  const mattingService = deps.frameMattingService ?? createFrameMattingService(storageAdapter, mattingAdapter);
  const registrationService = deps.frameRegistrationService ?? createFrameRegistrationService(storageAdapter);
  const packagingService =
    deps.animationPackagingService ?? createAnimationPackagingService(storageAdapter, registrationService, ffmpegAdapter);
  const orchestrator =
    deps.videoProcessingOrchestrator ??
    createVideoProcessingOrchestrator({
      storageAdapter,
      repository: videoProcessingRepo,
      uploadService: videoUploadService,
      extractionService,
      mattingService,
      registrationService,
      packagingService,
    });

  deps.animationRepository = animRepo;
  deps.animationJobService = jobService;
  deps.animationPublishService = publishService;
  deps.animationStorageAdapter = storageAdapter;
  deps.ffmpegAdapter = ffmpegAdapter;
  deps.videoUploadService = videoUploadService;
  deps.videoProcessingRepository = videoProcessingRepo;
  deps.videoProcessingOrchestrator = orchestrator;
  deps.frameExtractionService = extractionService;
  deps.mascotMattingAdapter = mattingAdapter;
  deps.frameMattingService = mattingService;
  deps.frameRegistrationService = registrationService;
  deps.animationPackagingService = packagingService;

  return {
    sprite: {
      repository,
      logger,
      animRepo,
      jobService,
      publishService,
    },
    video: {
      repository,
      storageAdapter,
      videoProcessingRepo,
      videoUploadService,
      orchestrator,
    },
    artifact: {
      outputBaseDir,
      storageAdapter,
      videoProcessingRepo,
    },
  };
}
