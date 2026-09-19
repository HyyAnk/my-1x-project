import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MascotUploadMimeType,
  QuizImageStyle,
  UploadMascotConceptInput,
  UploadMascotConceptResponse,
} from "@studio/shared";
import { mascotApi } from "../../../api/mascotApi";
import type { Notice } from "../../../components/types";
import { useTranslation } from "../../../i18n";

export const ALLOWED_CONCEPT_IMAGE_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

export const MAX_CONCEPT_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export interface UseMascotUploaderOptions {
  mascotId?: string | null;
  name?: string;
  description?: string;
  colorTheme?: string;
  visualStyle?: QuizImageStyle;
  onSuccess?: (response: UploadMascotConceptResponse) => void | Promise<void>;
  onNotice?: (notice: Notice) => void;
  onMascotsChanged?: () => Promise<void>;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export function useMascotUploader(options: UseMascotUploaderOptions = {}) {
  const { mascotId, name, description, colorTheme, visualStyle, onSuccess, onNotice, onMascotsChanged } = options;
  const { t } = useTranslation();

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [autoMatting, setAutoMatting] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const objectUrlRef = useRef<string | null>(null);

  const clearUpload = useCallback(() => {
    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current);
      } catch {
        // Safe fallback in test environments
      }
      objectUrlRef.current = null;
    }
    setUploadFile(null);
    setPreviewUrl(null);
    setBase64Data(null);
    setDragOver(false);
  }, []);

  // Cleanup object url on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        try {
          URL.revokeObjectURL(objectUrlRef.current);
        } catch {
          // Safe fallback
        }
      }
    };
  }, []);

  const handleFileSelect = useCallback(
    (file: File): boolean => {
      if (!ALLOWED_CONCEPT_IMAGE_TYPES.includes(file.type)) {
        onNotice?.({
          tone: "bad",
          message: t("mascots.invalidFileTypeError"),
        });
        return false;
      }

      if (file.size > MAX_CONCEPT_FILE_SIZE_BYTES) {
        onNotice?.({
          tone: "bad",
          message: t("mascots.fileTooLargeError"),
        });
        return false;
      }

      // Cleanup previous object url if any
      if (objectUrlRef.current) {
        try {
          URL.revokeObjectURL(objectUrlRef.current);
        } catch {
          // Ignore
        }
        objectUrlRef.current = null;
      }

      setUploadFile(file);
      setDragOver(false);

      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        try {
          const objUrl = URL.createObjectURL(file);
          objectUrlRef.current = objUrl;
          setPreviewUrl(objUrl);
        } catch {
          // Fallback to reader
        }
      }

      readFileAsBase64(file)
        .then((base64) => {
          setBase64Data(base64);
          setPreviewUrl((prev) => prev || base64);
        })
        .catch((err) => {
          onNotice?.({
            tone: "bad",
            message: err instanceof Error ? err.message : t("mascots.uploadFailedNotice"),
          });
        });

      return true;
    },
    [onNotice, t],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleUploadConcept = useCallback(async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      let dataToUpload = base64Data;
      if (!dataToUpload) {
        dataToUpload = await readFileAsBase64(uploadFile);
        setBase64Data(dataToUpload);
      }

      const input: UploadMascotConceptInput = {
        image_data: dataToUpload,
        mime_type: uploadFile.type as MascotUploadMimeType,
        auto_matting: autoMatting,
        name: name?.trim() || undefined,
        description: description?.trim() || undefined,
        color_theme: colorTheme || undefined,
        visual_style: visualStyle || undefined,
      };

      const response = await mascotApi.uploadMascotConcept(mascotId, input);

      onNotice?.({
        tone: "good",
        message: t("mascots.uploadSuccessNotice"),
      });

      if (onSuccess) {
        await onSuccess(response);
      }

      if (onMascotsChanged) {
        await onMascotsChanged();
      }

      clearUpload();
    } catch (err) {
      onNotice?.({
        tone: "bad",
        message: err instanceof Error ? err.message : t("mascots.uploadFailedNotice"),
      });
    } finally {
      setIsUploading(false);
    }
  }, [
    uploadFile,
    base64Data,
    autoMatting,
    name,
    description,
    colorTheme,
    visualStyle,
    mascotId,
    onNotice,
    t,
    onSuccess,
    onMascotsChanged,
    clearUpload,
  ]);

  return {
    uploadFile,
    previewUrl,
    autoMatting,
    setAutoMatting,
    isUploading,
    dragOver,
    setDragOver,
    handleFileSelect,
    handleUploadConcept,
    clearUpload,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
