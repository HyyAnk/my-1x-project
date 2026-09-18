import type {
  CancelStyleGenerationInput,
  MascotStyleBatchJob,
  QueueStyleGenerationInput,
  StyleBatchStatusResponse,
} from "@studio/shared";
import { request } from "../../../api/client";

export interface CancelStyleGenerationResponse {
  ok: boolean;
  batch: MascotStyleBatchJob | null;
}

export const mascotStyleJobApi = {
  queueStyleGeneration: async (
    mascotId: string,
    input: QueueStyleGenerationInput,
  ): Promise<MascotStyleBatchJob> => {
    return request<MascotStyleBatchJob>(
      `/api/mascots/${encodeURIComponent(mascotId)}/styles/jobs/queue`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
  },

  getStyleGenerationStatus: async (
    mascotId: string,
  ): Promise<StyleBatchStatusResponse> => {
    return request<StyleBatchStatusResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/styles/jobs/status`,
    );
  },

  cancelStyleGeneration: async (
    mascotId: string,
    input?: CancelStyleGenerationInput,
  ): Promise<CancelStyleGenerationResponse> => {
    return request<CancelStyleGenerationResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/styles/jobs/cancel`,
      {
        method: "POST",
        body: JSON.stringify(input || {}),
      },
    );
  },
};
