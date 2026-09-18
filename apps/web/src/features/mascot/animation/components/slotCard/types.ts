import type { AnimationState, MascotSlotProjection, MascotVideoProcessingJob } from "@studio/shared";

export interface AnimationProcessingSlotCardProps {
  mascotId: string;
  styleId: string;
  state: AnimationState;
  slotIndex: number;
  projection?: MascotSlotProjection | null;
  activeJob?: MascotVideoProcessingJob | null;
  sourceImageUrl?: string | null;
  isBusy?: boolean;
  onUploadVideo: (file: File) => void;
  onRetry: () => void;
  onReplaceVideo: (file: File) => void;
  onCancelJob?: (jobId: string) => void;
}
