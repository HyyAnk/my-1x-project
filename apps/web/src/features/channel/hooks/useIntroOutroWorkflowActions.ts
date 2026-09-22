import { useCallback, useRef } from "react";
import type { IntroOutroClipKind, IntroOutroScriptRevision, MascotStyleIdentityProfile } from "@studio/shared";
import { api } from "../../../api";
import type { GenerateScriptClipInput } from "../../../api/introOutroScriptApi";
import type { UseScriptStudioProps } from "./introOutroScriptStudio.types";
import type { IntroOutroScriptData } from "./useIntroOutroScriptData";
import { useScriptStudioOperation } from "./useScriptStudioOperation";

const operationId = () =>
  typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useIntroOutroWorkflowActions(props: UseScriptStudioProps, data: IntroOutroScriptData) {
  const run = useScriptStudioOperation(props, data);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  const analyzeIdentity = useCallback(
    () =>
      run("analyze-identity", async () => {
        const response = await api.analyzeIntroOutroIdentity(props.channelId, {
          style_preset_id: props.stylePresetId,
          idempotency_key: `identity-${operationId()}`,
        });
        data.setJob(response.job);
      }),
    [data, props.channelId, props.stylePresetId, run],
  );

  const reviewIdentity = useCallback(
    (profile: MascotStyleIdentityProfile) =>
      run("review-identity", async () => {
        await api.reviewIntroOutroIdentity(props.channelId, {
          style_preset_id: props.stylePresetId,
          mascot_style_id: profile.mascot_style_id,
          expected_updated_at: data.contextBundle?.identity?.updated_at ?? null,
          profile,
        });
        await data.refresh();
        props.onNotice({ tone: "good", message: "Mascot identity approved." });
      }),
    [data, props.channelId, props.onNotice, props.stylePresetId, run],
  );

  const generate = useCallback(
    async (clips: GenerateScriptClipInput[]) => {
      const current = data.projectRef.current;
      if (!current) return;
      await run("generate", async () => {
        const response = await api.generateIntroOutroScripts(props.channelId, current.project_id, {
          expected_version: current.version,
          idempotency_key: `generation-${operationId()}`,
          clips,
        });
        data.setJob(response.job);
      });
    },
    [data, props.channelId, run],
  );

  const cancelJob = useCallback(async () => {
    if (!data.job) return;
    await run("cancel-job", async () => {
      const response = await api.cancelIntroOutroScriptJob(props.channelId, data.job!.job_id);
      data.setJob(response.job);
    });
  }, [data, props.channelId, run]);

  const saveContent = useCallback(
    (kind: IntroOutroClipKind, content: IntroOutroScriptRevision["content"]) => {
      const queued = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          const current = data.projectRef.current;
          if (!current) return;
          const response = await api.updateIntroOutroScriptProject(props.channelId, current.project_id, {
            expected_version: current.version,
            drafts: { [kind]: { content } },
          });
          data.projectRef.current = response.project;
          data.setProject(response.project);
          data.setProjects((projects) =>
            projects.map((item) => (item.project_id === response.project.project_id ? response.project : item)),
          );
        });
      saveQueue.current = queued.catch((cause) => {
        const message = cause instanceof Error ? cause.message : "Draft save failed";
        data.setError(message);
        props.onNotice({ tone: "bad", message });
      });
      return queued;
    },
    [data, props.channelId, props.onNotice],
  );

  const checkpoint = useCallback(
    async (kind: IntroOutroClipKind) => {
      await saveQueue.current;
      const current = data.projectRef.current;
      if (!current) return;
      await run("checkpoint", async () => {
        const response = await api.checkpointIntroOutroScript(props.channelId, current.project_id, {
          clip_kind: kind,
          expected_version: current.version,
        });
        data.projectRef.current = response.project;
        data.setProject(response.project);
        await data.loadRevisions(response.project.project_id);
      });
    },
    [data, props.channelId, run],
  );

  const validate = useCallback(
    async (kind: IntroOutroClipKind) => {
      await saveQueue.current;
      const current = data.projectRef.current;
      if (!current) return [];
      const response = await api.validateIntroOutroScriptDraft(props.channelId, current.project_id, {
        clip_kind: kind,
      });
      return response.issues;
    },
    [data, props.channelId],
  );

  const approve = useCallback(
    async (revisionId: string) => {
      const current = data.projectRef.current;
      if (!current) return;
      await run("approve", async () => {
        const response = await api.approveIntroOutroScriptRevision(props.channelId, current.project_id, {
          revision_id: revisionId,
          expected_version: current.version,
        });
        data.projectRef.current = response.project;
        data.setProject(response.project);
        props.onNotice({ tone: "good", message: "Script revision approved." });
      });
    },
    [data, props.channelId, props.onNotice, run],
  );

  const copyPrompt = useCallback(
    async (revisionId: string) => {
      const current = data.projectRef.current;
      if (!current) return;
      await run("copy-prompt", async () => {
        const response = await api.exportIntroOutroScriptRevision(props.channelId, current.project_id, revisionId);
        await navigator.clipboard.writeText(response.prompt);
        props.onNotice({ tone: "good", message: "Production prompt copied." });
      });
    },
    [data, props.channelId, props.onNotice, run],
  );

  return {
    analyzeIdentity,
    reviewIdentity,
    generate,
    cancelJob,
    saveContent,
    checkpoint,
    validate,
    approve,
    copyPrompt,
  };
}
