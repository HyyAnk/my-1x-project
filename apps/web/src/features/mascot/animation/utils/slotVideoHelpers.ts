import type { AnimationState } from "@studio/shared";

export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".webm"];

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Failed to read file as data URL"));
    reader.readAsDataURL(file);
  });
}

export function makeSlotKey(state: AnimationState, slotIndex: number): string {
  return `${state}_${slotIndex}`;
}

export function validateVideoFile(file: File): void {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported video format "${ext}". Please provide an MP4, MOV, or WEBM file.`);
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`Video file too large (${mb}MB). Maximum allowed size is 50MB.`);
  }
}
