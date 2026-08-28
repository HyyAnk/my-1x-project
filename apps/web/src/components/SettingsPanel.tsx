import { HardDrives, SpeakerHigh, TerminalWindow, VideoCamera } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type {
  AppConfig,
  Channel,
  CodexSettingsResponse,
  AntigravitySettingsResponse,
  StorageInfo,
  VoiceProfile,
} from "@studio/shared";
import { api } from "../api";
import { PageTitle } from "./AppChrome";
import type { Notice } from "./types";
import { useTranslation } from "../i18n";
import { EngineSettingsTab } from "../features/settings/EngineSettingsTab";
import { VoiceSettingsTab } from "../features/settings/VoiceSettingsTab";
import { MediaSettingsTab } from "../features/settings/MediaSettingsTab";
import { SystemSettingsTab } from "../features/settings/SystemSettingsTab";
import { StorageSetupModal } from "../features/settings/StorageSetupModal";

export type SettingsTab = "engines" | "voice" | "media" | "system";

export { StorageSetupModal };

type SettingsViewProps = {
  channels: Channel[];
  appConfig: AppConfig | null;
  codex: CodexSettingsResponse | null;
  codexStatus: string;
  antigravity?: AntigravitySettingsResponse | null;
  antigravityStatus?: string;
  git: { branch: string | null; dirty: boolean; changed_files: number };
  storage: StorageInfo | null;
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  onStorageSaved: (storage: StorageInfo) => void | Promise<void>;
  onCodexSaved: (response: CodexSettingsResponse) => void;
  onAntigravitySaved?: (response: AntigravitySettingsResponse) => void;
  onAudioSaved: (audio: AppConfig["audio_generation"]) => void | Promise<void>;
  onVideoSaved: (video: AppConfig["video_generation"]) => void | Promise<void>;
  onImageSaved: (image: AppConfig["image_generation"]) => void | Promise<void>;
  onChannelUpdated: (channel: Channel) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
  simplifyMode?: boolean;
  onSimplifyChange?: (enabled: boolean) => void;
};

export function SettingsView({
  channels,
  appConfig,
  codex,
  codexStatus,
  antigravity,
  antigravityStatus,
  storage,
  activeTab,
  onTabChange,
  onStorageSaved,
  onCodexSaved,
  onAntigravitySaved,
  onAudioSaved,
  onVideoSaved,
  onImageSaved,
  onChannelUpdated,
  onNotice,
  simplifyMode = true,
  onSimplifyChange,
}: SettingsViewProps) {
  const { t } = useTranslation();
  const initialTab: SettingsTab =
    activeTab === "engines" || activeTab === "voice" || activeTab === "media" || activeTab === "system"
      ? activeTab
      : "engines";
  const [currentTab, setCurrentTab] = useState<SettingsTab>(initialTab);
  const [voices, setVoices] = useState<VoiceProfile[]>([]);

  useEffect(() => {
    if (
      activeTab &&
      (activeTab === "engines" || activeTab === "voice" || activeTab === "media" || activeTab === "system") &&
      activeTab !== currentTab
    ) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    void api
      .voices()
      .then((response) => setVoices(response.voices))
      .catch((error: Error) => onNotice({ tone: "bad", message: error.message }));
  }, [onNotice]);

  const switchTab = (tab: SettingsTab) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  return (
    <section className="page-wrap">
      <PageTitle eyebrow={t("topbar.workspace")} title={t("settings.pageTitle")} />

      {/* 4-Category Structured Settings Navigation */}
      <div className="channel-group-tabs" role="tablist" aria-label="Settings categories" style={{ margin: "16px 0 24px" }}>
        <button
          type="button"
          role="tab"
          aria-selected={currentTab === "engines"}
          className={`channel-group-tab ${currentTab === "engines" ? "is-selected" : ""}`}
          onClick={() => switchTab("engines")}
        >
          <TerminalWindow size={18} weight={currentTab === "engines" ? "fill" : "regular"} />
          <span>{t("settings.tabEngines")}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={currentTab === "voice"}
          className={`channel-group-tab ${currentTab === "voice" ? "is-selected" : ""}`}
          onClick={() => switchTab("voice")}
        >
          <SpeakerHigh size={18} weight={currentTab === "voice" ? "fill" : "regular"} />
          <span>{t("settings.tabVoice")}</span>
          {voices.length > 0 ? <small>{voices.length} voices</small> : null}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={currentTab === "media"}
          className={`channel-group-tab ${currentTab === "media" ? "is-selected" : ""}`}
          onClick={() => switchTab("media")}
        >
          <VideoCamera size={18} weight={currentTab === "media" ? "fill" : "regular"} />
          <span>{t("settings.tabMedia")}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={currentTab === "system"}
          className={`channel-group-tab ${currentTab === "system" ? "is-selected" : ""}`}
          onClick={() => switchTab("system")}
        >
          <HardDrives size={18} weight={currentTab === "system" ? "fill" : "regular"} />
          <span>{t("settings.tabSystem")}</span>
        </button>
      </div>

      {/* Tab 1: AI Engines */}
      {currentTab === "engines" ? (
        <EngineSettingsTab
          appConfig={appConfig}
          codex={codex}
          codexStatus={codexStatus}
          antigravity={antigravity}
          antigravityStatus={antigravityStatus}
          onCodexSaved={onCodexSaved}
          onAntigravitySaved={onAntigravitySaved}
          onNotice={onNotice}
        />
      ) : null}

      {/* Tab 2: Voice & Speech */}
      {currentTab === "voice" ? (
        <VoiceSettingsTab
          channels={channels}
          appConfig={appConfig}
          voices={voices}
          onAudioSaved={onAudioSaved}
          onChannelUpdated={onChannelUpdated}
          onNotice={onNotice}
        />
      ) : null}

      {/* Tab 3: Media & Generation */}
      {currentTab === "media" ? (
        <MediaSettingsTab
          appConfig={appConfig}
          onVideoSaved={onVideoSaved}
          onImageSaved={onImageSaved}
          onNotice={onNotice}
        />
      ) : null}

      {/* Tab 4: Storage & System */}
      {currentTab === "system" ? (
        <SystemSettingsTab
          storage={storage}
          onStorageSaved={onStorageSaved}
          simplifyMode={simplifyMode}
          onSimplifyChange={onSimplifyChange}
          onNotice={onNotice}
        />
      ) : null}
    </section>
  );
}
