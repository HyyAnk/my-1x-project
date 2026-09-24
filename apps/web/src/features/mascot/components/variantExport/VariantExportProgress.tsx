import type { VariantExportJob } from "@studio/shared";

const labels: Record<VariantExportJob["status"], string> = {
  running: "Downloading",
  cancelling: "Cancelling after current image",
  completed: "Download complete",
  partial: "Completed with errors",
  failed: "Download failed",
  cancelled: "Download cancelled",
};
export function VariantExportProgress({ job }: { job: VariantExportJob }) {
  const percentage = job.total ? Math.floor((job.processed / job.total) * 100) : 0;
  return (
    <section className="variant-export-progress" aria-label="Export progress">
      <p role="status">
        {labels[job.status]} · {job.mode === "original" ? "Original" : "Transparent"} · {job.processed}/{job.total} ({percentage}%)
      </p>
      <progress value={job.processed} max={job.total || 1} aria-label="Export progress" />
      {job.current && <p className="variant-export-path">{job.current}</p>}
      <p>
        {job.copied} saved · {job.skipped} unchanged · {job.failed} failed
      </p>
      {job.failures.length > 0 && (
        <details>
          <summary>Failed images ({job.failed})</summary>
          <ul>
            {job.failures.map((failure, index) => (
              <li key={`${failure.item}-${index}`}>
                {failure.item}: {failure.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
