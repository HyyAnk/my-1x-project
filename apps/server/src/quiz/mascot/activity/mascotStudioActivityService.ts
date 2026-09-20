import type {
  MascotSlotProjection,
  MascotStudioActivityStatusResponse,
  MascotStudioActivityWarning,
  MascotStudioStyleActivity,
  MascotVideoProcessingJob,
  SlotBatchStatusResponse,
  StyleBatchStatusResponse,
} from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { MascotSlotJobManager } from "../slotJobs/index.js";
import type { MascotStyleJobManager } from "../styleJobs/index.js";
import type { VideoProcessingRepository } from "../videoAnimation/index.js";

const RECENT_ACTIVITY_WINDOW_MS = 10 * 60 * 1000;
const ACTIVE_SLOT_STATUSES = new Set<MascotSlotProjection["status"]>(["uploading", "queued", "processing", "retrying", "replacing"]);
const ACTIVE_JOB_STATUSES = new Set<MascotVideoProcessingJob["status"]>(["queued", "uploading", "processing"]);

export interface MascotStudioActivityServiceDeps {
  repository: RepositoryService;
  slotJobManager: MascotSlotJobManager;
  styleJobManager: MascotStyleJobManager;
  videoProcessingRepository: VideoProcessingRepository;
}

function isRecent(timestamp: string, nowMs: number): boolean {
  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) && value <= nowMs + 60_000 && nowMs - value <= RECENT_ACTIVITY_WINDOW_MS;
}

function compactSlotStatus(status: SlotBatchStatusResponse): SlotBatchStatusResponse {
  return {
    ...status,
    recent_batches: status.recent_batches?.slice(0, 1),
  };
}

function compactStyleStatus(status: StyleBatchStatusResponse): StyleBatchStatusResponse {
  return {
    ...status,
    recent_batches: status.recent_batches?.slice(0, 1),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown activity status error";
}

async function loadAnimationJobs(
  repository: VideoProcessingRepository,
  mascotId: string,
  styleId: string,
  nowMs: number,
): Promise<MascotVideoProcessingJob[]> {
  const projections = await repository.listSlotProjections(mascotId, styleId);
  const jobIds = new Set(
    projections
      .filter((slot) => Boolean(slot.active_job_id) && (ACTIVE_SLOT_STATUSES.has(slot.status) || isRecent(slot.updated_at, nowMs)))
      .map((slot) => slot.active_job_id as string),
  );

  const jobs = await Promise.all(Array.from(jobIds, (jobId) => repository.getJob(jobId)));
  return jobs
    .filter((job): job is MascotVideoProcessingJob => {
      if (!job) return false;
      return (
        job.mascot_id === mascotId && job.style_id === styleId && (ACTIVE_JOB_STATUSES.has(job.status) || isRecent(job.updated_at, nowMs))
      );
    })
    .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime());
}

export class MascotStudioActivityService {
  constructor(private readonly deps: MascotStudioActivityServiceDeps) {}

  public async getStatus(mascotId: string): Promise<MascotStudioActivityStatusResponse> {
    const mascot = await this.deps.repository.getMascot(mascotId);
    const now = new Date();
    const warnings: MascotStudioActivityWarning[] = [];

    const styleConceptResult = await Promise.allSettled([this.deps.styleJobManager.getBatchStatus(mascotId)]);
    const styleConcepts = this.resolveStyleConceptStatus(styleConceptResult[0], warnings);

    const styles = await Promise.all(
      (mascot.styles || []).map(async (style): Promise<MascotStudioStyleActivity> => {
        const [slotResult, animationResult] = await Promise.allSettled([
          this.deps.slotJobManager.getBatchStatus(mascotId, style.id),
          loadAnimationJobs(this.deps.videoProcessingRepository, mascotId, style.id, now.getTime()),
        ]);

        return {
          style_id: style.id,
          style_name: style.name,
          slot_generation: this.resolveSlotStatus(slotResult, style.id, warnings),
          animation_jobs: this.resolveAnimationJobs(animationResult, style.id, warnings),
        };
      }),
    );

    return {
      mascot_id: mascotId,
      checked_at: now.toISOString(),
      style_concepts: styleConcepts,
      styles,
      warnings,
    };
  }

  private resolveStyleConceptStatus(
    result: PromiseSettledResult<StyleBatchStatusResponse>,
    warnings: MascotStudioActivityWarning[],
  ): StyleBatchStatusResponse {
    if (result.status === "fulfilled") return compactStyleStatus(result.value);
    warnings.push({ scope: "style_concepts", message: errorMessage(result.reason) });
    return { active_batch: null, queued_style_ids: [], active_style_ids: [], recent_batches: [] };
  }

  private resolveSlotStatus(
    result: PromiseSettledResult<SlotBatchStatusResponse>,
    styleId: string,
    warnings: MascotStudioActivityWarning[],
  ): SlotBatchStatusResponse {
    if (result.status === "fulfilled") return compactSlotStatus(result.value);
    warnings.push({ scope: "slot_generation", style_id: styleId, message: errorMessage(result.reason) });
    return { active_batch: null, queued_slot_keys: [], active_slot_keys: [], recent_batches: [] };
  }

  private resolveAnimationJobs(
    result: PromiseSettledResult<MascotVideoProcessingJob[]>,
    styleId: string,
    warnings: MascotStudioActivityWarning[],
  ): MascotVideoProcessingJob[] {
    if (result.status === "fulfilled") return result.value;
    warnings.push({ scope: "animation_processing", style_id: styleId, message: errorMessage(result.reason) });
    return [];
  }
}

export function createMascotStudioActivityService(deps: MascotStudioActivityServiceDeps): MascotStudioActivityService {
  return new MascotStudioActivityService(deps);
}
