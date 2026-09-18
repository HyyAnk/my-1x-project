import type { RefObject, ChangeEvent } from "react";
import type { AnimationState } from "@studio/shared";

export interface SlotCardFileInputsProps {
  state: AnimationState;
  slotIndex: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  replaceInputRef: RefObject<HTMLInputElement | null>;
  onFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onReplaceInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function SlotCardFileInputs({
  state,
  slotIndex,
  fileInputRef,
  replaceInputRef,
  onFileInputChange,
  onReplaceInputChange,
}: SlotCardFileInputsProps) {
  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept="video/mp4,video/quicktime,video/webm"
        style={{ display: "none" }}
        onChange={onFileInputChange}
        data-testid={`file-input-${state}-${slotIndex}`}
      />
      <input
        type="file"
        ref={replaceInputRef}
        accept="video/mp4,video/quicktime,video/webm"
        style={{ display: "none" }}
        onChange={onReplaceInputChange}
        data-testid={`replace-input-${state}-${slotIndex}`}
      />
    </>
  );
}
