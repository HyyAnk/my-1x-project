import { CircleNotch, DownloadSimple, SpeakerHigh } from "@phosphor-icons/react";
import type { Channel, Episode, Task } from "@studio/shared";
import { api } from "../../api";
import { isTaskActive, latestTask } from "../../lib/utils";
import { TaskProgressPanel } from "../../components/TaskProgressPanel";
import { formatDuration } from "./types";

type NarrationTrackPanelProps = {
  channel: Channel;
  episode: Episode;
  episodeId: string;
  readiness: { script: boolean; narration: boolean };
  activeEpisodeTask: Task | null;
  episodeTasks: Task[];
  episodeClock: number;
  narrationWordsPerSecond: number;
  onCreateTask: (taskType: Task["task_type"]) => void;
};

export function NarrationTrackPanel({
  channel,
  episode,
  episodeId,
  readiness,
  activeEpisodeTask,
  episodeTasks,
  episodeClock,
  narrationWordsPerSecond,
  onCreateTask,
}: NarrationTrackPanelProps) {
  const narrationTask = latestTask(episodeTasks, ["GENERATE_NARRATION"]);
  const showProgress = narrationTask && (isTaskActive(narrationTask) || narrationTask.status === "FAILED" || (!episode.narration_asset_path && narrationTask.status !== "COMPLETED"));

  return (
    <section className="panel narration-production-panel" style={{ marginTop: "24px" }}>
      <div className="panel-heading">
        <div>
          <h2>Narration Audio</h2>
        </div>
        <button
          className="primary-button compact"
          disabled={!readiness.script || Boolean(activeEpisodeTask)}
          onClick={() => onCreateTask("GENERATE_NARRATION")}
        >
          {narrationTask && isTaskActive(narrationTask) ? (
            <CircleNotch className="spin" size={15} />
          ) : (
            <SpeakerHigh size={15} />
          )}
          <span>{readiness.narration ? "Regenerate" : "Generate Audio"}</span>
        </button>
      </div>
      {showProgress ? (
        <TaskProgressPanel
          task={narrationTask}
          title="Narration"
          activeLabel="Generating by sequence"
          completionLabel="Narration ready"
          now={episodeClock}
          compact
        />
      ) : null}
      {episode.narration_asset_path ? (
        <div className="master-audio-row">
          <audio
            controls
            preload="metadata"
            src={`${api.narrationAudioUrl(channel.channel_id, episodeId, episode.narration_asset_path.split("/").at(-1))}?v=${encodeURIComponent(episode.narration_generated_at ?? "")}`}
            aria-label="Production narration audio"
          />
          <span>
            {formatDuration(episode.narration_duration_seconds ?? 0)} · {episode.narration_segment_count} segments ·{" "}
            {(episode.measured_narration_words_per_second ?? narrationWordsPerSecond).toFixed(2)} words/sec
          </span>
          <a
            className="quiet-button compact"
            href={api.narrationAudioUrl(channel.channel_id, episodeId, episode.narration_asset_path.split("/").at(-1))}
            download={`${episode.slug}-narration.wav`}
          >
            <DownloadSimple size={15} />
            <span>Download WAV</span>
          </a>
        </div>
      ) : (
        <p className="artifact-empty">No narration audio generated yet.</p>
      )}
    </section>
  );
}
