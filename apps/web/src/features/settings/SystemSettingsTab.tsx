import { CircleNotch, FloppyDisk, HardDrives } from "@phosphor-icons/react";
import type { StorageInfo } from "@studio/shared";
import { StatusLine } from "../../components/AppChrome";
import type { Notice } from "../../components/types";
import { useTranslation } from "../../i18n";
import { SimplifyToggle } from "./components/SimplifyToggle";
import { useSystemSettings } from "./hooks/useSystemSettings";

type SystemSettingsTabProps = {
  storage: StorageInfo | null;
  onStorageSaved: (storage: StorageInfo) => void | Promise<void>;
  simplifyMode?: boolean;
  onSimplifyChange?: (enabled: boolean) => void;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function SystemSettingsTab({ storage, onStorageSaved, simplifyMode = true, onSimplifyChange, onNotice }: SystemSettingsTabProps) {
  const { t } = useTranslation();
  const { storagePath, setStoragePath, savingStorage, saveStorage } = useSystemSettings({
    storage,
    onStorageSaved,
    onNotice,
  });

  return (
    <div className="settings-grid">
      <section className="panel workspace-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{t("settings.workspaceTitle")}</p>
            <h2>{t("settings.simplifyTitle")}</h2>
          </div>
          <SimplifyToggle enabled={simplifyMode} onChange={(enabled) => onSimplifyChange?.(enabled)} />
        </div>
        <p className="storage-hint">{t("settings.simplifyDesc")}</p>
      </section>

      <section className="panel storage-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">{t("settings.localStorageTitle")}</p>
            <h2>{t("settings.contentDataFolder")}</h2>
          </div>
          <HardDrives size={22} />
        </div>
        <StatusLine label={t("common.status")} value={storage?.configured ? "Configured" : "Using project folder"} />
        <div className="storage-location">
          <span>{t("settings.contentDataFolder")}</span>
          <code>{storage?.channel_path ?? t("common.loading")}</code>
        </div>
        <form className="storage-form" onSubmit={(event) => void saveStorage(event)}>
          <label>
            {t("settings.storagePathLabel")}
            <input
              aria-label="Content storage folder"
              value={storagePath}
              onChange={(event) => setStoragePath(event.target.value)}
              placeholder="D:\Studio Data"
            />
          </label>
          <button className="primary-button" disabled={savingStorage || !storagePath.trim()}>
            {savingStorage ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
            <span>{t("settings.saveStorageLocation")}</span>
          </button>
        </form>
        <p className="storage-hint">{t("settings.storageHint")}</p>
      </section>
    </div>
  );
}
