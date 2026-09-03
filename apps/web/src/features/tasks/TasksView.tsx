import { ArrowClockwise, FilmSlate } from "@phosphor-icons/react";
import type { Channel, Task } from "@studio/shared";
import { formatTaskStatus } from "../../lib/utils";
import { EmptyState } from "../../components/EmptyState";
import { PageTitle } from "../../components/AppChrome";
import type { Notice } from "../../components/types";
import { useTranslation } from "../../i18n";
import { TaskDetailDrawer } from "./components/TaskDetailDrawer";
import { TaskDateGroups } from "./components/TaskDateGroups";
import { TaskToolbar } from "./components/TaskToolbar";
import { TaskPriorityGroups } from "./components/TaskPriorityGroups";
import { useTasksViewData } from "./hooks/useTasksViewData";

export function TasksView({
  tasks,
  channels = [],
  now,
  onRefresh,
  onNotice,
  onOpenEpisode,
}: {
  tasks: Task[];
  channels?: Channel[];
  now: number;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
  onOpenEpisode?: (channelId: string, episodeId: string) => void;
}) {
  const { t } = useTranslation();
  const {
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter,
    searchQuery,
    setSearchQuery,
    selectedInspectItem,
    setSelectedInspectItem,
    isRefreshing,
    actionsMenuOpen,
    setActionsMenuOpen,
    showAllDone,
    setShowAllDone,
    actionsMenuRef,
    totalCount,
    runningCount,
    queuedCount,
    waitingApprovalCount,
    failedCount,
    completedCount,
    cancelledCount,
    filteredItems,
    attentionItems,
    inProgressItems,
    doneItems,
    cancel,
    retry,
    clearCompleted,
    cancelAllQueued,
    handleManualRefresh,
  } = useTasksViewData({ tasks, channels, now, onRefresh, onNotice });

  const selectedChannelObj = channels.find((c) => c.channel_id === channelFilter);

  return (
    <section className="page-wrap task-manager-page">
      {/* Row 1: Header with Refresh Action */}
      <PageTitle
        eyebrow={t("tasks.eyebrow")}
        title={t("tasks.pageTitle")}
        action={
          <button
            type="button"
            className="quiet-button"
            onClick={() => void handleManualRefresh()}
            disabled={isRefreshing}
            aria-label={t("tasks.refreshTasks")}
          >
            <ArrowClockwise size={15} className={isRefreshing ? "spin" : ""} />
            <span>{t("tasks.refreshTasks")}</span>
          </button>
        }
      />

      {/* Row 2: Consolidated Toolbar */}
      <TaskToolbar
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        channelFilter={channelFilter}
        setChannelFilter={setChannelFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        channels={channels}
        totalCount={totalCount}
        runningCount={runningCount}
        queuedCount={queuedCount}
        waitingApprovalCount={waitingApprovalCount}
        failedCount={failedCount}
        completedCount={completedCount}
        cancelledCount={cancelledCount}
        actionsMenuOpen={actionsMenuOpen}
        setActionsMenuOpen={setActionsMenuOpen}
        actionsMenuRef={actionsMenuRef}
        cancelAllQueued={cancelAllQueued}
        clearCompleted={clearCompleted}
      />

      {/* Main Content Area */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<FilmSlate size={32} />}
          title={
            searchQuery && channelFilter !== "all"
              ? "No matching tasks found"
              : searchQuery
                ? "No tasks match your search"
                : channelFilter !== "all"
                  ? `No tasks for "${selectedChannelObj?.display_name || "channel"}"`
                  : statusFilter !== "all"
                    ? `No ${formatTaskStatus(statusFilter.toUpperCase() as Task["status"])} tasks`
                    : "No episode tasks found"
          }
          copy={
            searchQuery && channelFilter !== "all"
              ? "Try adjusting your search query or reset your channel filter."
              : searchQuery
                ? "Try adjusting your search terms to find what you are looking for."
                : channelFilter !== "all"
                  ? "This channel has no matching episode tasks. Switch to All Channels or generate a new episode."
                  : "When you generate episode videos, scripts, or assets, operations will appear here in real-time."
          }
          action={
            searchQuery && channelFilter !== "all"
              ? "Reset All Filters"
              : searchQuery
                ? "Clear Search"
                : channelFilter !== "all"
                  ? "Reset Channel Filter"
                  : statusFilter !== "all"
                    ? "Show All Tasks"
                    : "Refresh"
          }
          onAction={
            searchQuery && channelFilter !== "all"
              ? () => {
                  setSearchQuery("");
                  setChannelFilter("all");
                }
              : searchQuery
                ? () => setSearchQuery("")
                : channelFilter !== "all"
                  ? () => setChannelFilter("all")
                  : statusFilter !== "all"
                    ? () => setStatusFilter("all")
                    : () => void handleManualRefresh()
          }
        />
      ) : statusFilter === "all" ? (
        <TaskPriorityGroups
          attentionItems={attentionItems}
          inProgressItems={inProgressItems}
          doneItems={doneItems}
          queuedCount={queuedCount}
          showAllDone={showAllDone}
          setShowAllDone={setShowAllDone}
          now={now}
          onCancel={cancel}
          onRetry={retry}
          onInspect={setSelectedInspectItem}
          cancelAllQueued={cancelAllQueued}
          clearCompleted={clearCompleted}
        />
      ) : (
        /* Flat Filtered List View */
        <TaskDateGroups
          items={filteredItems}
          now={now}
          onCancel={cancel}
          onRetry={retry}
          onInspect={setSelectedInspectItem}
          sectionId="filtered"
        />
      )}

      {/* Slide-over Task Detail & Error Drawer */}
      <TaskDetailDrawer
        item={selectedInspectItem}
        task={null}
        now={now}
        onClose={() => setSelectedInspectItem(null)}
        onCancel={cancel}
        onRetry={retry}
        onOpenEpisode={onOpenEpisode}
      />
    </section>
  );
}
