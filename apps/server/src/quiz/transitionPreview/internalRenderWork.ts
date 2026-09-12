import type {
  TransitionPreviewErrorCode,
  TransitionPreviewStatus,
} from "@studio/shared";
import type { RenderEngineSnapshot } from "../../tasks/video/renderEngineSnapshot.js";
import type { BuiltTransitionSpecimen } from "../render/transitions/buildTransitionSpecimen.js";
import type { VerifiedPreviewArtifact } from "./transitionPreviewStore.js";
import type {
  ClockPort,
  TransitionPreviewLimiterPort,
  TransitionPreviewRunnerPort,
  TransitionPreviewServiceDeps,
  TransitionRunnerProgress,
} from "./transitionPreview.types.js";

export interface InternalRenderWorkOptions {
  fingerprint: string;
  specimen: BuiltTransitionSpecimen;
  snapshot: RenderEngineSnapshot;
  catalogRevision: string;
  sourceKind: "sample" | "episode";
  currentness: "matches-request" | "legacy-unverified";
  store: TransitionPreviewServiceDeps["store"];
  runner: TransitionPreviewRunnerPort;
  limiter?: TransitionPreviewLimiterPort;
  clock?: ClockPort;
  renderTimeoutMs?: number;
  onStatusChange: (work: InternalRenderWork) => void;
}

export class InternalRenderWork {
  readonly fingerprint: string;
  readonly specimen: BuiltTransitionSpecimen;
  readonly snapshot: RenderEngineSnapshot;
  readonly catalogRevision: string;
  readonly sourceKind: "sample" | "episode";
  readonly currentness: "matches-request" | "legacy-unverified";
  private readonly store: TransitionPreviewServiceDeps["store"];
  private readonly runner: TransitionPreviewRunnerPort;
  private readonly limiter?: TransitionPreviewLimiterPort;
  private readonly clock?: ClockPort;
  private readonly renderTimeoutMs: number;
  private readonly onStatusChange: (work: InternalRenderWork) => void;

  readonly abortController = new AbortController();
  readonly leases = new Map<string, string>(); // jobId -> callerId
  status: "queued" | "running" | "ready" | "failed" | "cancelled" = "queued";
  phase: "prepare" | "capture" | "encode" | "verify" = "prepare";
  completedFrames: number | null = null;
  totalFrames: number | null = null;
  artifact: VerifiedPreviewArtifact | null = null;
  error: { code: TransitionPreviewErrorCode; message: string; retryable: boolean } | null = null;
  private timeoutTimer: NodeJS.Timeout | null = null;

  constructor(options: InternalRenderWorkOptions) {
    this.fingerprint = options.fingerprint;
    this.specimen = options.specimen;
    this.snapshot = options.snapshot;
    this.catalogRevision = options.catalogRevision;
    this.sourceKind = options.sourceKind;
    this.currentness = options.currentness;
    this.store = options.store;
    this.runner = options.runner;
    this.limiter = options.limiter;
    this.clock = options.clock;
    this.renderTimeoutMs = options.renderTimeoutMs ?? 120_000;
    this.onStatusChange = options.onStatusChange;
  }

  addLease(jobId: string, callerId: string): void {
    this.leases.set(jobId, callerId);
  }

  removeLease(jobId: string): void {
    this.leases.delete(jobId);
  }

  activeLeaseCount(): number {
    return this.leases.size;
  }

  abort(): void {
    this.stopTimeout();
    this.abortController.abort();
  }

  start(): void {
    void this.execute();
  }

  toStatus(jobId: string, requestId: string, revision = 1): TransitionPreviewStatus {
    if (this.status === "ready" && this.artifact) {
      return {
        status: "ready",
        jobId,
        requestId,
        fingerprint: this.fingerprint,
        revision,
        artifactId: this.artifact.artifactId,
        manifestUrl: `/api/transition-previews/artifacts/${this.artifact.artifactId}/manifest`,
        videoUrl: `/api/transition-previews/artifacts/${this.artifact.artifactId}/video`,
      };
    }
    if (this.status === "failed" && this.error) {
      return {
        status: "failed",
        jobId,
        requestId,
        fingerprint: this.fingerprint,
        revision,
        error: this.error,
      };
    }
    if (this.status === "running") {
      return {
        status: "running",
        jobId,
        requestId,
        fingerprint: this.fingerprint,
        revision,
        phase: this.phase,
        completedFrames: this.completedFrames,
        totalFrames: this.totalFrames,
      };
    }
    if (this.status === "cancelled") {
      return {
        status: "cancelled",
        jobId,
        requestId,
        fingerprint: this.fingerprint,
        revision,
      };
    }
    return {
      status: "queued",
      jobId,
      requestId,
      fingerprint: this.fingerprint,
      revision,
    };
  }

  private startTimeout(): void {
    this.timeoutTimer = setTimeout(() => {
      if (this.status === "running") {
        this.abortController.abort();
        this.status = "failed";
        this.error = {
          code: "RENDER_TIMEOUT",
          message: `Render exceeded execution timeout of ${Math.round(this.renderTimeoutMs / 1000)}s`,
          retryable: true,
        };
        this.onStatusChange(this);
      }
    }, this.renderTimeoutMs);
  }

  private stopTimeout(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  private handleExecutionFailure(err: unknown): void {
    if (this.abortController.signal.aborted) {
      if (!this.error) {
        this.status = "cancelled";
      }
      return;
    }

    const errorObj = err as { code?: string; message?: string } | undefined;
    const code: TransitionPreviewErrorCode =
      errorObj?.code === "ENGINE_UNAVAILABLE"
        ? "ENGINE_UNAVAILABLE"
        : errorObj?.code === "DECODE_FAILED"
          ? "DECODE_FAILED"
          : "RENDER_FAILED";

    this.status = "failed";
    this.error = {
      code,
      message: errorObj?.message || "Render failed",
      retryable: code !== "ENGINE_UNAVAILABLE",
    };
  }

  private async acquireLimiterSlot(): Promise<(() => void) | undefined> {
    if (!this.limiter) return undefined;
    return this.limiter.acquireSlot(this.fingerprint, {
      signal: this.abortController.signal,
    });
  }

  private async executeRender(): Promise<VerifiedPreviewArtifact> {
    return this.runner.render({
      fingerprint: this.fingerprint,
      specimen: this.specimen,
      snapshot: this.snapshot,
      catalogRevision: this.catalogRevision,
      sourceKind: this.sourceKind,
      currentness: this.currentness,
      signal: this.abortController.signal,
      onProgress: (progress: TransitionRunnerProgress) => {
        this.phase = progress.phase;
        this.completedFrames = progress.completedFrames;
        this.totalFrames = progress.totalFrames ?? this.specimen.totalDurationFrames;
        this.onStatusChange(this);
      },
    });
  }

  private async execute(): Promise<void> {
    let releaseSlot: (() => void) | undefined;
    try {
      if (this.abortController.signal.aborted) return;
      releaseSlot = await this.acquireLimiterSlot();
      if (this.abortController.signal.aborted) return;

      this.status = "running";
      this.phase = "prepare";
      this.totalFrames = this.specimen.totalDurationFrames;
      this.onStatusChange(this);

      this.startTimeout();
      const artifact = await this.executeRender();
      if (this.abortController.signal.aborted) return;

      this.phase = "verify";
      this.onStatusChange(this);

      await this.store.publishArtifact(artifact);
      this.artifact = artifact;
      this.status = "ready";
      this.onStatusChange(this);
    } catch (err: unknown) {
      this.handleExecutionFailure(err);
      this.onStatusChange(this);
    } finally {
      this.stopTimeout();
      if (releaseSlot) {
        try {
          releaseSlot();
        } catch {
          // ignore
        }
      }
    }
  }
}
