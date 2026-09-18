import type {
  CancelSlotGenerationInput,
  MascotSlotBatchJob,
  QueueSlotGenerationInput,
  SlotBatchStatusResponse,
} from "@studio/shared";
import { request } from "../../../api/client";

export interface CancelSlotGenerationResponse {
  ok: boolean;
  batch: MascotSlotBatchJob | null;
}

export const mascotSlotJobApi = {
  queueSlotGeneration: async (
    mascotId: string,
    styleId: string,
    input: QueueSlotGenerationInput,
  ): Promise<MascotSlotBatchJob> => {
    return request<MascotSlotBatchJob>(
      `/api/mascots/${encodeURIComponent(mascotId)}/styles/${encodeURIComponent(styleId)}/jobs/queue`,
      {
        method: "POST",
        body: JSON.stringify({ ...input, style_id: styleId }),
      },
    );
  },

  getSlotGenerationStatus: async (
    mascotId: string,
    styleId: string,
  ): Promise<SlotBatchStatusResponse> => {
    return request<SlotBatchStatusResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/styles/${encodeURIComponent(styleId)}/jobs/status`,
    );
  },

  cancelSlotGeneration: async (
    mascotId: string,
    styleId: string,
    input?: Partial<CancelSlotGenerationInput>,
  ): Promise<CancelSlotGenerationResponse> => {
    return request<CancelSlotGenerationResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/styles/${encodeURIComponent(styleId)}/jobs/cancel`,
      {
        method: "POST",
        body: JSON.stringify({ ...input, style_id: styleId }),
      },
    );
  },
};
