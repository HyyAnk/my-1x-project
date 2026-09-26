import { Spinner, X } from "@phosphor-icons/react";
import type { IntroOutroScriptJob } from "@studio/shared";

type Props = {
  currentJob: IntroOutroScriptJob | null;
  activeJobs: IntroOutroScriptJob[];
  onCancelJob: () => void;
  onCancelSpecificJob?: (jobId: string) => void;
};

export function ActiveJobsBanner({ currentJob, activeJobs, onCancelJob, onCancelSpecificJob }: Props) {
  const runningJobs = activeJobs.filter((j) => j.status === "running");
  const queuedJobs = activeJobs.filter((j) => j.status === "queued");
  const totalActive = runningJobs.length + queuedJobs.length;

  if (totalActive === 0 && !currentJob) return null;

  if (totalActive > 1) {
    return (
      <div className="script-job-banner batch-active" aria-live="polite">
        <div className="batch-banner-info">
          <Spinner size={15} className="spin" />
          <span>
            <strong>{totalActive} jobs in progress:</strong> {runningJobs.length} generating, {queuedJobs.length} queued
            {currentJob?.step ? ` \u2022 Current: ${currentJob.step}` : ""}
          </span>
        </div>
        <button
          type="button"
          className="quiet-button cancel-batch-btn"
          onClick={() => {
            if (currentJob) {
              onCancelJob();
            } else if (activeJobs[0] && onCancelSpecificJob) {
              onCancelSpecificJob(activeJobs[0].job_id);
            }
          }}
          aria-label="Cancel current active job"
        >
          <span>Cancel</span>
          <X size={14} />
        </button>
      </div>
    );
  }

  const jobToShow = currentJob ?? activeJobs[0];
  if (!jobToShow || (jobToShow.status !== "queued" && jobToShow.status !== "running")) return null;

  return (
    <div className="script-job-banner" aria-live="polite">
      <div className="single-job-info">
        <Spinner size={14} className="spin" />
        <span>{jobToShow.step}</span>
      </div>
      <button
        type="button"
        className="icon-button"
        onClick={() => {
          if (currentJob) {
            onCancelJob();
          } else if (onCancelSpecificJob) {
            onCancelSpecificJob(jobToShow.job_id);
          }
        }}
        aria-label="Cancel script job"
      >
        <X size={15} />
      </button>
    </div>
  );
}
