import type { VideoFileInfo } from "../types";

export interface ValidateVideoOptions {
  file: File;
  onSuccess: (info: VideoFileInfo) => void;
  setProbing: (probing: boolean) => void;
}

/**
 * Validates that an uploaded video is 1080p FHD (1920x1080) H.264 MP4
 * and extracts duration, dimensions, and data URL.
 */
export function validateAndInspectVideo({ file, onSuccess, setProbing }: ValidateVideoOptions): void {
  setProbing(true);
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";

  video.onloadedmetadata = () => {
    const width = video.videoWidth;
    const height = video.videoHeight;
    const duration = video.duration;
    URL.revokeObjectURL(objectUrl);

    if (width !== 1920 || height !== 1080) {
      onSuccess({
        file,
        dataUrl: "",
        width,
        height,
        duration,
        sizeBytes: file.size,
        error: `Video must be exactly 1080p (1920x1080). Detected: ${width}x${height}. Please upscale or re-render before uploading.`,
      });
      setProbing(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onSuccess({
        file,
        dataUrl: reader.result as string,
        width,
        height,
        duration,
        sizeBytes: file.size,
      });
      setProbing(false);
    };
    reader.onerror = () => {
      onSuccess({
        file,
        dataUrl: "",
        width,
        height,
        duration,
        sizeBytes: file.size,
        error: "Failed to read video file from disk.",
      });
      setProbing(false);
    };
    reader.readAsDataURL(file);
  };

  video.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    onSuccess({
      file,
      dataUrl: "",
      width: 0,
      height: 0,
      duration: 0,
      sizeBytes: file.size,
      error: "Cannot parse video metadata. Please ensure the file is an H.264 MP4 video.",
    });
    setProbing(false);
  };

  video.src = objectUrl;
}
