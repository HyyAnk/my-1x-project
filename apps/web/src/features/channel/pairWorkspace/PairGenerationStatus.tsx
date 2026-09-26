import type { usePairGeneration } from "./usePairGeneration";

export function PairGenerationStatus({ generation, disabled }: { generation: ReturnType<typeof usePairGeneration>; disabled: boolean }) {
  const { job, pending } = generation;
  const step = generation.submitting ? "Submitting request..." : (job?.step ?? "Starting generation...");
  const failed = job?.status === "failed" || job?.status === "partial" || job?.status === "interrupted";
  return (
    <>
      {" "}
      <div className="pair-generation-status" role="status" aria-live="polite">
        {pending ? (
          <>
            <progress aria-label={step} />
            <span>{step}</span>
            {job && !generation.submitting ? (
              <button type="button" className="quiet-button" onClick={() => void generation.cancel()}>
                Cancel
              </button>
            ) : null}
          </>
        ) : job ? (
          <span>{job.status === "succeeded" ? "Scripts ready" : job.status === "cancelled" ? "Generation cancelled" : job.step}</span>
        ) : null}
      </div>
      {generation.error || (!pending && failed && job?.error_message) ? (
        <div role="alert" className="script-alert error">
          {generation.error ?? job?.error_message}
        </div>
      ) : null}
      {failed && !pending ? (
        <div className="pair-retry-row">
          <span>{job.clip_errors.map((item) => `${item.clip_kind}: ${item.message}`).join(" ") || "Generation did not complete"}</span>
          <button
            type="button"
            className="quiet-button"
            disabled={disabled}
            onClick={() => void generation.generate(job.failed_clip_kinds.length ? job.failed_clip_kinds : ["intro", "outro"])}
          >
            Retry failed
          </button>
        </div>
      ) : null}
    </>
  );
}
