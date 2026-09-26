import type { ScriptStudioActions, ScriptStudioState, UseScriptStudioProps } from "./introOutroScriptStudio.types";
import { useIntroOutroScriptActions } from "./useIntroOutroScriptActions";
import { useIntroOutroScriptData } from "./useIntroOutroScriptData";

export function useIntroOutroScriptStudio(props: UseScriptStudioProps): ScriptStudioState & ScriptStudioActions {
  const data = useIntroOutroScriptData(props);
  const actions = useIntroOutroScriptActions(props, data);
  return {
    contextBundle: data.contextBundle,
    projects: data.projects,
    project: data.project,
    revisions: data.revisions,
    job: data.job,
    activeJobs: data.activeJobs,
    loading: data.loading,
    busy: data.busy,
    error: data.error,
    selectProject: data.selectProject,
    refresh: data.refresh,
    ...actions,
  };
}
