import type { Task } from "@studio/shared";

function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s left`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s left` : `${minutes}m left`;
}

export function formatRenderProgress(task: Task): string | null {
  const progress = task.render_progress;
  if (progress && progress.total_frames > 0) {
    const frames = `${progress.frames_completed.toLocaleString("en-US")} / ${progress.total_frames.toLocaleString("en-US")} frames`;
    const elapsedSec = progress.elapsed_ms !== null && progress.elapsed_ms > 0 ? progress.elapsed_ms / 1000 : null;
    const fps = elapsedSec !== null && progress.frames_completed > 0 ? `${(progress.frames_completed / elapsedSec).toFixed(1)} fps` : null;
    const workers = `${progress.worker_count.toLocaleString("en-US")} ${progress.worker_count === 1 ? "worker" : "workers"}`;
    const eta = progress.eta_seconds === null ? null : formatEta(progress.eta_seconds);
    return [frames, fps, workers, eta].filter(Boolean).join(" · ");
  }

  if (task.progress_message) {
    const match = /(?:rendering|streaming|render)?\s*frames?\s*(\d[\d,]*)\s*(?:\/|of)\s*(\d[\d,]*)/i.exec(task.progress_message);
    if (match) {
      const frames = `${match[1]} / ${match[2]} frames`;
      return frames;
    }
  }

  return null;
}
