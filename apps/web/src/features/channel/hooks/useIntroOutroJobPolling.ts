import { useEffect, useRef } from "react";
import type { IntroOutroScriptJob } from "@studio/shared";
import { api } from "../../../api";

const terminal = new Set<IntroOutroScriptJob["status"]>(["succeeded", "partial", "failed", "cancelled", "interrupted"]);

export function useIntroOutroJobPolling(input: {
  channelId: string;
  projectId?: string | null;
  job: IntroOutroScriptJob | null;
  activeJobs?: IntroOutroScriptJob[];
  setJob: (job: IntroOutroScriptJob | null) => void;
  setActiveJobs?: (jobs: IntroOutroScriptJob[]) => void;
  onTerminal: (job: IntroOutroScriptJob) => Promise<void>;
}): void {
  const trackedJobsRef = useRef<Map<string, IntroOutroScriptJob>>(new Map());

  useEffect(() => {
    if (input.job) {
      trackedJobsRef.current.set(input.job.job_id, input.job);
    }
    for (const job of input.activeJobs ?? []) {
      trackedJobsRef.current.set(job.job_id, job);
    }
  }, [input.job, input.activeJobs]);

  useEffect(() => {
    const hasActiveSingle = input.job && !terminal.has(input.job.status);
    const hasActiveList = (input.activeJobs ?? []).some((j) => !terminal.has(j.status));
    if (!hasActiveSingle && !hasActiveList) return;

    let stopped = false;
    let timer: number | null = null;

    const poll = async () => {
      try {
        const { jobs } = await api.listActiveIntroOutroScriptJobs(input.channelId);
        if (stopped) return;

        input.setActiveJobs?.(jobs);

        if (input.projectId) {
          const currentMatching = jobs.find((j) => j.project_id === input.projectId);
          if (currentMatching) {
            input.setJob(currentMatching);
          }
        }

        // Detect jobs that reached terminal state
        for (const [jobId, prevJob] of trackedJobsRef.current.entries()) {
          if (!terminal.has(prevJob.status) && !jobs.some((j) => j.job_id === jobId)) {
            try {
              const res = await api.getIntroOutroScriptJob(input.channelId, jobId);
              if (stopped) return;
              if (terminal.has(res.job.status)) {
                trackedJobsRef.current.set(jobId, res.job);
                if (input.projectId && res.job.project_id === input.projectId) {
                  input.setJob(res.job);
                }
                await input.onTerminal(res.job);
              }
            } catch {
              // Ignore single job fetch error
            }
          }
        }

        for (const j of jobs) {
          trackedJobsRef.current.set(j.job_id, j);
        }
      } catch {
        // Polling retry
      } finally {
        if (!stopped) timer = window.setTimeout(() => void poll(), 1_500);
      }
    };

    timer = window.setTimeout(() => void poll(), 800);
    return () => {
      stopped = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [
    input.channelId,
    input.projectId,
    input.job?.job_id,
    input.job?.status,
    input.activeJobs?.length,
    input.onTerminal,
    input.setJob,
    input.setActiveJobs,
  ]);
}
