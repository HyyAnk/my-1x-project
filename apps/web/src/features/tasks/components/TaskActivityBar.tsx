import type { Task } from "@studio/shared";
import type { RealtimeStatus } from "../../../api";
import { formatTaskElapsed, formatTaskStatus, formatTaskType } from "../../../lib/utils";
import { useTranslation } from "../../../i18n";
import { calculateProgress } from "../types";
import { buildHash, getNavProps } from "../../../hooks/useRouter";

export function TaskActivityBar({
  tasks,
  realtimeStatus,
  now,
  onOpenTasks,
  onOpenEpisode,
}: {
  tasks: Task[];
  realtimeStatus: RealtimeStatus;
  now: number;
  onOpenTasks: () => void;
  onOpenEpisode?: (channelId: string, episodeId: string) => void;
}) {
  const { t } = useTranslation();
  const episodeTasks = tasks.filter((t) => Boolean(t.episode_id));
  if (episodeTasks.length === 0 && realtimeStatus === "connected") return null;
  const task = episodeTasks[0] ?? null;
  const reconnecting = realtimeStatus !== "connected";

  const handleAction = () => {
    if (task && task.channel_id && task.episode_id && onOpenEpisode) {
      onOpenEpisode(task.channel_id, task.episode_id);
    } else {
      onOpenTasks();
    }
  };

  const progress = task ? calculateProgress(task, task.status) : 0;
  const targetHash = task && task.channel_id && task.episode_id
    ? buildHash({ page: "channels", channelId: task.channel_id, episodeId: task.episode_id })
    : "#/tasks";

  return (
    <div
      className={`task-activity-bar ${reconnecting ? "is-reconnecting" : ""}`}
      role="button"
      tabIndex={0}
      {...getNavProps(targetHash, handleAction)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleAction();
        }
      }}
      title={task?.episode_id ? `Open episode (${progress}%)` : t("tasks.taskActivityTitle")}
      aria-label={
        task?.episode_id
          ? `Active task: ${formatTaskType(task.task_type)}, ${progress}% complete. Click to open episode.`
          : reconnecting
          ? t("tasks.reconnectingLive")
          : t("tasks.pageTitle")
      }
    >
      <div className="task-activity-signal">
        <span className="live-pulse" />
        <span>{reconnecting ? t("tasks.reconnectingLive") : t("tasks.activeTasksCount", { count: episodeTasks.length })}</span>
      </div>
      {task ? (
        <>
          <div className="task-activity-copy">
            <strong>{formatTaskType(task.task_type)}</strong>
            <span>{task.progress_message || formatTaskStatus(task.status)}</span>
          </div>
          <span className="task-activity-time">{formatTaskElapsed(task, now)}</span>
          <div className="task-activity-track" role="progressbar" aria-label="Active task progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${Math.max(4, Math.min(100, progress))}%` }} />
          </div>
          <span className="task-activity-percent">{progress}%</span>
        </>
      ) : (
        <div className="task-activity-copy">
          <strong>Reconnecting</strong>
          <span>Data will automatically sync once connection is restored.</span>
        </div>
      )}
    </div>
  );
}
