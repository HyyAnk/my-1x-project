import type {
  AnimationState,
  MascotSlotProjection,
  MascotVideoProcessingJob,
} from "@studio/shared";
import { apiFetch } from "./animationApiClient";

export interface StyleAnimationSlotsResponse {
  ok: boolean;
  mascot_id: string;
  style_id: string;
  slots: {
    thinking: MascotSlotProjection[];
    celebrate: MascotSlotProjection[];
  };
}

export interface UploadSlotVideoParams {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slot: number;
  data: string;
  filename: string;
  mime_type?: string;
}

export interface UploadSlotVideoResponse {
  ok: boolean;
  job_id: string;
  attempt: number;
  status: string;
  slot_projection: MascotSlotProjection;
  upload: {
    source_video_url: string;
    source_video_fingerprint: string;
    file_size_bytes: number;
    sha256: string;
    metadata: {
      width: number;
      height: number;
      durationMs: number;
      fps: number;
      codec: string;
      format: string;
    };
  };
}

export interface RetrySlotAnimationParams {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slot: number;
}

export interface RetrySlotAnimationResponse {
  ok: boolean;
  job_id: string;
  attempt: number;
  status: string;
  slot_projection: MascotSlotProjection;
}

export interface ReplaceSlotVideoParams {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slot: number;
  data: string;
  filename: string;
  mime_type?: string;
}

export interface ReplaceSlotVideoResponse {
  ok: boolean;
  job_id: string;
  attempt: number;
  status: string;
  slot_projection: MascotSlotProjection;
}

export interface GetProcessingJobResponse {
  ok: boolean;
  job: MascotVideoProcessingJob;
}

export interface CancelProcessingJobResponse {
  ok: boolean;
  job: MascotVideoProcessingJob;
  slot_projection?: MascotSlotProjection;
}

export const mascotVideoApi = {
  getStyleAnimationSlots: (
    mascotId: string,
    styleId: string,
  ): Promise<StyleAnimationSlotsResponse> =>
    apiFetch<StyleAnimationSlotsResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/styles/${encodeURIComponent(styleId)}/animation-slots`,
    ),

  getAnimationQueueStatus: (
    mascotId: string,
    styleId: string,
  ): Promise<StyleAnimationSlotsResponse> =>
    mascotVideoApi.getStyleAnimationSlots(mascotId, styleId),

  uploadSlotVideo: (params: UploadSlotVideoParams): Promise<UploadSlotVideoResponse> => {
    const { mascotId, styleId, state, slot, data, filename, mime_type } = params;
    return apiFetch<UploadSlotVideoResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/styles/${encodeURIComponent(styleId)}/animation-slots/${state}/${slot}/video`,
      {
        method: "POST",
        body: JSON.stringify({ data, filename, mime_type }),
      },
    );
  },

  uploadMascotSlotVideo: (params: UploadSlotVideoParams): Promise<UploadSlotVideoResponse> =>
    mascotVideoApi.uploadSlotVideo(params),

  retrySlotAnimation: (params: RetrySlotAnimationParams): Promise<RetrySlotAnimationResponse> => {
    const { mascotId, styleId, state, slot } = params;
    return apiFetch<RetrySlotAnimationResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/styles/${encodeURIComponent(styleId)}/animation-slots/${state}/${slot}/retry`,
      { method: "POST" },
    );
  },

  retryMascotSlot: (params: RetrySlotAnimationParams): Promise<RetrySlotAnimationResponse> =>
    mascotVideoApi.retrySlotAnimation(params),

  replaceSlotVideo: (params: ReplaceSlotVideoParams): Promise<ReplaceSlotVideoResponse> => {
    const { mascotId, styleId, state, slot, data, filename, mime_type } = params;
    return apiFetch<ReplaceSlotVideoResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/styles/${encodeURIComponent(styleId)}/animation-slots/${state}/${slot}/replace`,
      {
        method: "POST",
        body: JSON.stringify({ data, filename, mime_type }),
      },
    );
  },

  replaceMascotSlotVideo: (params: ReplaceSlotVideoParams): Promise<ReplaceSlotVideoResponse> =>
    mascotVideoApi.replaceSlotVideo(params),

  getProcessingJob: (mascotId: string, jobId: string): Promise<GetProcessingJobResponse> =>
    apiFetch<GetProcessingJobResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/animation-processing/${encodeURIComponent(jobId)}`,
    ),

  getAnimationProcessingJob: (mascotId: string, jobId: string): Promise<GetProcessingJobResponse> =>
    mascotVideoApi.getProcessingJob(mascotId, jobId),

  cancelProcessingJob: (
    mascotId: string,
    jobId: string,
    reason?: string,
  ): Promise<CancelProcessingJobResponse> =>
    apiFetch<CancelProcessingJobResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/animation-processing/${encodeURIComponent(jobId)}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    ),

  cancelAnimationProcessingJob: (
    mascotId: string,
    jobId: string,
    reason?: string,
  ): Promise<CancelProcessingJobResponse> =>
    mascotVideoApi.cancelProcessingJob(mascotId, jobId, reason),
};
