import { CircleNotch, Queue, X } from "@phosphor-icons/react";
import type { Channel, Task } from "@studio/shared";
import { formatTaskType } from "../../lib/utils";
import { useTranslation } from "../../i18n";
import { buildHash, getNavProps } from "../../hooks/useRouter";

export type SidebarQueueWidgetProps = {
  tasks?: Task[];
  channels?: Channel[];
  onCancelTask?: (taskId: string) => void | Promise<void>;
  onOpenTasks?: () => void;
  onOpenEpisode?: (channelId: string, episodeId: string) => void;
};

export function SidebarQueueWidget({ tasks = [], channels = [], onCancelTask, onOpenTasks, onOpenEpisode }: SidebarQueueWidgetProps) {
  const { t } = useTranslation();
  const episodeTasks = tasks.filter((task) => Boolean(task.episode_id));
  const queuedTasks = episodeTasks.filter((task) => task.status === "QUEUED").reverse();
  const runningTasks = episodeTasks.filter((task) => task.status === "RUNNING");
  const channelMap = new Map(channels.map((c) => [c.channel_id, c.display_name]));

  const formatEpisodeLabel = (channelId: string, episodeId: string | null) => {
    const chName = channelMap.get(channelId) || t("channels.quizChannels");
    if (!episodeId) return chName;
    return `${chName} · EP ${episodeId.slice(-4).toUpperCase()}`;
  };

  return (
    <div className="sidebar-queue-widget" title={t("tasks.taskQueue")}>
      <div className="sidebar-queue-header" {...getNavProps("#/tasks", onOpenTasks)} style={{ cursor: "pointer" }}>
        <div className="sidebar-queue-title">
          <Queue size={14} weight="duotone" />
          <span>{t("sidebar.queue")}</span>
        </div>
        <div className="sidebar-queue-badges">
          {runningTasks.length > 0 ? (
            <span className="queue-badge running" title={t("sidebar.runningCount", { count: runningTasks.length })}>
              <CircleNotch size={10} className="spin" />
              <span>{runningTasks.length}</span>
            </span>
          ) : null}
          {queuedTasks.length > 0 ? (
            <span className="queue-badge queued" title={t("sidebar.queuedCount", { count: queuedTasks.length })}>
              {t("sidebar.queuedCount", { count: queuedTasks.length })}
            </span>
          ) : runningTasks.length === 0 ? (
            <span className="queue-badge empty">{t("sidebar.idle")}</span>
          ) : null}
        </div>
      </div>

      {queuedTasks.length > 0 ? (
        <div className="sidebar-queue-list">
          {queuedTasks.map((task, index) => {
            const itemHash =
              task.channel_id && task.episode_id
                ? buildHash({ page: "channels", channelId: task.channel_id, episodeId: task.episode_id })
                : "#/tasks";

            return (
              <a
                key={task.task_id}
                className="sidebar-queue-item"
                title={`${formatTaskType(task.task_type)} - ${task.progress_message || t("tasks.filterQueued")}`}
                {...getNavProps(itemHash, () => {
                  if (task.channel_id && task.episode_id && onOpenEpisode) {
                    onOpenEpisode(task.channel_id, task.episode_id);
                  } else if (onOpenTasks) {
                    onOpenTasks();
                  }
                })}
              >
                <div className="sidebar-queue-item-left">
                  <span className="sidebar-queue-pos">#{index + 1}</span>
                  <div className="sidebar-queue-info">
                    <strong className="sidebar-queue-name">{formatEpisodeLabel(task.channel_id, task.episode_id)}</strong>
                    <span className="sidebar-queue-type">{formatTaskType(task.task_type)}</span>
                  </div>
                </div>
                {onCancelTask ? (
                  <button
                    type="button"
                    className="sidebar-queue-cancel-btn"
                    title={t("sidebar.cancelQueuedTask")}
                    aria-label={t("sidebar.cancelQueuedTask")}
                    onClick={(e) => {
                      e.stopPropagation();
                      void onCancelTask(task.task_id);
                    }}
                  >
                    <X size={12} />
                  </button>
                ) : null}
              </a>
            );
          })}
        </div>
      ) : runningTasks.length > 0 ? (
        <div className="sidebar-queue-running-hint" {...getNavProps("#/tasks", onOpenTasks)} style={{ cursor: "pointer" }}>
          <span className="status-pulse-dot" />
          <span>{t("sidebar.runningAndQueued", { running: runningTasks.length, queued: 0 })}</span>
        </div>
      ) : (
        <div className="sidebar-queue-empty" {...getNavProps("#/tasks", onOpenTasks)} style={{ cursor: "pointer" }}>
          <span>{t("sidebar.queueEmpty")}</span>
        </div>
      )}
    </div>
  );
}
