import { CircleNotch, DownloadSimple, FilmSlate, FolderOpen } from "@phosphor-icons/react";
import type { Channel, Episode, Task } from "@studio/shared";
import { api } from "../../api";
import { isTaskActive, latestTask } from "../../lib/utils";
import { TaskProgressPanel } from "../../components/TaskProgressPanel";
import { formatDuration } from "./types";

type QuizVideoPanelProps = {
  channel: Channel;
  episode: Episode;
  episodeId: string;
  isQuiz: boolean;
  readiness: { narration: boolean; scenes: boolean; video: boolean };
  activeEpisodeTask: Task | null;
  episodeTasks: Task[];
  episodeClock: number;
  busy: string | null;
  onCreateTask: (taskType: Task["task_type"]) => void;
  onOpenVideoFolder: () => void;
};

export function QuizVideoPanel({
  channel,
  episode,
  episodeId,
  isQuiz,
  readiness,
  activeEpisodeTask,
  episodeTasks,
  episodeClock,
  busy,
  onCreateTask,
  onOpenVideoFolder,
}: QuizVideoPanelProps) {
  return (
    <section className="panel quiz-video-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Rendered Master</p>
          <h2>Quiz Video MP4</h2>
        </div>
        {!isQuiz ? (
          <button
            className="primary-button compact"
            disabled={!readiness.narration || !readiness.scenes || Boolean(activeEpisodeTask)}
            onClick={() => onCreateTask("GENERATE_VIDEO")}
          >
            {latestTask(episodeTasks, ["GENERATE_VIDEO"]) && isTaskActive(latestTask(episodeTasks, ["GENERATE_VIDEO"])!) ? (
              <CircleNotch className="spin" size={15} />
            ) : (
              <FilmSlate size={15} />
            )}
            <span>{readiness.video ? "Render again" : "Render video"}</span>
          </button>
        ) : null}
      </div>
      {latestTask(episodeTasks, ["GENERATE_VIDEO"]) ? (
        <TaskProgressPanel
          task={latestTask(episodeTasks, ["GENERATE_VIDEO"])!}
          title="HyperFrames render"
          activeLabel="Rendering video"
          completionLabel="Video ready"
          now={episodeClock}
          compact
        />
      ) : null}
      {episode.video_asset_path ? (
        <div className="quiz-video-result">
          <video
            controls
            preload="metadata"
            src={`${api.videoUrl(channel.channel_id, episodeId)}?v=${encodeURIComponent(episode.video_generated_at ?? "")}`}
            aria-label="Rendered video"
          />
          <div>
            <strong>MP4 with Chatterbox audio</strong>
            <span>{formatDuration(episode.video_duration_seconds ?? 0)} · HyperFrames Render</span>
            <div className="video-result-actions">
              <a
                className="quiet-button compact"
                href={api.videoUrl(channel.channel_id, episodeId)}
                download={`${episode.slug}.mp4`}
              >
                <DownloadSimple size={15} />
                <span>Download MP4</span>
              </a>
              <button
                className="quiet-button compact"
                disabled={busy === "video-folder"}
                onClick={onOpenVideoFolder}
              >
                {busy === "video-folder" ? <CircleNotch className="spin" size={15} /> : <FolderOpen size={15} />}
                <span>{busy === "video-folder" ? "Opening…" : "Open folder"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="artifact-empty">Render video once narration and shot breakdown are complete.</p>
      )}
    </section>
  );
}
