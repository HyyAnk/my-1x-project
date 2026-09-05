import { ArrowClockwise, Broadcast, Database, Gear, House, ListChecks, Palette, Plus, Smiley, Sparkle, Wallet } from "@phosphor-icons/react";
import type { Channel, Task } from "@studio/shared";
import type { Page } from "../types";
import { useTranslation } from "../../i18n";
import { buildHash, getNavProps } from "../../hooks/useRouter";
import { SidebarQueueWidget } from "./SidebarQueueWidget";

export type SidebarProps = {
  page: Page;
  setPage: (page: Page) => void;
  activeTaskCount: number;
  tasks?: Task[];
  channels?: Channel[];
  onCancelTask?: (taskId: string) => void | Promise<void>;
  onOpenEpisode?: (channelId: string, episodeId: string) => void;
  balanceInfo?: { balance_vnd: number; rpm?: number } | null;
  loadingBalance?: boolean;
  balanceError?: string | null;
  onRefreshBalance?: () => void;
  onOpenSettings?: () => void;
  onCreateChannel?: () => void;
};

export function Sidebar({
  page,
  setPage,
  activeTaskCount,
  tasks = [],
  channels = [],
  onCancelTask,
  onOpenEpisode,
  balanceInfo,
  loadingBalance = false,
  balanceError = null,
  onRefreshBalance,
  onOpenSettings,
  onCreateChannel,
}: SidebarProps) {
  const { t } = useTranslation();
  const items: Array<{ page: Page; label: string; icon: typeof House }> = [
    { page: "dashboard", label: t("sidebar.dashboard"), icon: House },
    { page: "channels", label: t("sidebar.channels"), icon: Broadcast },
    { page: "question_bank", label: t("sidebar.questionBank"), icon: Database },
    { page: "mascots", label: t("sidebar.mascotStudio"), icon: Smiley },
    { page: "sandbox", label: t("sidebar.sandbox"), icon: Palette },
    { page: "tasks", label: t("sidebar.tasks"), icon: ListChecks },
  ];

  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <div className="brand-mark" title={t("sidebar.brandName")}>
          <Sparkle size={18} weight="fill" />
        </div>
        <div>
          <span className="brand-name">{t("sidebar.brandName")}</span>
          <span className="brand-subtitle">{t("sidebar.brandSubtitle")}</span>
        </div>
      </div>
      {onCreateChannel ? (
        <button type="button" className="sidebar-create-btn" onClick={onCreateChannel} title={t("sidebar.newChannel")}>
          <Plus size={16} weight="bold" />
          <span>{t("sidebar.newChannel")}</span>
        </button>
      ) : null}
      <div className="sidebar-rule" />
      <nav className="primary-nav" aria-label="Primary navigation">
        {items.map(({ page: itemPage, label, icon: Icon }) => (
          <a
            key={itemPage}
            className={`nav-item ${page === itemPage ? "is-active" : ""}`}
            {...getNavProps(buildHash({ page: itemPage }), () => setPage(itemPage))}
          >
            <Icon size={18} weight={page === itemPage ? "fill" : "regular"} />
            <span>{label}</span>
            {itemPage === "tasks" && activeTaskCount > 0 ? <span className="nav-count">{activeTaskCount}</span> : null}
          </a>
        ))}
        <a
          className={`nav-item mobile-settings-nav ${page === "settings" ? "is-active" : ""}`}
          aria-label={t("sidebar.settings")}
          {...getNavProps("#/settings", () => setPage("settings"))}
        >
          <Gear size={18} />
          <span>{t("sidebar.settings")}</span>
        </a>
      </nav>
      <div className="sidebar-bottom">
        <SidebarQueueWidget
          tasks={tasks}
          channels={channels}
          onCancelTask={onCancelTask}
          onOpenTasks={() => setPage("tasks")}
          onOpenEpisode={onOpenEpisode}
        />

        <div
          className="sidebar-balance-widget"
          title="Image API Balance (Auto-refreshed every 30s)"
          style={{ cursor: !balanceInfo && onOpenSettings ? "pointer" : "default" }}
          {...getNavProps("#/settings?tab=media", () => {
            if (!balanceInfo && onOpenSettings) onOpenSettings();
          })}
        >
          <div className="sidebar-balance-header">
            <div className="sidebar-balance-title">
              <Wallet size={14} weight="duotone" />
              <span>{t("sidebar.apiBalance")}</span>
            </div>
            <button
              type="button"
              className="sidebar-balance-refresh-btn"
              title={t("sidebar.refreshBalance")}
              aria-label={t("sidebar.refreshBalance")}
              disabled={loadingBalance}
              onClick={(e) => {
                e.stopPropagation();
                onRefreshBalance?.();
              }}
            >
              <ArrowClockwise size={12} className={loadingBalance ? "spin" : ""} />
            </button>
          </div>
          <div className="sidebar-balance-amount">
            {balanceInfo !== null && balanceInfo !== undefined ? (
              <>
                <strong>{balanceInfo.balance_vnd.toLocaleString("en-US")}</strong>
                <span className="sidebar-balance-unit">VND</span>
              </>
            ) : balanceError ? (
              <span className="sidebar-balance-error" title={balanceError}>
                {t("sidebar.noApiKey")}
              </span>
            ) : (
              <span className="sidebar-balance-loading">{t("common.loading")}</span>
            )}
          </div>
          {balanceInfo?.rpm ? (
            <div className="sidebar-balance-rpm">
              <span>RPM: {balanceInfo.rpm}</span>
            </div>
          ) : null}
        </div>

        <a className={`nav-item ${page === "settings" ? "is-active" : ""}`} {...getNavProps("#/settings", () => setPage("settings"))}>
          <Gear size={18} weight={page === "settings" ? "fill" : "regular"} />
          <span>{t("sidebar.settings")}</span>
        </a>
        <div className="local-badge">
          <span className="status-dot" />
          <span>{t("sidebar.localWorkspace")}</span>
        </div>
      </div>
    </aside>
  );
}
