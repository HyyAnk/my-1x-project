import { useEffect, useRef, useState } from "react";
import type { IntroOutroClipKind, IntroOutroScriptJob } from "@studio/shared";
import type { usePairDraft } from "./usePairDraft";
import { pairWorkspaceApi } from "./pairWorkspaceApi";
import type { PairGenerationRequest } from "./pairWorkspace.types";

export const isPendingJob = (job: IntroOutroScriptJob | null) => job?.status === "queued" || job?.status === "running";

export function usePairGeneration(channelId: string, draft: ReturnType<typeof usePairDraft>) {
  const [autoIdentity, setAutoIdentity] = useState(true);
  const [job, setJob] = useState<IntroOutroScriptJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const alive = useRef(true);
  const currentDraft = useRef(draft);
  currentDraft.current = draft;
  const uncertain = useRef<{ projectId: string; request: PairGenerationRequest } | null>(null);
  const pending = submitting || isPendingJob(job);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    setJob(draft.initialJob);
    uncertain.current = null;
  }, [draft.initialJob, draft.project?.project_id]);
  useEffect(() => {
    if (!job || !isPendingJob(job)) return;
    let stopped = false;
    let timer: number;
    const poll = async () => {
      try {
        const result = await pairWorkspaceApi.job(channelId, job.job_id);
        if (stopped) return;
        if (!isPendingJob(result.job) || result.job.result_revision_ids.length > job.result_revision_ids.length)
          await currentDraft.current.refresh();
        if (stopped) return;
        setJob(result.job);
        setError(null);
        if (!isPendingJob(result.job)) return;
      } catch {
        if (!stopped) setError("Connection interrupted. Reconnecting...");
      }
      if (!stopped) timer = window.setTimeout(() => void poll(), 1200);
    };
    timer = window.setTimeout(() => void poll(), 300);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [channelId, job?.job_id, job?.status, job?.result_revision_ids.length]);

  const generate = async (kinds: IntroOutroClipKind[] = ["intro", "outro"]) => {
    if (lock.current || isPendingJob(job)) return;
    const manuallyEdited = kinds.some(
      (kind) =>
        draft.texts[kind] &&
        (!draft.project?.drafts[kind].source_revision_id || draft.texts[kind] !== draft.project.drafts[kind].prompt_text),
    );
    if (!uncertain.current && manuallyEdited && !window.confirm("Replace your edited scripts with newly generated scripts?")) return;
    lock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const project = await draft.flush();
      if (!uncertain.current)
        uncertain.current = {
          projectId: project.project_id,
          request: {
            expected_version: project.version,
            auto_identity: autoIdentity,
            idempotency_key: crypto.randomUUID(),
            clips: kinds.map((kind) => ({ clip_kind: kind, duration_seconds: 8, randomization_seed: crypto.randomUUID() })),
          },
        };
      const result = await pairWorkspaceApi.generate(channelId, uncertain.current.projectId, uncertain.current.request);
      if (!isPendingJob(result.job)) await draft.refresh();
      uncertain.current = null;
      if (alive.current) setJob(result.job);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && typeof cause.status === "number" && cause.status < 500)
        uncertain.current = null;
      if (alive.current) setError(cause instanceof Error ? cause.message : "Generation failed");
    } finally {
      lock.current = false;
      if (alive.current) setSubmitting(false);
    }
  };
  const cancel = async () => {
    if (!job || lock.current) return;
    lock.current = true;
    setSubmitting(true);
    try {
      const result = await pairWorkspaceApi.cancel(channelId, job.job_id);
      await draft.refresh();
      if (alive.current) setJob(result.job);
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : "Cancellation failed");
    } finally {
      lock.current = false;
      if (alive.current) setSubmitting(false);
    }
  };
  return { autoIdentity, setAutoIdentity, job, pending, submitting, error, generate, cancel };
}
