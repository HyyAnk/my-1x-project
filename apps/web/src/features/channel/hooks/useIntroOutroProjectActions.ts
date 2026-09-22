import { useCallback } from "react";
import { api } from "../../../api";
import type { UseScriptStudioProps } from "./introOutroScriptStudio.types";
import type { IntroOutroScriptData } from "./useIntroOutroScriptData";
import { useScriptStudioOperation } from "./useScriptStudioOperation";

export function useIntroOutroProjectActions(props: UseScriptStudioProps, data: IntroOutroScriptData) {
  const run = useScriptStudioOperation(props, data);

  const createProject = useCallback(
    () =>
      run("create-project", async () => {
        const response = await api.createIntroOutroScriptProject(props.channelId, {
          style_preset_id: props.stylePresetId,
          name: `${props.categoryName} Scripts`,
        });
        data.projectRef.current = response.project;
        data.setProject(response.project);
        await data.refresh();
      }),
    [data, props.categoryName, props.channelId, props.stylePresetId, run],
  );

  const duplicateProject = useCallback(async () => {
    const current = data.projectRef.current;
    if (!current) return;
    await run("duplicate-project", async () => {
      const response = await api.duplicateIntroOutroScriptProject(props.channelId, current.project_id);
      data.projectRef.current = response.project;
      data.setProject(response.project);
      await data.refresh();
    });
  }, [data, props.channelId, run]);

  const renameProject = useCallback(
    async (name: string) => {
      const current = data.projectRef.current;
      const normalized = name.trim();
      if (!current || !normalized || normalized === current.name) return;
      await run("rename-project", async () => {
        const response = await api.updateIntroOutroScriptProject(props.channelId, current.project_id, {
          expected_version: current.version,
          name: normalized,
        });
        data.projectRef.current = response.project;
        data.setProject(response.project);
        await data.refresh();
      });
    },
    [data, props.channelId, run],
  );

  const archiveProject = useCallback(async () => {
    const current = data.projectRef.current;
    if (!current) return;
    await run("archive-project", async () => {
      await api.updateIntroOutroScriptProject(props.channelId, current.project_id, {
        expected_version: current.version,
        archived: true,
      });
      data.projectRef.current = null;
      data.setProject(null);
      await data.refresh();
    });
  }, [data, props.channelId, run]);

  return { createProject, duplicateProject, renameProject, archiveProject };
}
