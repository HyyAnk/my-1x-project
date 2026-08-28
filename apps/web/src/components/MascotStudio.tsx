import { useState } from "react";
import { ArrowLeft, CircleNotch, MagicWand, Plus, Smiley, Upload } from "@phosphor-icons/react";
import type { Channel, MascotProfile } from "@studio/shared";
import type { Notice } from "./types";
import { useTranslation } from "../i18n";
import {
  AUXILIARY_ACTIONS,
  BRAND_IDENTITY_ACTIONS,
  CORE_GAMEPLAY_ACTIONS,
} from "../features/mascot/constants";
import { useMascotLibrary } from "../features/mascot/hooks/useMascotLibrary";
import { useMascotGenerator } from "../features/mascot/hooks/useMascotGenerator";
import { MascotLibraryTab } from "../features/mascot/MascotLibraryTab";
import { MascotGeneratorTab } from "../features/mascot/MascotGeneratorTab";

export { CORE_GAMEPLAY_ACTIONS, BRAND_IDENTITY_ACTIONS, AUXILIARY_ACTIONS };

export function MascotStudioView({
  channels,
  onNotice,
  onRefreshChannels,
}: {
  channels: Channel[];
  onNotice: (notice: NonNullable<Notice>) => void;
  onRefreshChannels: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"library" | "generator">("library");

  const libraryState = useMascotLibrary({
    onNotice,
    onRefreshChannels,
  });

  const generatorState = useMascotGenerator({
    channels,
    onNotice,
    onRefreshChannels,
    onMascotsChanged: libraryState.loadMascots,
  });

  const handleStartNew = () => {
    generatorState.handleStartNew();
    setActiveTab("generator");
  };

  const handleEditMascot = (mascot: MascotProfile) => {
    generatorState.handleEditMascot(mascot);
    setActiveTab("generator");
  };

  return (
    <section className="page-wrap mascot-studio-page">
      {/* Studio Header */}
      <div className="section-heading mascot-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="mascot-title-icon" style={{ fontSize: "28px" }}>🎨</span>
            <div>
              <p className="eyebrow">Video Host & Brand Persona</p>
              <h1>{t("mascots.pageTitle")}</h1>
            </div>
          </div>
          <p className="detail-copy" style={{ marginTop: "4px" }}>
            {t("mascots.pageSubtitle")}
          </p>
        </div>

        <div className="mascot-top-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {activeTab === "library" ? (
            <>
              <label className="quiet-button" style={{ cursor: "pointer", margin: 0 }} title={t("common.importZip")}>
                {libraryState.importingZip ? <CircleNotch className="spin" size={15} /> : <Upload size={15} />}
                <span>{libraryState.importingZip ? t("common.importing") : t("common.importZip")}</span>
                <input
                  type="file"
                  accept=".zip,application/zip"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void libraryState.handleImportZip(file);
                  }}
                />
              </label>
              <button type="button" className="primary-button" onClick={handleStartNew}>
                <Plus size={16} weight="bold" />
                <span>{t("mascots.newMascot")}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="quiet-button"
              onClick={() => {
                setActiveTab("library");
                void libraryState.loadMascots();
              }}
            >
              <ArrowLeft size={16} />
              <span>{t("mascots.tabLibrary")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="channel-group-tabs" role="tablist" aria-label="Mascot Studio Tabs" style={{ marginBottom: "20px" }}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "library"}
          className={`channel-group-tab ${activeTab === "library" ? "is-selected" : ""}`}
          onClick={() => setActiveTab("library")}
        >
          <Smiley size={18} weight={activeTab === "library" ? "fill" : "regular"} />
          <span>{t("mascots.tabLibrary")}</span>
          <small>{libraryState.mascots.length}</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "generator"}
          className={`channel-group-tab ${activeTab === "generator" ? "is-selected" : ""}`}
          onClick={() => {
            if (!generatorState.editingMascot) handleStartNew();
            else setActiveTab("generator");
          }}
        >
          <MagicWand size={18} weight={activeTab === "generator" ? "fill" : "regular"} />
          <span>{t("mascots.tabGenerator")}</span>
          {generatorState.editingMascot ? <small>{generatorState.editingMascot.name}</small> : null}
        </button>
      </div>

      {/* Tab 1: Library */}
      {activeTab === "library" ? (
        <MascotLibraryTab
          channels={channels}
          onNotice={onNotice}
          onRefreshChannels={onRefreshChannels}
          onStartNew={handleStartNew}
          onEditMascot={handleEditMascot}
          libraryState={libraryState}
        />
      ) : null}

      {/* Tab 2: Generator */}
      {activeTab === "generator" ? (
        <MascotGeneratorTab
          channels={channels}
          mascots={libraryState.mascots}
          generatorState={generatorState}
        />
      ) : null}
    </section>
  );
}
