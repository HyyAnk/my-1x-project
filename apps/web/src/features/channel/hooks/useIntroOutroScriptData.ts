import { useCallback, useEffect, useRef, useState } from "react";
import type { IntroOutroScriptJob, IntroOutroScriptProject, IntroOutroScriptRevision } from "@studio/shared";
import { api } from "../../../api";
import type { ScriptContextBundle, UseScriptStudioProps } from "./introOutroScriptStudio.types";
import { useIntroOutroJobPolling } from "./useIntroOutroJobPolling";

export function useIntroOutroScriptData(props: UseScriptStudioProps) {
  const [contextBundle, setContextBundle] = useState<ScriptContextBundle | null>(null);
  const [projects, setProjects] = useState<IntroOutroScriptProject[]>([]);
  const [project, setProject] = useState<IntroOutroScriptProject | null>(null);
  const [revisions, setRevisions] = useState<IntroOutroScriptRevision[]>([]);
  const [job, setJob] = useState<IntroOutroScriptJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const projectRef = useRef<IntroOutroScriptProject | null>(null);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const loadRevisions = useCallback(
    async (projectId: string | null) => {
      if (!projectId) {
        setRevisions([]);
        return;
      }
      const response = await api.listIntroOutroScriptRevisions(props.channelId, projectId);
      setRevisions(response.revisions);
    },
    [props.channelId],
  );

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setError(null);
    try {
      const [contextResponse, projectResponse] = await Promise.all([
        api.getIntroOutroScriptContext(props.channelId, props.stylePresetId),
        api.listIntroOutroScriptProjects(props.channelId, props.stylePresetId),
      ]);
      if (version !== requestVersion.current) return;
      setContextBundle(contextResponse);
      setProjects(projectResponse.projects);
      const currentId = projectRef.current?.project_id;
      const nextProject = projectResponse.projects.find((item) => item.project_id === currentId) ?? projectResponse.projects[0] ?? null;
      setProject(nextProject);
      projectRef.current = nextProject;
      await loadRevisions(nextProject?.project_id ?? null);
    } catch (cause) {
      if (version !== requestVersion.current) return;
      setError(cause instanceof Error ? cause.message : "Failed to load Script Studio");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [loadRevisions, props.channelId, props.stylePresetId]);

  useEffect(() => {
    setLoading(true);
    setProject(null);
    projectRef.current = null;
    setJob(null);
    void refresh();
    return () => {
      requestVersion.current += 1;
    };
  }, [refresh]);

  const selectProject = useCallback(
    (projectId: string) => {
      const selected = projects.find((item) => item.project_id === projectId) ?? null;
      setProject(selected);
      projectRef.current = selected;
      void loadRevisions(selected?.project_id ?? null);
    },
    [loadRevisions, projects],
  );

  const onJobTerminal = useCallback(
    async (completed: IntroOutroScriptJob) => {
      await refresh();
      if (completed.status === "succeeded") {
        props.onNotice({
          tone: "good",
          message: completed.type === "identity_analysis" ? "Identity analysis is ready for review." : "Scripts are ready for review.",
        });
      } else if (completed.status === "partial") {
        props.onNotice({ tone: "bad", message: "One script completed. Retry the unfinished clip." });
      } else if (completed.status === "failed" || completed.status === "interrupted") {
        props.onNotice({ tone: "bad", message: completed.error_message ?? "The script job did not complete." });
      }
    },
    [props.onNotice, refresh],
  );

  useIntroOutroJobPolling({ channelId: props.channelId, job, setJob, onTerminal: onJobTerminal });

  return {
    contextBundle,
    setContextBundle,
    projects,
    setProjects,
    project,
    setProject,
    projectRef,
    revisions,
    setRevisions,
    job,
    setJob,
    loading,
    busy,
    setBusy,
    error,
    setError,
    selectProject,
    refresh,
    loadRevisions,
  };
}

export type IntroOutroScriptData = ReturnType<typeof useIntroOutroScriptData>;
