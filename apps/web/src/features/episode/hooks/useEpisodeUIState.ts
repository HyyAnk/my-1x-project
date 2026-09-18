import { useState } from "react";
import type { Scene } from "@studio/shared";
import type { PreviewImageData } from "../types";
import { useRouteTab } from "../../../hooks/router/useRouteTab";

type UseEpisodeUIStateProps = {
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  simplifyMode?: boolean;
};

const WORKFLOW_TABS = ["script", "visual", "timeline", "remix"] as const;
type WorkflowTab = (typeof WORKFLOW_TABS)[number];

export function useEpisodeUIState({ activeTab, onTabChange, simplifyMode = true }: UseEpisodeUIStateProps) {
  const routeTab = simplifyMode && activeTab !== "remix" ? null : activeTab;
  const [workflowTab, switchWorkflowTab] = useRouteTab<WorkflowTab>({
    value: routeTab,
    allowedTabs: WORKFLOW_TABS,
    fallback: simplifyMode ? "remix" : "timeline",
    onChange: onTabChange,
  });
  const [previewImage, setPreviewImage] = useState<PreviewImageData | null>(null);
  const [promptModalScene, setPromptModalScene] = useState<Scene | null>(null);
  const [globalPromptExpanded, setGlobalPromptExpanded] = useState<boolean | null>(false);

  return {
    workflowTab,
    switchWorkflowTab,
    previewImage,
    setPreviewImage,
    promptModalScene,
    setPromptModalScene,
    globalPromptExpanded,
    setGlobalPromptExpanded,
  };
}
