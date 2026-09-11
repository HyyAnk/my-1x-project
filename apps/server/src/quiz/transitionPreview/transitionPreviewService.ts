import { randomUUID } from "node:crypto";
import {
  type TransitionCatalogResponse,
  type TransitionPreviewErrorCode,
  type TransitionPreviewRequest,
  type TransitionPreviewStatus,
  computeCatalogRevision,
  getTransitionDefinition,
} from "@studio/shared";
import { resolveRenderEngineSnapshot, type RenderEngineSnapshot } from "../../tasks/video/renderEngineSnapshot.js";
import { prepareTransitionSpecimen } from "../render/transitions/prepareTransitionSpecimen.js";
import { buildTransitionSpecimen, type BuiltTransitionSpecimen } from "../render/transitions/buildTransitionSpecimen.js";
import { fingerprintTransitionPreview } from "./transitionPreviewFingerprint.js";
import {
  DiskTransitionPreviewStore,
  artifactIdForFingerprint,
  type VerifiedPreviewArtifact,
} from "./transitionPreviewStore.js";
import { getTransitionCatalogSnapshot } from "./transitionPreviewCatalog.js";
import type {
  CallerContext,
  ClockPort,
  TransitionPreviewLimiterPort,
  TransitionPreviewRepositoryPort,
  TransitionPreviewRunnerPort,
  TransitionPreviewServiceDeps,
  TransitionPreviewStorePort,
  TransitionRunnerProgress,
} from "./transitionPreview.types.js";

type LeaseRecord = {
  lease: TransitionPreviewStatus;
  callerId: string;
  fingerprint: string;
};

class InternalRenderWork {
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

  constructor(options: {
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
  }) {
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
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    this.abortController.abort();
  }

  start(): void {
    void this.execute();
  }

  private async execute(): Promise<void> {
    let releaseSlot: (() => void) | undefined;
    try {
      if (this.abortController.signal.aborted) return;

      // 1. Queue phase: wait for limiter slot
      if (this.limiter) {
        releaseSlot = await this.limiter.acquireSlot(this.fingerprint, {
          signal: this.abortController.signal,
        });
      }

      if (this.abortController.signal.aborted) return;

      // 2. Running phase
      this.status = "running";
      this.phase = "prepare";
      this.totalFrames = this.specimen.totalDurationFrames;
      this.onStatusChange(this);

      // Start execution timeout
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

      // 3. Render artifact
      const artifact = await this.runner.render({
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

      if (this.abortController.signal.aborted) return;

      // 4. Publish artifact
      this.phase = "verify";
      this.onStatusChange(this);

      await this.store.publishArtifact(artifact);
      this.artifact = artifact;
      this.status = "ready";
      this.onStatusChange(this);
    } catch (err: any) {
      if (this.abortController.signal.aborted) {
        if (!this.error) {
          this.status = "cancelled";
        }
      } else {
        this.status = "failed";
        const code: TransitionPreviewErrorCode =
          err?.code === "ENGINE_UNAVAILABLE"
            ? "ENGINE_UNAVAILABLE"
            : err?.code === "DECODE_FAILED"
              ? "DECODE_FAILED"
              : "RENDER_FAILED";
        this.error = {
          code,
          message: err?.message || "Render failed",
          retryable: code !== "ENGINE_UNAVAILABLE",
        };
      }
      this.onStatusChange(this);
    } finally {
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
      }
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

export class TransitionPreviewService {
  private readonly store: TransitionPreviewStorePort;
  private readonly runner: TransitionPreviewRunnerPort;
  private readonly repository?: TransitionPreviewRepositoryPort;
  private readonly limiter?: TransitionPreviewLimiterPort;
  private readonly clock?: ClockPort;
  private readonly renderTimeoutMs: number;

  private readonly leases = new Map<string, LeaseRecord>();
  private readonly activeWorks = new Map<string, InternalRenderWork>();

  constructor(deps: TransitionPreviewServiceDeps) {
    this.store = deps.store;
    this.runner = deps.runner;
    this.repository = deps.repository;
    this.limiter = deps.limiter;
    this.clock = deps.clock;
    this.renderTimeoutMs = deps.renderTimeoutMs ?? 120_000;
  }

  getCatalog(sampleRevision?: string): TransitionCatalogResponse {
    return getTransitionCatalogSnapshot(sampleRevision);
  }

  async request(
    request: TransitionPreviewRequest,
    caller: CallerContext,
  ): Promise<TransitionPreviewStatus> {
    const currentCatalogRevision = computeCatalogRevision();

    // 1. Catalog revision validation
    if (request.catalogRevision !== currentCatalogRevision) {
      const jobId = this.createJobId();
      const status: TransitionPreviewStatus = {
        status: "failed",
        jobId,
        requestId: request.clientRequestId,
        fingerprint: "",
        revision: 1,
        error: {
          code: "CATALOG_CHANGED",
          message: "Transition catalog revision has changed",
          retryable: true,
        },
      };
      this.leases.set(jobId, { lease: status, callerId: caller.callerId, fingerprint: "" });
      return status;
    }

    // 2. Definition validation
    let definition;
    try {
      definition = getTransitionDefinition(request.selection.id);
    } catch {
      const jobId = this.createJobId();
      const status: TransitionPreviewStatus = {
        status: "failed",
        jobId,
        requestId: request.clientRequestId,
        fingerprint: "",
        revision: 1,
        error: {
          code: "UNKNOWN_TRANSITION",
          message: `Unknown transition ID: ${request.selection.id}`,
          retryable: false,
        },
      };
      this.leases.set(jobId, { lease: status, callerId: caller.callerId, fingerprint: "" });
      return status;
    }

    // 3. Source handling
    if (request.source.kind === "episode") {
      const { channelId, episodeId } = request.source;
      const episodeOutput = await this.repository?.getEpisodeRenderOutput?.(channelId, episodeId);

      if (!episodeOutput || !episodeOutput.videoPath) {
        const jobId = this.createJobId();
        const status: TransitionPreviewStatus = {
          status: "failed",
          jobId,
          requestId: request.clientRequestId,
          fingerprint: "",
          revision: 1,
          error: {
            code: "RENDER_REQUIRED",
            message: "Episode output has not been rendered yet",
            retryable: false,
          },
        };
        this.leases.set(jobId, { lease: status, callerId: caller.callerId, fingerprint: "" });
        return status;
      }

      // Check if requested selection matches the episode's rendered transition settings
      const renderedTransitionId = episodeOutput.transitionSettings?.scene?.id ?? episodeOutput.transitionSettings?.intro?.id;
      if (renderedTransitionId && renderedTransitionId !== request.selection.id) {
        const jobId = this.createJobId();
        const status: TransitionPreviewStatus = {
          status: "failed",
          jobId,
          requestId: request.clientRequestId,
          fingerprint: "",
          revision: 1,
          error: {
            code: "RENDER_REQUIRED",
            message: "Draft differs from render: render required to preview changed transition settings",
            retryable: false,
          },
        };
        this.leases.set(jobId, { lease: status, callerId: caller.callerId, fingerprint: "" });
        return status;
      }

      // Reuse actual episode video artifact
      const jobId = this.createJobId();
      const artifactId = `ep_${episodeId}`;
      const status: TransitionPreviewStatus = {
        status: "ready",
        jobId,
        requestId: request.clientRequestId,
        fingerprint: `ep_fp_${episodeId}`,
        revision: 1,
        artifactId,
        manifestUrl: `/api/transition-previews/artifacts/${artifactId}/manifest`,
        videoUrl: `/api/transition-previews/artifacts/${artifactId}/video`,
      };
      this.leases.set(jobId, { lease: status, callerId: caller.callerId, fingerprint: status.fingerprint });
      return status;
    }

    // 4. Sample specimen preparation
    const prepared = prepareTransitionSpecimen({
      selection: request.selection,
      source: request.source,
    });
    const specimen = buildTransitionSpecimen(prepared);

    const snapshot = resolveRenderEngineSnapshot();
    const fingerprint = fingerprintTransitionPreview({
      catalogRevision: currentCatalogRevision,
      engineSnapshotHash: snapshot.snapshotHash,
      aspectRatio: prepared.aspectRatio as "16:9" | "9:16",
      width: prepared.width,
      height: prepared.height,
      fps: prepared.fps,
      quality: "standard",
      resolvedInstances: [specimen.resolvedInstance],
      definitionHashes: {
        [definition.id]: definition.implementationRevision,
      },
      compositionHtml: specimen.html,
      compositionFiles: specimen.files,
      sourceKind: "sample",
      boundaryId: specimen.boundaryId,
    });

    // 5. Fast cache check
    const existing = await this.store.findArtifactByFingerprint(fingerprint);
    if (existing) {
      const jobId = this.createJobId();
      const readyStatus: TransitionPreviewStatus = {
        status: "ready",
        jobId,
        requestId: request.clientRequestId,
        fingerprint,
        revision: 1,
        artifactId: existing.artifactId,
        manifestUrl: `/api/transition-previews/artifacts/${existing.artifactId}/manifest`,
        videoUrl: `/api/transition-previews/artifacts/${existing.artifactId}/video`,
      };
      this.leases.set(jobId, { lease: readyStatus, callerId: caller.callerId, fingerprint });
      return readyStatus;
    }

    // 6. Check existing shared work
    const existingWork = this.activeWorks.get(fingerprint);
    if (existingWork) {
      const jobId = this.createJobId();
      existingWork.addLease(jobId, caller.callerId);

      let status: TransitionPreviewStatus;
      if (existingWork.status === "ready" && existingWork.artifact) {
        status = {
          status: "ready",
          jobId,
          requestId: request.clientRequestId,
          fingerprint,
          revision: 1,
          artifactId: existingWork.artifact.artifactId,
          manifestUrl: `/api/transition-previews/artifacts/${existingWork.artifact.artifactId}/manifest`,
          videoUrl: `/api/transition-previews/artifacts/${existingWork.artifact.artifactId}/video`,
        };
      } else if (existingWork.status === "failed" && existingWork.error) {
        status = {
          status: "failed",
          jobId,
          requestId: request.clientRequestId,
          fingerprint,
          revision: 1,
          error: existingWork.error,
        };
      } else if (existingWork.status === "running") {
        status = {
          status: "running",
          jobId,
          requestId: request.clientRequestId,
          fingerprint,
          revision: 1,
          phase: existingWork.phase,
          completedFrames: existingWork.completedFrames,
          totalFrames: existingWork.totalFrames,
        };
      } else {
        status = {
          status: "queued",
          jobId,
          requestId: request.clientRequestId,
          fingerprint,
          revision: 1,
        };
      }

      this.leases.set(jobId, { lease: status, callerId: caller.callerId, fingerprint });
      return status;
    }

    // 7. Launch new work
    const jobId = this.createJobId();
    const queuedStatus: TransitionPreviewStatus = {
      status: "queued",
      jobId,
      requestId: request.clientRequestId,
      fingerprint,
      revision: 1,
    };
    this.leases.set(jobId, { lease: queuedStatus, callerId: caller.callerId, fingerprint });

    const work = new InternalRenderWork({
      fingerprint,
      specimen,
      snapshot,
      catalogRevision: currentCatalogRevision,
      sourceKind: "sample",
      currentness: "matches-request",
      store: this.store,
      runner: this.runner,
      limiter: this.limiter,
      clock: this.clock,
      renderTimeoutMs: this.renderTimeoutMs,
      onStatusChange: (updatedWork) => {
        this.broadcastWorkStatus(updatedWork);
      },
    });

    work.addLease(jobId, caller.callerId);
    this.activeWorks.set(fingerprint, work);
    work.start();

    return queuedStatus;
  }

  async status(jobId: string, caller?: CallerContext): Promise<TransitionPreviewStatus> {
    const record = this.leases.get(jobId);
    if (!record) {
      const error = new Error(`Job not found: ${jobId}`) as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
    if (caller && record.callerId !== caller.callerId) {
      const error = new Error(`Unauthorized: lease does not belong to caller ${caller.callerId}`) as Error & { statusCode?: number };
      error.statusCode = 403;
      throw error;
    }
    return record.lease;
  }

  async cancel(jobId: string, caller: CallerContext): Promise<TransitionPreviewStatus> {
    const record = this.leases.get(jobId);
    if (!record) {
      const error = new Error(`Job not found: ${jobId}`) as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
    if (record.callerId !== caller.callerId) {
      const error = new Error(`Unauthorized: lease does not belong to caller ${caller.callerId}`) as Error & { statusCode?: number };
      error.statusCode = 403;
      throw error;
    }

    if (record.lease.status === "cancelled" || record.lease.status === "ready" || record.lease.status === "failed") {
      return record.lease;
    }

    const updatedLease: TransitionPreviewStatus = {
      status: "cancelled",
      jobId,
      requestId: record.lease.requestId,
      fingerprint: record.fingerprint,
      revision: record.lease.revision + 1,
    };
    record.lease = updatedLease;

    const work = this.activeWorks.get(record.fingerprint);
    if (work) {
      work.removeLease(jobId);
      if (work.activeLeaseCount() === 0) {
        work.abort();
        this.activeWorks.delete(record.fingerprint);
      }
    }

    return updatedLease;
  }

  private broadcastWorkStatus(work: InternalRenderWork): void {
    for (const [jobId] of work.leases) {
      const record = this.leases.get(jobId);
      if (!record || record.lease.status === "cancelled") continue;

      const prevRev = record.lease.revision;
      const nextRev = prevRev + 1;

      if (work.status === "ready" && work.artifact) {
        record.lease = {
          status: "ready",
          jobId,
          requestId: record.lease.requestId,
          fingerprint: work.fingerprint,
          revision: nextRev,
          artifactId: work.artifact.artifactId,
          manifestUrl: `/api/transition-previews/artifacts/${work.artifact.artifactId}/manifest`,
          videoUrl: `/api/transition-previews/artifacts/${work.artifact.artifactId}/video`,
        };
      } else if (work.status === "failed" && work.error) {
        record.lease = {
          status: "failed",
          jobId,
          requestId: record.lease.requestId,
          fingerprint: work.fingerprint,
          revision: nextRev,
          error: work.error,
        };
      } else if (work.status === "running") {
        record.lease = {
          status: "running",
          jobId,
          requestId: record.lease.requestId,
          fingerprint: work.fingerprint,
          revision: nextRev,
          phase: work.phase,
          completedFrames: work.completedFrames,
          totalFrames: work.totalFrames,
        };
      } else if (work.status === "cancelled") {
        record.lease = {
          status: "cancelled",
          jobId,
          requestId: record.lease.requestId,
          fingerprint: work.fingerprint,
          revision: nextRev,
        };
      }
    }

    if (work.status === "ready" || work.status === "failed" || work.status === "cancelled") {
      this.activeWorks.delete(work.fingerprint);
    }
  }

  private createJobId(): string {
    return `job_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
}
