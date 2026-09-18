import { ArrowLeft, CircleNotch, Plus, Upload } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";

export interface MascotStudioHeaderProps {
  currentTab: string;
  importingZip: boolean;
  onImportZip: (file: File) => void;
  onStartNew: () => void;
  onBackToLibrary: () => void;
}

export function MascotStudioHeader({ currentTab, importingZip, onImportZip, onStartNew, onBackToLibrary }: MascotStudioHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="section-heading mascot-header">
      <div>
        <h1>{t("mascots.pageTitle")}</h1>
      </div>

      <div className="mascot-top-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {currentTab === "library" ? (
          <>
            <label className="quiet-button" style={{ cursor: "pointer", margin: 0 }} title={t("common.importZip")}>
              {importingZip ? <CircleNotch className="spin" size={15} /> : <Upload size={15} />}
              <span>{importingZip ? t("common.importing") : t("common.importZip")}</span>
              <input
                type="file"
                accept=".zip,application/zip"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onImportZip(file);
                }}
              />
            </label>
            <button type="button" className="primary-button" onClick={onStartNew}>
              <Plus size={16} weight="bold" />
              <span>{t("mascots.newMascot")}</span>
            </button>
          </>
        ) : (
          <button type="button" className="quiet-button" onClick={onBackToLibrary}>
            <ArrowLeft size={16} />
            <span>{t("mascots.tabLibrary")}</span>
          </button>
        )}
      </div>
    </div>
  );
}
