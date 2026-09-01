import { useMemo } from "react";
import type { Channel, Task } from "@studio/shared";
import type { useEpisode } from "../../../hooks/useEpisode";
import type { Notice } from "../../../components/types";
import { isReady, type ArtifactName } from "../types";
import { useEpisodeSceneFiltering } from "./useEpisodeSceneFiltering";
import { useEpisodeStyles } from "./useEpisodeStyles";
import { useEpisodeRemix } from "./useEpisodeRemix";
import { useEpisodeTaskTracking } from "./useEpisodeTaskTracking";
import { useEpisodeUIState } from "./useEpisodeUIState";
import { useEpisodeActions } from "./useEpisodeActions";

type EpisodeState = ReturnType<typeof useEpisode>;

type UseEpisodePipelineProps = {
  channel: Channel;
  episodeId: string;
  tasks: Task[];
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  onTaskSubmitted: (task: Task) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  simplifyMode?: boolean;
  state: EpisodeState;
};

export function useEpisodePipeline({
  channel,
  episodeId,
  tasks,
  activeTab,
  onTabChange,
  onTaskSubmitted,
  onNotice,
  simplifyMode = true,
  state,
}: UseEpisodePipelineProps) {
  const {
    episode,
    setEpisode,
    research,
    setResearch,
    treatment,
    setTreatment,
    script,
    setScript,
    visualBible,
    setVisualBible,
    scenes,
    setScenes,
    bundleImages,
    quizV2,
    load,
  } = state;

  // Sub-hooks
  const uiState = useEpisodeUIState({ activeTab, onTabChange, simplifyMode });
  const taskTracking = useEpisodeTaskTracking({ episodeId, tasks, load, onNotice });
  const actions = useEpisodeActions({
    channel,
    episodeId,
    scenes,
    setScenes,
    activeEpisodeTask: taskTracking.activeEpisodeTask,
    onTaskSubmitted,
    onNotice,
    load,
  });
  const sceneFiltering = useEpisodeSceneFiltering(scenes);
  const styles = useEpisodeStyles({ channel, episodeId, episode, setEpisode, load, onNotice, setBusy: actions.setBusy });
  const remix = useEpisodeRemix({ channel, episodeId, quizV2, scenes, load, onNotice });

  const readiness = useMemo(
    () => ({
      research: isReady(research),
      treatment: isReady(treatment),
      script: isReady(script),
      visualBible: isReady(visualBible),
      scenes: scenes.length > 0,
      narration: Boolean(episode?.narration_asset_path),
      video: Boolean(episode?.video_asset_path),
    }),
    [research, treatment, script, visualBible, scenes.length, episode?.narration_asset_path, episode?.video_asset_path],
  );

  const totalImageCostVnd = useMemo(() => bundleImages.reduce((sum, img) => sum + (img.price_vnd ?? 50), 0), [bundleImages]);

  const artifactValues: Record<ArtifactName, { value: string; set: (value: string) => void }> = {
    "research.md": { value: research, set: setResearch },
    "treatment.md": { value: treatment, set: setTreatment },
    "script.md": { value: script, set: setScript },
    "visual_bible.md": { value: visualBible, set: setVisualBible },
  };

  const prerequisites: Record<ArtifactName, boolean> = {
    "research.md": true,
    "treatment.md": readiness.research,
    "script.md": readiness.treatment,
    "visual_bible.md": readiness.script,
  };

  return {
    ...actions,
    ...uiState,
    ...taskTracking,
    readiness,
    totalImageCostVnd,
    artifactValues,
    prerequisites,
    // From useEpisodeSceneFiltering
    selectedSequenceId: sceneFiltering.selectedSequenceId,
    setSelectedSequenceId: sceneFiltering.setSelectedSequenceId,
    selectedStatusFilter: sceneFiltering.selectedStatusFilter,
    setSelectedStatusFilter: sceneFiltering.setSelectedStatusFilter,
    searchQuery: sceneFiltering.searchQuery,
    setSearchQuery: sceneFiltering.setSearchQuery,
    sequences: sceneFiltering.sequences,
    filterCounts: sceneFiltering.filterCounts,
    filteredScenes: sceneFiltering.filteredScenes,
    filteredTotalSeconds: sceneFiltering.filteredTotalSeconds,
    // From useEpisodeStyles
    questionCountDraft: styles.questionCountDraft,
    setQuestionCountDraft: styles.setQuestionCountDraft,
    durationDraft: styles.durationDraft,
    setDurationDraft: styles.setDurationDraft,
    saveQuestionCount: styles.saveQuestionCount,
    saveVisualStyle: styles.saveVisualStyle,
    saveThinkingBarStyle: styles.saveThinkingBarStyle,
    saveQuestionBoxStyle: styles.saveQuestionBoxStyle,
    saveAnswerCardStyle: styles.saveAnswerCardStyle,
    saveCounterStyle: styles.saveCounterStyle,
    saveBackgroundStyle: styles.saveBackgroundStyle,
    savePaletteId: styles.savePaletteId,
    saveThumbnailRatio: styles.saveThumbnailRatio,
    applyStylePreset: styles.applyStylePreset,
    saveDuration: styles.saveDuration,

    // From useEpisodeRemix
    historyCheck: remix.historyCheck,
    isRemixing: remix.isRemixing,
    remixingQuestionId: remix.remixingQuestionId,
    remixAction: remix.remixAction,
    handleRemix: remix.handleRemix,
  };
}
