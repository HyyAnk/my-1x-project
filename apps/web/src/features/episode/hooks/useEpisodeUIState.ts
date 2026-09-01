import { useEffect, useState } from "react";
import type { Scene } from "@studio/shared";
import type { PreviewImageData } from "../types";

type UseEpisodeUIStateProps = {
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  simplifyMode?: boolean;
};

export function useEpisodeUIState({ activeTab, onTabChange, simplifyMode = true }: UseEpisodeUIStateProps) {
  const initialWorkflowTab =
    activeTab === "script" || activeTab === "visual" || activeTab === "timeline" || activeTab === "remix"
      ? activeTab
      : simplifyMode
        ? "remix"
        : "timeline";

  const [workflowTab, setWorkflowTab] = useState<"script" | "visual" | "timeline" | "remix">(initialWorkflowTab);
  const [previewImage, setPreviewImage] = useState<PreviewImageData | null>(null);
  const [promptModalScene, setPromptModalScene] = useState<Scene | null>(null);
  const [globalPromptExpanded, setGlobalPromptExpanded] = useState<boolean | null>(false);

  useEffect(() => {
    if (simplifyMode && workflowTab !== "remix") {
      setWorkflowTab("remix");
    }
  }, [simplifyMode]);

  useEffect(() => {
    if (
      activeTab &&
      (activeTab === "script" || activeTab === "visual" || activeTab === "timeline" || activeTab === "remix") &&
      activeTab !== workflowTab
    ) {
      setWorkflowTab(activeTab);
    }
  }, [activeTab]);

  const switchWorkflowTab = (tab: "script" | "visual" | "timeline" | "remix") => {
    setWorkflowTab(tab);
    onTabChange?.(tab);
  };

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
