import type {
  QuestionImageItem,
  QuestionImageSlot,
  QuestionImageSlotPurpose,
  QuestionImagesOverviewResponse,
  QuestionImageStatus,
  ResetQuestionImageResponse,
  UploadQuestionImageResponse,
} from "@studio/shared";
import type { Notice } from "../../../components/types";

export type {
  QuestionImageItem,
  QuestionImageSlot,
  QuestionImageSlotPurpose,
  QuestionImagesOverviewResponse,
  QuestionImageStatus,
  ResetQuestionImageResponse,
  UploadQuestionImageResponse,
};

export interface UseQuestionImagesProps {
  channelId: string;
  episodeId: string;
  hasQuiz?: boolean;
  onNotice?: (notice: NonNullable<Notice>) => void;
  onUpdated?: () => Promise<void> | void;
}

export interface UseQuestionImagesReturn {
  overview: QuestionImagesOverviewResponse | null;
  loading: boolean;
  error: string | null;
  uploading: Record<number, boolean>;
  uploadingSlots: Record<string, boolean>;
  generating: Record<number, boolean>;
  previewUrls: Record<string, string>;
  versionBuster: Record<number, number>;
  refresh: () => Promise<void>;
  uploadImage: (questionNumber: number, file: File, slotId?: string) => Promise<boolean>;
  resetImage: (questionNumber: number, slotId?: string) => Promise<boolean>;
  generateImage: (questionNumber: number, promptOverride?: string) => Promise<boolean>;
  clearPreview: (questionNumber: number, slotId?: string) => void;
  getImageUrl: (questionNumber: number, slotId?: string) => string;
}
