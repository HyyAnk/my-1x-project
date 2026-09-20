import type { MascotVideoProcessingJob } from "../animation/types/videoJob.types.js";
import type { SlotBatchStatusResponse } from "../slotJob/slotJobTypes.js";
import type { StyleBatchStatusResponse } from "../styleJob/styleJobTypes.js";

export interface MascotStudioStyleActivity {
  style_id: string;
  style_name: string;
  slot_generation: SlotBatchStatusResponse;
  animation_jobs: MascotVideoProcessingJob[];
}

export interface MascotStudioActivityWarning {
  scope: "style_concepts" | "slot_generation" | "animation_processing";
  style_id?: string;
  message: string;
}

export interface MascotStudioActivityStatusResponse {
  mascot_id: string;
  checked_at: string;
  style_concepts: StyleBatchStatusResponse;
  styles: MascotStudioStyleActivity[];
  warnings: MascotStudioActivityWarning[];
}
