import { randomUUID } from "node:crypto";
import {
  type TransitionCatalogResponse,
  type TransitionPreviewErrorCode,
  type TransitionPreviewRequest,
  type TransitionPreviewStatus,
  computeCatalogRevision,
  getTransitionDefinition,
} from "@studio/shared";
import { getTransitionCatalogSnapshot } from "./transitionPreviewCatalog.js";
import { resolveEpisodeTransitionPreview } from "./transitionPreviewEpisode.js";
import {
  buildTransitionPreviewSpecimen,
  type PreparedTransitionSpecimenData,
} from "./transitionPreviewSpecimen.js";
import type {
  CallerContext,
  ClockPort,
  TransitionPreviewLimiterPort,
  TransitionPreviewRepositoryPort,
  TransitionPreviewRunnerPort,
  TransitionPreviewServiceDeps,
  TransitionPreviewStorePort,
} from "./transitionPreview.types.js";
import {
  InternalRenderWork,
  type InternalRenderWorkOptions,
} from "./internalRenderWork.js";

export { InternalRenderWork, type InternalRenderWorkOptions };

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

type LeaseInit = DistributiveOmit<TransitionPreviewStatus, "jobId">;

interface LeaseRecord {
  lease: TransitionPreviewStatus;
  callerId: string;
  fingerprint: string;
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

    if (request.catalogRevision !== currentCatalogRevision) {
      return this.recordFailedLease(
        request.clientRequestId,
        caller.callerId,
        "CATALOG_CHANGED",
        "Transition catalog revision has changed",
        true,
      );
    }

    let definition;
    try {
      definition = getTransitionDefinition(request.selection.id);
    } catch {
      return this.recordFailedLease(
        request.clientRequestId,
        caller.callerId,
        "UNKNOWN_TRANSITION",
        `Unknown transition ID: ${request.selection.id}`,
        false,
      );
    }

    if (request.source.kind === "episode") {
      const jobId = this.createJobId();
      const status = await resolveEpisodeTransitionPreview(this.repository, request, jobId);
      this.leases.set(jobId, {
        lease: status,
        callerId: caller.callerId,
        fingerprint: status.fingerprint,
      });
      return status;
    }

    const specimenData = buildTransitionPreviewSpecimen({
      request,
      currentCatalogRevision,
      definitionId: definition.id,
      definitionRevision: definition.implementationRevision,
    });

    const existingArtifact = await this.store.findArtifactByFingerprint(specimenData.fingerprint);
    if (existingArtifact) {
      return this.recordReadyLease(
        request.clientRequestId,
        caller.callerId,
        specimenData.fingerprint,
        existingArtifact.artifactId,
      );
    }

    const existingWork = this.activeWorks.get(specimenData.fingerprint);
    if (existingWork) {
      return this.attachToExistingWork(existingWork, request.clientRequestId, caller.callerId);
    }

    return this.launchNewWork(
      specimenData,
      currentCatalogRevision,
      request.clientRequestId,
      caller.callerId,
    );
  }

  async status(jobId: string, caller?: CallerContext): Promise<TransitionPreviewStatus> {
    return this.getAuthorizedLease(jobId, caller).lease;
  }

  async cancel(jobId: string, caller: CallerContext): Promise<TransitionPreviewStatus> {
    const record = this.getAuthorizedLease(jobId, caller);
    if (
      record.lease.status === "cancelled" ||
      record.lease.status === "ready" ||
      record.lease.status === "failed"
    ) {
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

  private getAuthorizedLease(jobId: string, caller?: CallerContext): LeaseRecord {
    const record = this.leases.get(jobId);
    if (!record) {
      const error = new Error(`Job not found: ${jobId}`) as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
    if (caller && record.callerId !== caller.callerId) {
      const error = new Error(
        `Unauthorized: lease does not belong to caller ${caller.callerId}`,
      ) as Error & { statusCode?: number };
      error.statusCode = 403;
      throw error;
    }
    return record;
  }

  private attachToExistingWork(
    work: InternalRenderWork,
    requestId: string,
    callerId: string,
  ): TransitionPreviewStatus {
    const jobId = this.createJobId();
    work.addLease(jobId, callerId);
    const status = work.toStatus(jobId, requestId, 1);
    this.leases.set(jobId, { lease: status, callerId, fingerprint: work.fingerprint });
    return status;
  }

  private launchNewWork(
    specimenData: PreparedTransitionSpecimenData,
    catalogRevision: string,
    requestId: string,
    callerId: string,
  ): TransitionPreviewStatus {
    const queuedStatus = this.registerLease(callerId, {
      status: "queued",
      requestId,
      fingerprint: specimenData.fingerprint,
      revision: 1,
    });

    const work = new InternalRenderWork({
      fingerprint: specimenData.fingerprint,
      specimen: specimenData.specimen,
      snapshot: specimenData.snapshot,
      catalogRevision,
      sourceKind: "sample",
      currentness: "matches-request",
      store: this.store,
      runner: this.runner,
      limiter: this.limiter,
      clock: this.clock,
      renderTimeoutMs: this.renderTimeoutMs,
      onStatusChange: (updatedWork) => this.broadcastWorkStatus(updatedWork),
    });

    work.addLease(queuedStatus.jobId, callerId);
    this.activeWorks.set(specimenData.fingerprint, work);
    work.start();

    return queuedStatus;
  }

  private broadcastWorkStatus(work: InternalRenderWork): void {
    for (const [jobId] of work.leases) {
      const record = this.leases.get(jobId);
      if (record && record.lease.status !== "cancelled") {
        record.lease = work.toStatus(jobId, record.lease.requestId, record.lease.revision + 1);
      }
    }

    if (work.status === "ready" || work.status === "failed" || work.status === "cancelled") {
      this.activeWorks.delete(work.fingerprint);
    }
  }

  private registerLease(callerId: string, lease: LeaseInit): TransitionPreviewStatus {
    const jobId = this.createJobId();
    const fullLease = { ...lease, jobId } as TransitionPreviewStatus;
    this.leases.set(jobId, { lease: fullLease, callerId, fingerprint: lease.fingerprint });
    return fullLease;
  }

  private recordFailedLease(
    requestId: string,
    callerId: string,
    code: TransitionPreviewErrorCode,
    message: string,
    retryable: boolean,
  ): TransitionPreviewStatus {
    return this.registerLease(callerId, {
      status: "failed",
      requestId,
      fingerprint: "",
      revision: 1,
      error: { code, message, retryable },
    });
  }

  private recordReadyLease(
    requestId: string,
    callerId: string,
    fingerprint: string,
    artifactId: string,
  ): TransitionPreviewStatus {
    return this.registerLease(callerId, {
      status: "ready",
      requestId,
      fingerprint,
      revision: 1,
      artifactId,
      manifestUrl: `/api/transition-previews/artifacts/${artifactId}/manifest`,
      videoUrl: `/api/transition-previews/artifacts/${artifactId}/video`,
    });
  }

  private createJobId(): string {
    return `job_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
}
