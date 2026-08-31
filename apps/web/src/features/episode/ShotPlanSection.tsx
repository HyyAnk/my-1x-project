import { FilmSlate } from "@phosphor-icons/react";
import type { Channel, Episode, Scene, Task } from "@studio/shared";
import { isTaskActive, latestTask } from "../../lib/utils";
import type { BundleImage } from "../../api";
import { EmptyState } from "../../components/EmptyState";
import type { PreviewImageData } from "./types";
import { ShotPlanHeader } from "./components/shotPlan/ShotPlanHeader";
import { ShotPlanBatchProgress } from "./components/shotPlan/ShotPlanBatchProgress";
import { ShotPlanToolbar } from "./components/shotPlan/ShotPlanToolbar";
import { ShotPlanSceneList } from "./components/shotPlan/ShotPlanSceneList";

type ShotPlanSectionProps = {
  channel: Channel;
  episode: Episode;
  episodeId: string;
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  filteredScenes: Scene[];
  sequences: Array<{ id: string; title: string; count: number }>;
  filterCounts: { missingAudio: number; audioMismatch: number; hasOverlay: number; multiCut: number };
  filteredTotalSeconds: number;
  selectedSequenceId: string;
  setSelectedSequenceId: (id: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  globalPromptExpanded: boolean | null;
  setGlobalPromptExpanded: React.Dispatch<React.SetStateAction<boolean | null>>;
  bundleImages: BundleImage[];
  episodeTasks: Task[];
  currentShotBatch: Task[];
  completedShotSequences: number;
  activeEpisodeTask: Task | null;
  episodeClock: number;
  readiness: { visualBible: boolean };
  maxDuration: number;
  narrationWordsPerSecond: number;
  copied: string | null;
  busy: string | null;
  onCopy: (key: string, value: string) => Promise<void>;
  onCopyAllVisualPrompts: () => Promise<void>;
  onCreateTask: (taskType: Task["task_type"], sceneNumber?: number) => Promise<void>;
  onMergeNext: (sceneNumber: number) => Promise<void>;
  onSaveScenes: () => Promise<void>;
  onOpenPromptModal: (scene: Scene) => void;
  onPreviewImage: (data: PreviewImageData) => void;
};

export function ShotPlanSection({
  channel,
  episode,
  episodeId,
  scenes,
  setScenes,
  filteredScenes,
  sequences,
  filterCounts,
  filteredTotalSeconds,
  selectedSequenceId,
  setSelectedSequenceId,
  selectedStatusFilter,
  setSelectedStatusFilter,
  searchQuery,
  setSearchQuery,
  globalPromptExpanded,
  setGlobalPromptExpanded,
  bundleImages,
  episodeTasks,
  currentShotBatch,
  completedShotSequences,
  activeEpisodeTask,
  episodeClock,
  readiness,
  maxDuration,
  narrationWordsPerSecond,
  copied,
  busy,
  onCopy,
  onCopyAllVisualPrompts,
  onCreateTask,
  onMergeNext,
  onSaveScenes,
  onOpenPromptModal,
  onPreviewImage,
}: ShotPlanSectionProps) {
  const resetFilters = () => {
    setSelectedSequenceId("all");
    setSelectedStatusFilter("all");
    setSearchQuery("");
  };

  return (
    <section className="shot-plan-section">
      <ShotPlanHeader
        scenesCount={scenes.length}
        globalPromptExpanded={globalPromptExpanded}
        setGlobalPromptExpanded={setGlobalPromptExpanded}
        onCopyAllVisualPrompts={onCopyAllVisualPrompts}
        readiness={readiness}
        activeEpisodeTask={activeEpisodeTask}
        episodeTasks={episodeTasks}
        onCreateTask={onCreateTask}
      />

      <ShotPlanBatchProgress
        currentShotBatch={currentShotBatch}
        completedShotSequences={completedShotSequences}
        episodeTasks={episodeTasks}
        episodeClock={episodeClock}
      />

      {scenes.length === 0 ? (
        <EmptyState
          compact
          icon={<FilmSlate size={23} />}
          title="No shots generated yet"
          copy="Lock the visual bible first, then generate parallel sequence shots."
          action="Generate shots"
          disabled={!readiness.visualBible || Boolean(activeEpisodeTask)}
          busy={Boolean(latestTask(episodeTasks, ["GENERATE_SCENES"]) && isTaskActive(latestTask(episodeTasks, ["GENERATE_SCENES"])!))}
          busyLabel="Generating…"
          onAction={() => void onCreateTask("GENERATE_SCENES")}
        />
      ) : (
        <div>
          <ShotPlanToolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredScenesCount={filteredScenes.length}
            totalScenesCount={scenes.length}
            filteredTotalSeconds={filteredTotalSeconds}
            sequences={sequences}
            selectedSequenceId={selectedSequenceId}
            setSelectedSequenceId={setSelectedSequenceId}
            selectedStatusFilter={selectedStatusFilter}
            setSelectedStatusFilter={setSelectedStatusFilter}
            filterCounts={filterCounts}
          />

          <ShotPlanSceneList
            channel={channel}
            episode={episode}
            episodeId={episodeId}
            scenes={scenes}
            setScenes={setScenes}
            filteredScenes={filteredScenes}
            bundleImages={bundleImages}
            episodeTasks={episodeTasks}
            episodeClock={episodeClock}
            maxDuration={maxDuration}
            narrationWordsPerSecond={narrationWordsPerSecond}
            copied={copied}
            busy={busy}
            globalPromptExpanded={globalPromptExpanded}
            onCopy={onCopy}
            onCreateTask={onCreateTask}
            onMergeNext={onMergeNext}
            onSaveScenes={onSaveScenes}
            onOpenPromptModal={onOpenPromptModal}
            onPreviewImage={onPreviewImage}
            onResetFilters={resetFilters}
          />
        </div>
      )}
    </section>
  );
}
