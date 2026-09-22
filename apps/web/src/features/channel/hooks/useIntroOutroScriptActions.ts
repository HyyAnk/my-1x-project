import type { UseScriptStudioProps } from "./introOutroScriptStudio.types";
import type { IntroOutroScriptData } from "./useIntroOutroScriptData";
import { useIntroOutroProjectActions } from "./useIntroOutroProjectActions";
import { useIntroOutroWorkflowActions } from "./useIntroOutroWorkflowActions";

export function useIntroOutroScriptActions(props: UseScriptStudioProps, data: IntroOutroScriptData) {
  return {
    ...useIntroOutroProjectActions(props, data),
    ...useIntroOutroWorkflowActions(props, data),
  };
}
