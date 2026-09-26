import type { VideoFileInfo } from "../components/introOutro/types";

export function inspectPairVideo(file: File, signal: AbortSignal): Promise<VideoFileInfo> {
  if (file.size > 80 * 1024 * 1024) return Promise.reject(new Error("Choose a video smaller than 80 MB"));
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const reader = new FileReader();
    const url = URL.createObjectURL(file);
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      video.onloadedmetadata = null;
      video.onerror = null;
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
    };
    const fail = (message: string) => {
      cleanup();
      if (reader.readyState === FileReader.LOADING) reader.abort();
      reject(new Error(message));
    };
    const abort = () => fail("Video selection cancelled");
    const timer = window.setTimeout(() => fail("Video inspection timed out. Try the file again."), 20000);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    video.preload = "metadata";
    video.onerror = () => fail("Cannot read this video. Choose an MP4 video.");
    video.onloadedmetadata = () => {
      const width = video.videoWidth,
        height = video.videoHeight,
        duration = video.duration;
      if (width !== 1920 || height !== 1080) {
        fail(`Use a 1920x1080 video. Selected: ${width}x${height}.`);
        return;
      }
      reader.onerror = () => fail("Could not read video file");
      reader.onload = () => {
        cleanup();
        if (typeof reader.result !== "string") {
          reject(new Error("Could not read video file"));
          return;
        }
        resolve({ file, dataUrl: reader.result, width, height, duration, sizeBytes: file.size });
      };
      reader.readAsDataURL(file);
    };
    video.src = url;
  });
}
