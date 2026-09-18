import type { Channel } from "@studio/shared";
import type { Notice } from "./types";
import { useTranslation } from "../i18n";
import { getNavProps } from "../hooks/useRouter";
import { useRouteTab } from "../hooks/router/useRouteTab";
import { useMascotLibrary } from "../features/mascot/hooks/useMascotLibrary";
import { useMascotGenerator } from "../features/mascot/hooks/useMascotGenerator";
import { useMascotStudioRouting } from "../features/mascot/hooks/useMascotStudioRouting";
import { MascotStudioHeader } from "../features/mascot/components/MascotStudioHeader";
import { MascotLibraryTab } from "../features/mascot/MascotLibraryTab";
import { MascotGeneratorTab } from "../features/mascot/MascotGeneratorTab";

export interface MascotStudioViewProps {
  channels: Channel[];
  onNotice: (notice: NonNullable<Notice>) => void;
  onRefreshChannels: () => Promise<void>;
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
  mascotId?: string | null;
  step?: number | null;
  openMascot?: (mascotId?: string | null, step?: number | null) => void;
  setQueryParam?: (key: string, value: string | null, replace?: boolean) => void;
}

export function MascotStudioView({
  channels,
  onNotice,
  onRefreshChannels,
  activeTab,
  onTabChange,
  mascotId,
  step,
  openMascot,
  setQueryParam,
}: MascotStudioViewProps) {
  const { t } = useTranslation();
  const [currentTab, switchTab] = useRouteTab({
    value: activeTab,
    allowedTabs: ["library", "generator"] as const,
    fallback: mascotId ? "generator" : "library",
    onChange: onTabChange,
  });

  const libraryState = useMascotLibrary({ onNotice, onRefreshChannels });
  const generatorState = useMascotGenerator({
    onNotice,
    onRefreshChannels,
    onMascotsChanged: libraryState.loadMascots,
  });

  const { libraryUrl, generatorUrl, handleStartNew, handleEditMascot, handleBackToLibrary, handleSelectGeneratorTab } =
    useMascotStudioRouting({
      mascotId,
      step,
      openMascot,
      setQueryParam,
      currentTab,
      switchTab,
      generatorState,
      libraryState,
      onNotice,
    });

  return (
    <section className="page-wrap mascot-studio-page">
      <MascotStudioHeader
        currentTab={currentTab}
        importingZip={libraryState.importingZip}
        onImportZip={(file) => void libraryState.handleImportZip(file)}
        onStartNew={handleStartNew}
        onBackToLibrary={handleBackToLibrary}
      />

      <div className="channel-group-tabs" role="tablist" aria-label="Mascot Studio Tabs" style={{ marginBottom: "20px" }}>
        <a
          role="tab"
          aria-selected={currentTab === "library"}
          className={`channel-group-tab ${currentTab === "library" ? "is-selected" : ""}`}
          {...getNavProps(libraryUrl, handleBackToLibrary)}
        >
          <span>{t("mascots.tabLibrary")}</span>
          <small>{libraryState.mascots.length}</small>
        </a>
        <a
          role="tab"
          aria-selected={currentTab === "generator"}
          className={`channel-group-tab ${currentTab === "generator" ? "is-selected" : ""}`}
          {...getNavProps(generatorUrl, handleSelectGeneratorTab)}
        >
          <span>{t("mascots.tabGenerator")}</span>
          {generatorState.editingMascot ? <small>{generatorState.editingMascot.name}</small> : null}
        </a>
      </div>

      {currentTab === "library" ? (
        <MascotLibraryTab
          channels={channels}
          onNotice={onNotice}
          onRefreshChannels={onRefreshChannels}
          onStartNew={handleStartNew}
          onEditMascot={handleEditMascot}
          libraryState={libraryState}
        />
      ) : null}

      {currentTab === "generator" ? <MascotGeneratorTab generatorState={generatorState} /> : null}
    </section>
  );
}
