import React from "react";
import type { QuestionImageItem, QuestionImageSlot } from "../../types/questionImages.types";
import type { PreviewImageData } from "../../types";
import { QuestionImageSlotCard } from "./QuestionImageSlotCard";

export interface QuestionImageSlotGridProps {
  item: QuestionImageItem;
  uploadingSlots?: Record<string, boolean>;
  disabled?: boolean;
  getImageUrlForSlot: (slot: QuestionImageSlot) => string | null;
  onUploadSlot: (slotId: string, file: File) => void | Promise<unknown>;
  onResetSlot: (slotId: string) => void | Promise<unknown>;
  onPreviewSlot?: (data: PreviewImageData) => void;
}

export function QuestionImageSlotGrid({
  item,
  uploadingSlots = {},
  disabled = false,
  getImageUrlForSlot,
  onUploadSlot,
  onResetSlot,
  onPreviewSlot,
}: QuestionImageSlotGridProps): React.JSX.Element {
  const slots = item.slots;
  const count = Math.min(Math.max(slots.length, 1), 3);
  const gridCountClass = `slots-count-${count}`;

  return (
    <div className={`question-image-slots-grid ${gridCountClass}`}>
      {slots.map((slot) => {
        const slotKey = `${item.question_number}:${slot.slot_id}`;
        const isUploading = Boolean(uploadingSlots[slotKey]);
        const slotImageUrl = getImageUrlForSlot(slot);

        return (
          <QuestionImageSlotCard
            key={slot.slot_id}
            questionNumber={item.question_number}
            questionText={item.question_text}
            slot={slot}
            imageUrl={slotImageUrl}
            uploading={isUploading}
            disabled={disabled}
            onUpload={(file) => onUploadSlot(slot.slot_id, file)}
            onReset={() => onResetSlot(slot.slot_id)}
            onPreview={onPreviewSlot}
          />
        );
      })}
    </div>
  );
}
