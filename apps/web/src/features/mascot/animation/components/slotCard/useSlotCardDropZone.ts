import { useRef, useState, type DragEvent, type ChangeEvent } from "react";

export interface UseSlotCardDropZoneOptions {
  isProcessing: boolean;
  isReady: boolean;
  onUploadVideo: (file: File) => void;
  onReplaceVideo: (file: File) => void;
}

export function useSlotCardDropZone({ isProcessing, isReady, onUploadVideo, onReplaceVideo }: UseSlotCardDropZoneOptions) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isProcessing) setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isProcessing) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (isReady) {
        onReplaceVideo(files[0]);
      } else {
        onUploadVideo(files[0]);
      }
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUploadVideo(files[0]);
      e.target.value = "";
    }
  };

  const handleReplaceInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onReplaceVideo(files[0]);
      e.target.value = "";
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerReplace = () => {
    replaceInputRef.current?.click();
  };

  return {
    isDragOver,
    fileInputRef,
    replaceInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    handleReplaceInputChange,
    triggerUpload,
    triggerReplace,
  };
}
