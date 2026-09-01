import type { Task } from "@studio/shared";

function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s left`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s left` : `${minutes}m left`;
}

export function formatRenderProgress(task: Task): string | null {
  const progress = task.render_progress;
  if (!progress) return null;
  const frames = `${progress.frames_completed.toLocaleString("en-US")} / ${progress.total_frames.toLocaleString("en-US")} frames`;
  const workers = `${progress.worker_count.toLocaleString("en-US")} ${progress.worker_count === 1 ? "worker" : "workers"}`;
  const eta = progress.eta_seconds === null ? null : formatEta(progress.eta_seconds);
  return [frames, workers, eta].filter(Boolean).join(" · ");
}
