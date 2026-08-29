import { MoonStars, Sun } from "@phosphor-icons/react";
import type { Channel } from "@studio/shared";
import type { GitInfo, Theme } from "../types";
import { useTranslation } from "../../i18n";
import { ChannelSelector } from "./topbar/ChannelSelector";
import { EngineToggleGroup } from "./topbar/EngineToggleGroup";
import { ImageModelControl, TextModelControl } from "./topbar/ModelControls";

export type TopbarProps = {
  channel: Channel | null;
  channels?: Channel[];
  onSelectChannel?: (channelId: string) => void;
  activeEngine: "codex" | "antigravity";
  engineStatus: string;
  git: GitInfo;
  currentModel: string;
  models: Array<{ id: string; label: string }>;
  loadingModels?: boolean;
  modelsError?: string | null;
  currentImageModel?: string;
  hasImageApiKey?: boolean;
  theme: Theme;
  onEngineToggle: (engine: "codex" | "antigravity") => Promise<void> | void;
  onThemeToggle: () => void;
  onModelChange: (model: string) => Promise<void>;
  onImageModelChange: (model: string) => Promise<void>;
  onOpenImageSettings?: () => void;
  onReconnect: () => void;
  onShutdown: () => void;
};

export function Topbar({
  channel,
  channels = [],
  onSelectChannel,
  activeEngine,
  engineStatus,
  git: _git,
  currentModel,
  models,
  loadingModels = false,
  modelsError = null,
  currentImageModel = "gpt-image-2",
  hasImageApiKey = false,
  theme,
  onEngineToggle,
  onThemeToggle,
  onModelChange,
  onImageModelChange,
  onOpenImageSettings,
  onReconnect,
  onShutdown: _onShutdown,
}: TopbarProps) {
  const { t } = useTranslation();
  const reconnectable = engineStatus === "disconnected" || engineStatus === "unavailable";
  const statusLabelMap: Record<string, string> = {
    connected: t("common.ready"),
    connecting: t("common.connecting"),
    disconnected: t("common.disconnected"),
    unavailable: t("common.unavailable"),
  };
  const label = statusLabelMap[engineStatus] ?? t("common.unavailable");

  return (
    <header className="topbar">
      <div className="context-trail">
        <span className="context-kicker">{t("topbar.workspace")}</span>
        <ChannelSelector channel={channel} channels={channels} onSelectChannel={onSelectChannel} />
      </div>
      <div className="topbar-meta">
        <EngineToggleGroup activeEngine={activeEngine} onEngineToggle={onEngineToggle} />

        <ImageModelControl
          hasImageApiKey={hasImageApiKey}
          currentImageModel={currentImageModel}
          onImageModelChange={onImageModelChange}
          onOpenImageSettings={onOpenImageSettings}
        />

        <TextModelControl
          activeEngine={activeEngine}
          currentModel={currentModel}
          models={models}
          loadingModels={loadingModels}
          modelsError={modelsError}
          onModelChange={onModelChange}
        />

        <span className={`codex-pill ${engineStatus === "connected" ? "is-connected" : ""}`}>
          <span className="status-dot" />
          {label}
        </span>
        {reconnectable ? (
          <button className="link-button" onClick={onReconnect}>
            {t("topbar.reconnectBtn")}
          </button>
        ) : null}
        <button
          className="icon-button theme-toggle"
          title={theme === "dark" ? t("topbar.themeToggleLight") : t("topbar.themeToggleDark")}
          aria-label={theme === "dark" ? t("topbar.themeToggleLight") : t("topbar.themeToggleDark")}
          onClick={onThemeToggle}
        >
          {theme === "dark" ? <Sun size={16} /> : <MoonStars size={16} />}
        </button>
      </div>
    </header>
  );
}
