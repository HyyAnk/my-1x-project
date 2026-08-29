import type React from "react";
import { CaretDown, Funnel, ListChecks, MagnifyingGlass, Trash, X } from "@phosphor-icons/react";
import type { Channel } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { getNavProps } from "../../../hooks/useRouter";
import type { StatusFilter } from "../types";

export type TaskToolbarProps = {
  statusFilter: StatusFilter;
  setStatusFilter: (filter: StatusFilter) => void;
  channelFilter: string;
  setChannelFilter: (channelId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  channels: Channel[];
  totalCount: number;
  runningCount: number;
  queuedCount: number;
  waitingApprovalCount: number;
  failedCount: number;
  completedCount: number;
  cancelledCount: number;
  actionsMenuOpen: boolean;
  setActionsMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  actionsMenuRef: React.RefObject<HTMLDivElement | null>;
  cancelAllQueued: () => Promise<void>;
  clearCompleted: () => void;
};

export function TaskToolbar({
  statusFilter,
  setStatusFilter,
  channelFilter,
  setChannelFilter,
  searchQuery,
  setSearchQuery,
  channels,
  totalCount,
  runningCount,
  queuedCount,
  waitingApprovalCount,
  failedCount,
  completedCount,
  cancelledCount,
  actionsMenuOpen,
  setActionsMenuOpen,
  actionsMenuRef,
  cancelAllQueued,
  clearCompleted,
}: TaskToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="task-toolbar-unified">
      {/* Left: Status Filter Chips */}
      <div className="task-kpi-bar" role="group" aria-label="Filter tasks by status">
        <a
          aria-pressed={statusFilter === "all"}
          className={`task-kpi-chip ${statusFilter === "all" ? "is-active" : ""}`}
          {...getNavProps("#/tasks?tab=all", () => setStatusFilter("all"))}
        >
          <span className="kpi-label">{t("tasks.filterAll")}</span>
          <span className="kpi-count">{totalCount}</span>
        </a>

        <a
          aria-pressed={statusFilter === "running"}
          className={`task-kpi-chip is-running ${statusFilter === "running" ? "is-active" : ""}`}
          {...getNavProps("#/tasks?tab=running", () => setStatusFilter("running"))}
        >
          {runningCount > 0 && <span className="live-dot-pulse" />}
          <span className="kpi-label">{t("tasks.filterRunning")}</span>
          <span className="kpi-count">{runningCount}</span>
        </a>

        <a
          aria-pressed={statusFilter === "queued"}
          className={`task-kpi-chip is-queued ${statusFilter === "queued" ? "is-active" : ""}`}
          {...getNavProps("#/tasks?tab=queued", () => setStatusFilter("queued"))}
        >
          <span className="kpi-label">{t("tasks.filterQueued")}</span>
          <span className="kpi-count">{queuedCount}</span>
        </a>

        {waitingApprovalCount > 0 && (
          <a
            aria-pressed={statusFilter === "waiting_approval"}
            className={`task-kpi-chip is-waiting_approval ${statusFilter === "waiting_approval" ? "is-active" : ""}`}
            {...getNavProps("#/tasks?tab=waiting_approval", () => setStatusFilter("waiting_approval"))}
          >
            <span className="kpi-label">{t("tasks.filterWaiting")}</span>
            <span className="kpi-count">{waitingApprovalCount}</span>
          </a>
        )}

        <a
          aria-pressed={statusFilter === "failed"}
          className={`task-kpi-chip is-failed ${statusFilter === "failed" ? "is-active" : ""}`}
          {...getNavProps("#/tasks?tab=failed", () => setStatusFilter("failed"))}
        >
          <span className="kpi-label">{t("tasks.filterFailed")}</span>
          <span className={`kpi-count ${failedCount > 0 ? "has-errors" : ""}`}>{failedCount}</span>
        </a>

        <a
          aria-pressed={statusFilter === "completed"}
          className={`task-kpi-chip is-completed ${statusFilter === "completed" ? "is-active" : ""}`}
          {...getNavProps("#/tasks?tab=completed", () => setStatusFilter("completed"))}
        >
          <span className="kpi-label">{t("tasks.filterCompleted")}</span>
          <span className="kpi-count">{completedCount}</span>
        </a>

        {cancelledCount > 0 && (
          <a
            aria-pressed={statusFilter === "cancelled"}
            className={`task-kpi-chip is-cancelled ${statusFilter === "cancelled" ? "is-active" : ""}`}
            {...getNavProps("#/tasks?tab=cancelled", () => setStatusFilter("cancelled"))}
          >
            <span className="kpi-label">{t("tasks.filterCancelled")}</span>
            <span className="kpi-count">{cancelledCount}</span>
          </a>
        )}
      </div>

      {/* Right: Search + Channel Selector + Actions Menu */}
      <div className="task-toolbar-controls">
        {/* Search Box */}
        <div className="task-search-box">
          <MagnifyingGlass size={14} className="search-icon" />
          <input
            type="search"
            placeholder={t("tasks.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t("tasks.searchPlaceholder")}
          />
          {searchQuery && (
            <button type="button" className="clear-search-btn" onClick={() => setSearchQuery("")} aria-label="Clear search">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Channel Selector */}
        {channels.length > 1 && (
          <div className="task-channel-filter-wrap">
            <Funnel size={13} className="channel-filter-icon" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="task-channel-select"
              aria-label="Filter by channel"
            >
              <option value="all">All Channels</option>
              {channels.map((ch) => (
                <option key={ch.channel_id} value={ch.channel_id}>
                  {ch.display_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Bulk Actions Dropdown */}
        <div className="task-bulk-actions-wrap" ref={actionsMenuRef}>
          <button
            type="button"
            className={`quiet-button compact task-actions-trigger ${actionsMenuOpen ? "is-active" : ""}`}
            onClick={() => setActionsMenuOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={actionsMenuOpen}
            aria-label="Bulk actions menu"
          >
            <ListChecks size={14} />
            <span>Actions</span>
            <CaretDown size={11} />
          </button>

          {actionsMenuOpen && (
            <div className="task-actions-dropdown-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="task-dropdown-item danger-text"
                disabled={queuedCount === 0}
                onClick={() => {
                  setActionsMenuOpen(false);
                  void cancelAllQueued();
                }}
              >
                <X size={14} />
                <span>Cancel Queue ({queuedCount})</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="task-dropdown-item"
                disabled={completedCount + cancelledCount === 0}
                onClick={() => {
                  setActionsMenuOpen(false);
                  clearCompleted();
                }}
              >
                <Trash size={14} />
                <span>Clear Finished ({completedCount + cancelledCount})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
