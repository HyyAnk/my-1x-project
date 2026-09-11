import type {
  TransitionPreviewRequest,
  TransitionPreviewStatus,
  TransitionPreviewErrorCode,
} from "@studio/shared";
import type { BuiltTransitionSpecimen } from "../render/transitions/buildTransitionSpecimen.js";
import type { RenderEngineSnapshot } from "../../tasks/video/renderEngineSnapshot.js";
import type { VerifiedPreviewArtifact } from "../render/transitions/transitionPreviewStore.js";

export type CallerContext = {
  callerId: string;
  clientRequestId?: string;
};

export type TransitionRunnerProgress = {
  phase: "prepare" | "capture" | "encode" | "verify";
  completedFrames: number | null;
  totalFrames: number | null;
};

export type TransitionPreviewRunnerInput = {
  fingerprint: string;
  specimen: BuiltTransitionSpecimen;
  snapshot: RenderEngineSnapshot;
  catalogRevision: string;
  sourceKind: "sample" | "episode";
  currentness: "matches-request" | "legacy-unverified";
  signal?: AbortSignal;
  onProgress?: (progress: TransitionRunnerProgress) => void;
};

export interface TransitionPreviewRunnerPort {
  render(input: TransitionPreviewRunnerInput): Promise<VerifiedPreviewArtifact>;
}

export interface TransitionPreviewStorePort {
  getPublishedArtifact(artifactId: string): Promise<VerifiedPreviewArtifact | null>;
  findArtifactByFingerprint(fingerprint: string): Promise<VerifiedPreviewArtifact | null>;
  publishArtifact(artifact: VerifiedPreviewArtifact): Promise<VerifiedPreviewArtifact>;
  verifyArtifact(artifactId: string): Promise<VerifiedPreviewArtifact | null>;
}

export type EpisodeRenderOutput = {
  videoPath: string;
  manifestPath?: string;
  manifest?: any;
  transitionSettings?: any;
};

export interface TransitionPreviewRepositoryPort {
  getEpisodeRenderOutput?(channelId: string, episodeId: string): Promise<EpisodeRenderOutput | null>;
}

export interface TransitionPreviewLimiterPort {
  acquireSlot(jobId: string, options?: { signal?: AbortSignal }): Promise<() => void>;
}

export interface ClockPort {
  now(): number;
}

export type TransitionPreviewServiceDeps = {
  store: TransitionPreviewStorePort;
  runner: TransitionPreviewRunnerPort;
  repository?: TransitionPreviewRepositoryPort;
  limiter?: TransitionPreviewLimiterPort;
  clock?: ClockPort;
  renderTimeoutMs?: number;
};
