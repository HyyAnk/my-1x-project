import { ArrowsInSimple, ArrowsOutSimple, CircleNotch, Copy, FilmSlate, FloppyDisk, MagnifyingGlass, X } from "@phosphor-icons/react";
import type { Channel, Episode, Scene, Task } from "@studio/shared";
import { isTaskActive, latestTask } from "../../lib/utils";
import type { BundleImage } from "../../api";
import { EmptyState } from "../../components/EmptyState";
import { TaskProgressPanel } from "../../components/TaskProgressPanel";
import { SceneCard } from "../../components/SceneCard";
import type { PreviewImageData } from "./types";
import { formatDuration } from "./types";
import { SequenceDivider } from "./components/SequenceDivider";

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
  return (
    <section className="shot-plan-section">
      <div className="section-heading scene-heading" style={{ marginTop: "12px" }}>
        <div>
          <h2>Timeline & Shots ({scenes.length})</h2>
        </div>
        <div className="scene-heading-actions">
          {scenes.length > 0 ? (
            <>
              <button
                type="button"
                className="quiet-button"
                onClick={() => setGlobalPromptExpanded(globalPromptExpanded ? false : true)}
                title={globalPromptExpanded ? "Collapse all prompt boxes" : "Expand all prompt boxes"}
              >
                {globalPromptExpanded ? <ArrowsInSimple size={16} /> : <ArrowsOutSimple size={16} />}
                <span>{globalPromptExpanded ? "Collapse all prompts" : "Expand all prompts"}</span>
              </button>
              <button
                type="button"
                className="quiet-button"
                onClick={() => void onCopyAllVisualPrompts()}
                title="Copy all prompts in text format"
              >
                <Copy size={16} />
                <span>Copy all prompts</span>
              </button>
            </>
          ) : null}
          <button
            className="primary-button"
            disabled={!readiness.visualBible || Boolean(activeEpisodeTask)}
            onClick={() => void onCreateTask("GENERATE_SCENES")}
          >
            {latestTask(episodeTasks, ["GENERATE_SCENES"]) && isTaskActive(latestTask(episodeTasks, ["GENERATE_SCENES"])!) ? (
              <CircleNotch className="spin" size={17} />
            ) : (
              <FilmSlate size={17} />
            )}
            <span>{scenes.length ? "Regenerate shots" : "Generate shots"}</span>
          </button>
        </div>
      </div>

      {currentShotBatch.length > 0 ? (
        <div
          className="batch-shot-progress"
          role="progressbar"
          aria-label="Shot sequence progress"
          aria-valuemin={0}
          aria-valuemax={currentShotBatch.length}
          aria-valuenow={completedShotSequences}
        >
          <div>
            <strong>
              {completedShotSequences} / {currentShotBatch.length} sequences
            </strong>
            <span>
              {currentShotBatch.some((task) => task.status === "FAILED")
                ? "Retry failed sequences from Tasks"
                : currentShotBatch.some(isTaskActive)
                  ? "Generating in parallel"
                  : "Sequence batch complete"}
            </span>
          </div>
          <div>
            <span style={{ transform: `scaleX(${completedShotSequences / currentShotBatch.length})` }} />
          </div>
        </div>
      ) : latestTask(episodeTasks, ["GENERATE_SCENES"]) ? (
        <TaskProgressPanel
          task={latestTask(episodeTasks, ["GENERATE_SCENES"])!}
          title="Shot generation"
          activeLabel="Building sequence-aware shots"
          completionLabel="Shot plan ready"
          now={episodeClock}
        />
      ) : null}

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
          {/* Shot Plan Filtering & Quick Access Toolbar */}
          <div className="shot-plan-toolbar">
            <div className="toolbar-top-row">
              <div className="search-box">
                <MagnifyingGlass size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search dialogue, prompt, sequence, or shot #…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery ? (
                  <button type="button" className="search-clear-btn" onClick={() => setSearchQuery("")} title="Clear search query">
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              <div className="toolbar-summary-meta">
                <span>
                  Showing <strong>{filteredScenes.length}</strong> of <strong>{scenes.length}</strong> shots (
                  {formatDuration(filteredTotalSeconds)})
                </span>
                {selectedSequenceId !== "all" || selectedStatusFilter !== "all" || searchQuery ? (
                  <button
                    type="button"
                    className="link-button"
                    style={{ fontSize: "12px", marginLeft: "6px" }}
                    onClick={() => {
                      setSelectedSequenceId("all");
                      setSelectedStatusFilter("all");
                      setSearchQuery("");
                    }}
                  >
                    Reset filters
                  </button>
                ) : null}
              </div>
            </div>

            <div className="toolbar-filters-row">
              {sequences.length > 1 ? (
                <div className="filter-group">
                  <span className="filter-label">Sequence:</span>
                  <div className="filter-pills" role="group" aria-label="Filter by sequence">
                    <button
                      type="button"
                      className={`filter-pill ${selectedSequenceId === "all" ? "is-active" : ""}`}
                      onClick={() => setSelectedSequenceId("all")}
                    >
                      All ({scenes.length})
                    </button>
                    {sequences.map((seq) => (
                      <button
                        key={seq.id}
                        type="button"
                        className={`filter-pill ${selectedSequenceId === seq.id ? "is-active" : ""}`}
                        onClick={() => setSelectedSequenceId(seq.id)}
                        title={seq.title}
                      >
                        {seq.title} ({seq.count})
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="filter-group">
                <span className="filter-label">Filter:</span>
                <div className="filter-pills" role="group" aria-label="Filter by status">
                  <button
                    type="button"
                    className={`filter-pill ${selectedStatusFilter === "all" ? "is-active" : ""}`}
                    onClick={() => setSelectedStatusFilter("all")}
                  >
                    All
                  </button>
                  {filterCounts.missingAudio > 0 ? (
                    <button
                      type="button"
                      className={`filter-pill is-warning ${selectedStatusFilter === "missing_audio" ? "is-active" : ""}`}
                      onClick={() => setSelectedStatusFilter(selectedStatusFilter === "missing_audio" ? "all" : "missing_audio")}
                    >
                      🎙️ Missing Audio ({filterCounts.missingAudio})
                    </button>
                  ) : null}
                  {filterCounts.audioMismatch > 0 ? (
                    <button
                      type="button"
                      className={`filter-pill is-warning ${selectedStatusFilter === "audio_mismatch" ? "is-active" : ""}`}
                      onClick={() => setSelectedStatusFilter(selectedStatusFilter === "audio_mismatch" ? "all" : "audio_mismatch")}
                    >
                      ⚠️ Audio Mismatch ({filterCounts.audioMismatch})
                    </button>
                  ) : null}
                  {filterCounts.hasOverlay > 0 ? (
                    <button
                      type="button"
                      className={`filter-pill ${selectedStatusFilter === "has_overlay" ? "is-active" : ""}`}
                      onClick={() => setSelectedStatusFilter(selectedStatusFilter === "has_overlay" ? "all" : "has_overlay")}
                    >
                      🎨 Overlays ({filterCounts.hasOverlay})
                    </button>
                  ) : null}
                  {filterCounts.multiCut > 0 ? (
                    <button
                      type="button"
                      className={`filter-pill ${selectedStatusFilter === "multi_cut" ? "is-active" : ""}`}
                      onClick={() => setSelectedStatusFilter(selectedStatusFilter === "multi_cut" ? "all" : "multi_cut")}
                    >
                      ✂️ Multi-cut ({filterCounts.multiCut})
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {filteredScenes.length === 0 ? (
            <EmptyState
              compact
              icon={<MagnifyingGlass size={22} />}
              title="No shots match this filter"
              copy="Try selecting another sequence, clearing your search query, or resetting filters."
              action="Reset all filters"
              onAction={() => {
                setSelectedSequenceId("all");
                setSelectedStatusFilter("all");
                setSearchQuery("");
              }}
            />
          ) : (
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
          )}
        </div>
      )}
    </section>
  );
}
