import type React from "react";
import type { Channel, Episode, Scene } from "@studio/shared";
import type { BundleImage } from "../../../api";
import { parseContinuityBundles } from "../../../lib/continuity";
import { artifactConfig, isReady } from "../types";
import type { useEpisodePipeline } from "../hooks/useEpisodePipeline";
import { QuestionRemixPanel } from "../../../components/QuestionRemixPanel";
import { ArtifactPanel } from "./ArtifactPanel";
import { BundleImagesPanel } from "./BundleImagesPanel";
import { ShotPlanSection } from "../ShotPlanSection";
import { EpisodeWorkspaceTabBar } from "./EpisodeWorkspaceTabBar";

export type EpisodeWorkspaceTabsProps = {
  channel: Channel;
  episode: Episode;
  episodeId: string;
  simplifyMode: boolean;
  pipeline: ReturnType<typeof useEpisodePipeline>;
  visualBible: string;
  bundleImages: BundleImage[];
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  maxDuration: number;
  narrationWordsPerSecond: number;
  imageGenerationEnabled: boolean;
  imagesPerBundle: number;
  stage3Footer?: React.ReactNode;
};

export function EpisodeWorkspaceTabs({
  channel,
  episode,
  episodeId,
  simplifyMode,
  pipeline,
  visualBible,
  bundleImages,
  scenes,
  setScenes,
  maxDuration,
  narrationWordsPerSecond,
  imageGenerationEnabled,
  imagesPerBundle,
  stage3Footer,
}: EpisodeWorkspaceTabsProps) {
  return (
    <>
      <EpisodeWorkspaceTabBar
        channel={channel}
        episodeId={episodeId}
        simplifyMode={simplifyMode}
        pipeline={pipeline}
        bundleImages={bundleImages}
        sceneCount={scenes.length}
      />

      {/* Stage 1: Script & Plan */}
      {pipeline.workflowTab === "script" && !simplifyMode ? (
        <div className="artifact-stack">
          {artifactConfig
            .filter((c) => c.filename !== "visual_bible.md")
            .map((config, index) => {
              const artifact = pipeline.artifactValues[config.filename];
              const task = pipeline.episodeTasks.find((t) => t.task_type === config.taskType);
              return (
                <ArtifactPanel
                  key={config.filename}
                  {...config}
                  content={artifact.value}
                  setContent={artifact.set}
                  task={task ?? null}
                  now={pipeline.episodeClock}
                  disabled={
                    !pipeline.prerequisites[config.filename] ||
                    Boolean(pipeline.activeEpisodeTask && pipeline.activeEpisodeTask.task_id !== task?.task_id)
                  }
                  saving={pipeline.busy === config.filename}
                  defaultOpen={config.filename === "script.md" || (!isReady(artifact.value) && index === 0)}
                  onGenerate={() => void pipeline.createTask(config.taskType)}
                  onSave={(content) => void pipeline.saveArtifact(config.filename, content)}
                />
              );
            })}
        </div>
      ) : null}

      {/* Stage: Question Remix & History Check */}
      {pipeline.workflowTab === "remix" ? (
        <QuestionRemixPanel
          historyCheck={pipeline.historyCheck}
          isRemixing={pipeline.isRemixing}
          remixingQuestionId={pipeline.remixingQuestionId}
          remixAction={pipeline.remixAction}
          onRemixAll={(mode) => void pipeline.handleRemix(undefined, mode)}
          onRemixSingle={(qId, mode) => void pipeline.handleRemix([qId], mode)}
          onContinueBuild={() => pipeline.switchWorkflowTab("timeline")}
        />
      ) : null}

      {/* Stage 2: Visual & Continuity */}
      {pipeline.workflowTab === "visual" && !simplifyMode ? (
        <div>
          {(() => {
            const config = artifactConfig.find((c) => c.filename === "visual_bible.md")!;
            const artifact = pipeline.artifactValues["visual_bible.md"];
            const task = pipeline.episodeTasks.find((t) => t.task_type === config.taskType);
            return (
              <ArtifactPanel
                key="visual_bible.md"
                {...config}
                content={artifact.value}
                setContent={artifact.set}
                task={task ?? null}
                now={pipeline.episodeClock}
                disabled={
                  !pipeline.prerequisites["visual_bible.md"] ||
                  Boolean(pipeline.activeEpisodeTask && pipeline.activeEpisodeTask.task_id !== task?.task_id)
                }
                saving={pipeline.busy === "visual_bible.md"}
                defaultOpen={true}
                onGenerate={() => void pipeline.createTask(config.taskType)}
                onSave={(content) => void pipeline.saveArtifact("visual_bible.md", content)}
              />
            );
          })()}

          {imageGenerationEnabled ? (
            <BundleImagesPanel
              bundles={parseContinuityBundles(visualBible)}
              images={bundleImages}
              tasks={pipeline.episodeTasks}
              now={pipeline.episodeClock}
              channelId={channel.channel_id}
              episodeId={episodeId}
              imagesPerBundle={imagesPerBundle}
              resolvedStyle={episode.quiz_config?.resolved_visual_style}
              busy={pipeline.busy}
              disabled={false}
              onGenerate={(bundleNumber) => void pipeline.generateBundleImage(bundleNumber)}
              onGenerateAll={() => void pipeline.generateAllBundleImages()}
              onPreviewImage={(img) => pipeline.setPreviewImage(img)}
            />
          ) : null}
        </div>
      ) : null}

      {/* Stage 3: Timeline & Shot Plan */}
      {pipeline.workflowTab === "timeline" && !simplifyMode ? (
        <>
          <ShotPlanSection
            channel={channel}
            episode={episode}
            episodeId={episodeId}
            scenes={scenes}
            setScenes={setScenes}
            filteredScenes={pipeline.filteredScenes}
            sequences={pipeline.sequences}
            filterCounts={pipeline.filterCounts}
            filteredTotalSeconds={pipeline.filteredTotalSeconds}
            selectedSequenceId={pipeline.selectedSequenceId}
            setSelectedSequenceId={pipeline.setSelectedSequenceId}
            selectedStatusFilter={pipeline.selectedStatusFilter}
            setSelectedStatusFilter={pipeline.setSelectedStatusFilter}
            searchQuery={pipeline.searchQuery}
            setSearchQuery={pipeline.setSearchQuery}
            globalPromptExpanded={pipeline.globalPromptExpanded}
            setGlobalPromptExpanded={pipeline.setGlobalPromptExpanded}
            bundleImages={bundleImages}
            episodeTasks={pipeline.episodeTasks}
            currentShotBatch={pipeline.currentShotBatch}
            completedShotSequences={pipeline.completedShotSequences}
            activeEpisodeTask={pipeline.activeEpisodeTask}
            episodeClock={pipeline.episodeClock}
            readiness={pipeline.readiness}
            maxDuration={maxDuration}
            narrationWordsPerSecond={narrationWordsPerSecond}
            copied={pipeline.copied}
            busy={pipeline.busy}
            onCopy={pipeline.copy}
            onCopyAllVisualPrompts={pipeline.copyAllVisualPrompts}
            onCreateTask={pipeline.createTask}
            onMergeNext={pipeline.mergeNext}
            onSaveScenes={pipeline.saveScenes}
            onOpenPromptModal={(targetScene) => pipeline.setPromptModalScene(targetScene)}
            onPreviewImage={(img) => pipeline.setPreviewImage(img)}
          />
          {stage3Footer}
        </>
      ) : null}
    </>
  );
}
