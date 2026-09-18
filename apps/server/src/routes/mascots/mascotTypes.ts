import type { RepositoryService } from "../../repository.js";
import type { StudioLogger } from "../../logger.js";
import type { AppState } from "../state.js";
import type {
  AnimationJobService,
  AnimationPublishService,
  AnimationQaService,
  AnimationRepository,
} from "../../quiz/mascot/animation/index.js";
import type {
  AnimationPackagingService,
  AnimationStorageAdapter,
  FfmpegAdapter,
  FrameExtractionService,
  FrameMattingService,
  FrameRegistrationService,
  MascotMattingAdapter,
  VideoProcessingOrchestrator,
  VideoProcessingRepository,
  VideoUploadService,
} from "../../quiz/mascot/videoAnimation/index.js";
import type { MascotSlotJobManager } from "../../quiz/mascot/slotJobs/index.js";
import type { MascotStyleJobManager } from "../../quiz/mascot/styleJobs/index.js";

export type MascotsRouteDeps = {
  repository: RepositoryService;
  logger: StudioLogger;
  state: AppState;
  mascotSlotJobManager?: MascotSlotJobManager;
  mascotStyleJobManager?: MascotStyleJobManager;
  animationRepository?: AnimationRepository;
  animationJobService?: AnimationJobService;
  animationPublishService?: AnimationPublishService;
  animationQaService?: AnimationQaService;
  videoUploadService?: VideoUploadService;
  videoProcessingRepository?: VideoProcessingRepository;
  animationStorageAdapter?: AnimationStorageAdapter;
  ffmpegAdapter?: FfmpegAdapter;
  videoProcessingOrchestrator?: VideoProcessingOrchestrator;
  frameExtractionService?: FrameExtractionService;
  mascotMattingAdapter?: MascotMattingAdapter;
  frameMattingService?: FrameMattingService;
  frameRegistrationService?: FrameRegistrationService;
  animationPackagingService?: AnimationPackagingService;
};
