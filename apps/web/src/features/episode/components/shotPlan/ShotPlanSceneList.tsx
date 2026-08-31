import { CircleNotch, FloppyDisk, MagnifyingGlass } from "@phosphor-icons/react";
import type { Channel, Episode, Scene, Task } from "@studio/shared";
import type { BundleImage } from "../../../../api";
import { isTaskActive, latestTask } from "../../../../lib/utils";
import { EmptyState } from "../../../../components/EmptyState";
import { SceneCard } from "../../../../components/SceneCard";
import { SequenceDivider } from "../SequenceDivider";
import type { PreviewImageData } from "../../types";

type ShotPlanSceneListProps = {
  channel: Channel;
  episode: Episode;
  episodeId: string;
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  filteredScenes: Scene[];
  bundleImages: BundleImage[];
  episodeTasks: Task[];
  episodeClock: number;
  maxDuration: number;
  narrationWordsPerSecond: number;
  copied: string | null;
  busy: string | null;
  globalPromptExpanded: boolean | null;
  onCopy: (key: string, value: string) => Promise<void>;
  onCreateTask: (taskType: Task["task_type"], sceneNumber?: number) => Promise<void>;
  onMergeNext: (sceneNumber: number) => Promise<void>;
  onSaveScenes: () => Promise<void>;
  onOpenPromptModal: (scene: Scene) => void;
  onPreviewImage: (data: PreviewImageData) => void;
  onResetFilters: () => void;
};

export function ShotPlanSceneList({
  channel,
  episode,
  episodeId,
  scenes,
  setScenes,
  filteredScenes,
  bundleImages,
  episodeTasks,
  episodeClock,
  maxDuration,
  narrationWordsPerSecond,
  copied,
  busy,
  globalPromptExpanded,
  onCopy,
  onCreateTask,
  onMergeNext,
  onSaveScenes,
  onOpenPromptModal,
  onPreviewImage,
  onResetFilters,
}: ShotPlanSceneListProps) {
  if (filteredScenes.length === 0) {
    return (
      <EmptyState
        compact
        icon={<MagnifyingGlass size={22} />}
        title="No shots match this filter"
        copy="Try selecting another sequence, clearing your search query, or resetting filters."
        action="Reset all filters"
        onAction={onResetFilters}
      />
    );
  }

  return (
    <div className="scene-list">
      {filteredScenes.map((scene, index) => (
        <div key={scene.scene_id}>
          {index === 0 || filteredScenes[index - 1].sequence_id !== scene.sequence_id ? (
            <SequenceDivider
              scene={scene}
              images={bundleImages}
              channelId={channel.channel_id}
              episodeId={episodeId}
              onPreviewImage={onPreviewImage}
            />
          ) : null}
          <SceneCard
            scene={scene}
            nextScene={scenes.find((s) => s.scene_number === scene.scene_number + 1) ?? null}
            task={latestTask(episodeTasks, ["REGENERATE_DIALOGUE", "REGENERATE_PROMPT", "REGENERATE_BOTH"], scene.scene_number)}
            audioTask={latestTask(episodeTasks, ["GENERATE_AUDIO"], scene.scene_number)}
            channelId={channel.channel_id}
            episodeId={episodeId}
            now={episodeClock}
            maxDuration={maxDuration}
            narrationWordsPerSecond={episode.measured_narration_words_per_second ?? narrationWordsPerSecond}
            copied={copied}
            busy={busy}
            globalPromptExpanded={globalPromptExpanded}
            onCopy={onCopy}
            onChange={(next) => setScenes((current) => current.map((item) => (item.scene_id === scene.scene_id ? next : item)))}
            onRegenerate={(type) => void onCreateTask(type, scene.scene_number)}
            onGenerateAudio={() => void onCreateTask("GENERATE_AUDIO", scene.scene_number)}
            onMergeNext={() => void onMergeNext(scene.scene_number)}
            onOpenPromptModal={onOpenPromptModal}
          />
        </div>
      ))}
      <div className="scene-save-row">
        <span>Manual edits update the assessment score after saving</span>
        <button
          className="primary-button compact"
          disabled={busy === "scenes" || episodeTasks.some(isTaskActive)}
          onClick={() => void onSaveScenes()}
        >
          {busy === "scenes" ? <CircleNotch className="spin" size={15} /> : <FloppyDisk size={15} />}
          <span>{busy === "scenes" ? "Saving…" : "Save shots"}</span>
        </button>
      </div>
    </div>
  );
}
