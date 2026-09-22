import { useEffect } from "react";
import type { IntroOutroScriptJob } from "@studio/shared";
import { api } from "../../../api";

const terminal = new Set<IntroOutroScriptJob["status"]>(["succeeded", "partial", "failed", "cancelled", "interrupted"]);

export function useIntroOutroJobPolling(input: {
  channelId: string;
  job: IntroOutroScriptJob | null;
  setJob: (job: IntroOutroScriptJob | null) => void;
  onTerminal: (job: IntroOutroScriptJob) => Promise<void>;
}): void {
  useEffect(() => {
    const activeJob = input.job;
    if (!activeJob || terminal.has(activeJob.status)) return;
    let stopped = false;
    let timer: number | null = null;

    const poll = async () => {
      try {
        const response = await api.getIntroOutroScriptJob(input.channelId, activeJob.job_id);
        if (stopped) return;
        input.setJob(response.job);
        if (terminal.has(response.job.status)) {
          await input.onTerminal(response.job);
          return;
        }
      } catch {
        // Active jobs are retried on the next bounded poll after transient transport failures.
      } finally {
        if (!stopped) timer = window.setTimeout(() => void poll(), 1_500);
      }
    };

    timer = window.setTimeout(() => void poll(), 600);
    return () => {
      stopped = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [input.channelId, input.job?.job_id, input.job?.status, input.onTerminal, input.setJob]);
}
