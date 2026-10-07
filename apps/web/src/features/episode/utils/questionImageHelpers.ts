import type { QuestionImageItem } from "../types/questionImages.types";

export const MAX_IMAGE_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that the uploaded file is a supported image and does not exceed size limits.
 */
export function validateImageFile(file: File, maxSizeBytes = MAX_IMAGE_FILE_SIZE_BYTES): ImageValidationResult {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  const isImageMime = allowedTypes.includes(file.type.toLowerCase()) || file.type.startsWith("image/");
  if (!isImageMime) {
    return { valid: false, error: "Only PNG, JPEG, and WebP image formats are supported" };
  }

  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds the limit of ${formatFileSize(maxSizeBytes)}` };
  }

  return { valid: true };
}

/**
 * Encodes a browser File object to a base64 data URL string.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read image data"));
      }
    };
    reader.onerror = () => reject(new Error("Error reading image file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Formats a byte size into a human-readable string (e.g. 1.2 MB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, exponent);
  return `${size.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

/**
 * Produces an optimistic QuestionImageItem representation after manual upload.
 */
export function createOptimisticItem(previous: QuestionImageItem, filename?: string): QuestionImageItem {
  return {
    ...previous,
    status: "user_uploaded",
    source: "explicit_episode",
    user_selected: true,
    filename: filename ?? previous.filename ?? `q${previous.question_number}_custom.png`,
    updated_at: new Date().toISOString(),
  };
}
