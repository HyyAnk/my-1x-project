import { useCallback, useRef, useState } from "react";

export interface UseAssetDropzoneOptions {
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  disabled?: boolean;
}

export function useAssetDropzone({
  onFileSelect,
  onFilesSelect,
  disabled = false,
}: UseAssetDropzoneOptions) {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const fileList = e.dataTransfer.files;
      if (!fileList || fileList.length === 0) return;

      if (onFilesSelect) {
        onFilesSelect(Array.from(fileList));
      } else if (onFileSelect) {
        onFileSelect(fileList[0]);
      }
    },
    [disabled, onFileSelect, onFilesSelect],
  );

  const openFileDialog = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList && fileList.length > 0) {
        if (onFilesSelect) {
          onFilesSelect(Array.from(fileList));
        } else if (onFileSelect) {
          onFileSelect(fileList[0]);
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onFileSelect, onFilesSelect],
  );

  return {
    isDragOver,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openFileDialog,
    handleInputChange,
  };
}
