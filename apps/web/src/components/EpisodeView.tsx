import { useCallback } from "react";
import { ArrowsClockwise, CheckCircle, FileText, FilmSlate, Image } from "@phosphor-icons/react";
import type { Channel, Task } from "@studio/shared";
import { isTaskActive } from "../lib/utils";
import { parseContinuityBundles } from "../lib/continuity";
import { useEpisode } from "../hooks/useEpisode";
import { LoadingState } from "./EmptyState";
import { TaskProgressPanel } from "./TaskProgressPanel";
import { QuizV2Panel } from "./QuizV2Panel";
import { PromptFocusModal } from "./PromptFocusModal";
import { QuestionRemixPanel } from "./QuestionRemixPanel";
import type { Notice } from "./types";
import { artifactConfig, isReady, type ArtifactName, type PreviewImageData } from "../features/episode/types";
import { PipelineRail } from "../features/episode/components/PipelineRail";
import { ImagePreviewModal } from "../features/episode/components/ImagePreviewModal";
import { BundleImagesPanel } from "../features/episode/components/BundleImagesPanel";
import { AssessmentPanel } from "../features/episode/components/AssessmentPanel";
import { ArtifactPanel } from "../features/episode/components/ArtifactPanel";
import { EpisodeHeader } from "../features/episode/EpisodeHeader";
import { EpisodeQuizCustomizationBar } from "../features/episode/components/EpisodeQuizCustomizationBar";
import { QuizVideoPanel } from "../features/episode/QuizVideoPanel";
import { NarrationTrackPanel } from "../features/episode/NarrationTrackPanel";
import { ShotPlanSection } from "../features/episode/ShotPlanSection";
import { useEpisodePipeline } from "../features/episode/hooks/useEpisodePipeline";
import { buildHash, getNavProps } from "../hooks/useRouter";

export type { PreviewImageData };

export function EpisodeDetail({
  channel,
  episodeId,
  tasks,
  activeTab,
  onTabChange,
  onNavigateHome,
  onNavigateChannels,
  onNavigateChannel,
  onTaskSubmitted,
  maxDuration,
  narrationWordsPerSecond,
  imageGenerationEnabled,
  imagesPerBundle,
  onBack,
  onNotice,
  simplifyMode = true,
}: {
  channel: Channel;
  episodeId: string;
  tasks: Task[];
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  onNavigateHome?: () => void;
  onNavigateChannels?: () => void;
  onNavigateChannel?: () => void;
  onTaskSubmitted: (task: Task) => void;
  maxDuration: number;
  narrationWordsPerSecond: number;
  imageGenerationEnabled: boolean;
  imagesPerBundle: number;
  onBack: () => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  simplifyMode?: boolean;
}) {
  const handleEpisodeError = useCallback((error: Error) => onNotice({ tone: "bad", message: error.message }), [onNotice]);
  const state = useEpisode(channel.channel_id, episodeId, handleEpisodeError);
  const { episode, visualBible, scenes, setScenes, assessment, bundleImages, quizV2 } = state;

  const pipeline = useEpisodePipeline({
    channel,
    episodeId,
    tasks,
    activeTab,
    onTabChange,
    onTaskSubmitted,
    onNotice,
    simplifyMode,
    state,
  });

  const isQuiz = channel.engine === "quiz" || channel.group_id === "quiz";

  if (!episode)
    return (
      <section className="page-wrap">
        <LoadingState />
      </section>
    );

  return (
    <section className="page-wrap detail-page">
      <EpisodeHeader
        channel={channel}
        episode={episode}
        episodeTasks={pipeline.episodeTasks}
        totalImageCostVnd={pipeline.totalImageCostVnd}
        isQuiz={isQuiz}
        questionCountDraft={pipeline.questionCountDraft}
        setQuestionCountDraft={pipeline.setQuestionCountDraft}
        durationDraft={pipeline.durationDraft}
        setDurationDraft={pipeline.setDurationDraft}
        activeEpisodeTask={pipeline.activeEpisodeTask}
        pipelineTask={pipeline.pipelineTask}
        busy={pipeline.busy}
        cancelling={pipeline.cancelling}
        readiness={pipeline.readiness}
        onNavigateHome={onNavigateHome}
        onNavigateChannels={onNavigateChannels}
        onNavigateChannel={onNavigateChannel}
        onBack={onBack}
        onSaveQuestionCount={pipeline.saveQuestionCount}
        onSaveVisualStyle={pipeline.saveVisualStyle}
        onSaveDuration={pipeline.saveDuration}
        onCreateTask={pipeline.createTask}
        onCancelActiveTask={pipeline.handleCancelActiveTask}
      />

      {pipeline.pipelineTask && (isTaskActive(pipeline.pipelineTask) || pipeline.pipelineTask.status === "FAILED") ? (
        <TaskProgressPanel
          task={pipeline.pipelineTask}
          title="Production pipeline"
          activeLabel="Running the next step"
          completionLabel="Production pipeline complete"
          now={pipeline.episodeClock}
          progressLabel="Production pipeline progress"
        />
      ) : null}

      {/* Customization Toolbar & Production Rail */}
      {isQuiz ? (
        <>
          <EpisodeQuizCustomizationBar
            channel={channel}
            episode={episode}
            activeEpisodeTask={pipeline.activeEpisodeTask}
            busy={pipeline.busy}
            questionCountDraft={pipeline.questionCountDraft}
            setQuestionCountDraft={pipeline.setQuestionCountDraft}
            onSaveQuestionCount={pipeline.saveQuestionCount}
            onSaveVisualStyle={pipeline.saveVisualStyle}
            onSaveThinkingBarStyle={pipeline.saveThinkingBarStyle}
            onSaveQuestionBoxStyle={pipeline.saveQuestionBoxStyle}
            onSaveAnswerCardStyle={pipeline.saveAnswerCardStyle}
            onSaveCounterStyle={pipeline.saveCounterStyle}
            onSavePaletteId={pipeline.savePaletteId}
            onApplyStylePreset={pipeline.applyStylePreset}
          />
          <QuizV2Panel
            state={quizV2}
            readiness={pipeline.readiness}
            pipelineTask={pipeline.pipelineTask}
            tasks={pipeline.episodeTasks}
            questionCount={episode.quiz_config?.question_count ?? 0}
          />
        </>
      ) : (
        <PipelineRail readiness={pipeline.readiness} quiz={false} pipelineTask={pipeline.pipelineTask} tasks={pipeline.episodeTasks} />
      )}

      {assessment && !isQuiz ? <AssessmentPanel assessment={assessment} /> : null}

      <QuizVideoPanel
        channel={channel}
        episode={episode}
        episodeId={episodeId}
        isQuiz={isQuiz}
        readiness={pipeline.readiness}
        activeEpisodeTask={pipeline.activeEpisodeTask}
        episodeTasks={pipeline.episodeTasks}
        episodeClock={pipeline.episodeClock}
        busy={pipeline.busy}
        onCreateTask={pipeline.createTask}
        onOpenVideoFolder={pipeline.openVideoFolder}
      />

      {/* Workspace Tabs: In Simplify Mode, Question Remix is ALWAYS shown. In Full Mode, all 4 tabs are shown */}
      <div className="channel-group-tabs" role="tablist" aria-label="Episode creation workspace" style={{ margin: "24px 0 26px" }}>
        {!simplifyMode ? (
          <a
            role="tab"
            aria-selected={pipeline.workflowTab === "script"}
            className={`channel-group-tab ${pipeline.workflowTab === "script" ? "is-selected" : ""}`}
            {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, episodeId, tab: "script" }), () =>
              pipeline.switchWorkflowTab("script"),
            )}
          >
            <FileText size={17} weight={pipeline.workflowTab === "script" ? "fill" : "regular"} />
            <span>1. Script & Plan</span>
            {pipeline.readiness.script ? <CheckCircle size={14} weight="fill" style={{ color: "var(--green)" }} /> : null}
          </a>
        ) : null}
        <a
          role="tab"
          aria-selected={pipeline.workflowTab === "remix"}
          className={`channel-group-tab ${pipeline.workflowTab === "remix" ? "is-selected" : ""}`}
          {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, episodeId, tab: "remix" }), () =>
            pipeline.switchWorkflowTab("remix"),
          )}
        >
          <ArrowsClockwise size={17} weight={pipeline.workflowTab === "remix" ? "bold" : "regular"} />
          <span>Question Remix</span>
          {pipeline.historyCheck?.duplicate_count ? (
            <span className={`tab-badge ${pipeline.historyCheck.passed ? "badge-success" : "badge-warning"}`}>
              {pipeline.historyCheck.duplicate_count}
            </span>
          ) : null}
        </a>
        {!simplifyMode ? (
          <>
            <a
              role="tab"
              aria-selected={pipeline.workflowTab === "visual"}
              className={`channel-group-tab ${pipeline.workflowTab === "visual" ? "is-selected" : ""}`}
              {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, episodeId, tab: "visual" }), () =>
                pipeline.switchWorkflowTab("visual"),
              )}
            >
              <Image size={17} weight={pipeline.workflowTab === "visual" ? "fill" : "regular"} />
              <span>2. Visual & Continuity</span>
              {bundleImages.length > 0 ? <small>{bundleImages.length}</small> : null}
            </a>
            <a
              role="tab"
              aria-selected={pipeline.workflowTab === "timeline"}
              className={`channel-group-tab ${pipeline.workflowTab === "timeline" ? "is-selected" : ""}`}
              {...getNavProps(buildHash({ page: "channels", channelId: channel.channel_id, episodeId, tab: "timeline" }), () =>
                pipeline.switchWorkflowTab("timeline"),
              )}
            >
              <FilmSlate size={17} weight={pipeline.workflowTab === "timeline" ? "fill" : "regular"} />
              <span>3. Timeline & Shots</span>
              {scenes.length > 0 ? <small>{scenes.length}</small> : null}
            </a>
          </>
        ) : null}
      </div>

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
      ) : null}

      {/* Narration Track */}
      {pipeline.workflowTab === "timeline" && !simplifyMode && !isQuiz ? (
        <NarrationTrackPanel
          channel={channel}
          episode={episode}
          episodeId={episodeId}
          readiness={pipeline.readiness}
          activeEpisodeTask={pipeline.activeEpisodeTask}
          episodeTasks={pipeline.episodeTasks}
          episodeClock={pipeline.episodeClock}
          narrationWordsPerSecond={narrationWordsPerSecond}
          onCreateTask={pipeline.createTask}
        />
      ) : null}

      {pipeline.previewImage ? <ImagePreviewModal image={pipeline.previewImage} onClose={() => pipeline.setPreviewImage(null)} /> : null}

      {pipeline.promptModalScene ? (
        <PromptFocusModal
          scene={pipeline.promptModalScene}
          channelId={channel.channel_id}
          episodeId={episodeId}
          onSave={(updatedPrompt) => {
            setScenes((current) =>
              current.map((item) =>
                item.scene_id === pipeline.promptModalScene?.scene_id ? { ...item, visual_prompt: updatedPrompt } : item,
              ),
            );
          }}
          onClose={() => pipeline.setPromptModalScene(null)}
        />
      ) : null}
    </section>
  );
}
