import { vi } from "vitest";
import type { IntroOutroScriptJob } from "@studio/shared";
import type { StudioApp } from "../../src/app.js";

/**
 * Wall-clock budget for background script jobs. Jobs persist through the file system, so a
 * fixed attempt count (or vi.waitFor's 1s default) is too tight when the full suite runs in parallel.
 */
export const SCRIPT_JOB_WAIT_OPTIONS = { timeout: 10_000, interval: 10 } as const;

const activeStatuses = new Set<IntroOutroScriptJob["status"]>(["queued", "running"]);

export async function fetchScriptJob(app: StudioApp, channelId: string, jobId: string): Promise<IntroOutroScriptJob> {
  const response = await app.server.inject({
    method: "GET",
    url: `/api/channels/${channelId}/intro-outro-script-jobs/${jobId}`,
  });
  return response.json<{ job: IntroOutroScriptJob }>().job;
}

export function waitForScriptJob(app: StudioApp, channelId: string, jobId: string): Promise<IntroOutroScriptJob> {
  return vi.waitFor(async () => {
    const job = await fetchScriptJob(app, channelId, jobId);
    if (activeStatuses.has(job.status)) {
      throw new Error(`Script job did not reach a terminal state (last status: ${job.status})`);
    }
    return job;
  }, SCRIPT_JOB_WAIT_OPTIONS);
}
