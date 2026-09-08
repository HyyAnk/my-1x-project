import { SlidersHorizontal, UploadSimple, X } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";

export interface PresetManagerHeaderProps {
  onOpenImport: () => void;
  onClose: () => void;
}

export function PresetManagerHeader({ onOpenImport, onClose }: PresetManagerHeaderProps) {
  const { t } = useTranslation();

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: "17px", display: "flex", alignItems: "center", gap: "8px" }}>
          <SlidersHorizontal size={20} weight="bold" />
          <span>{t("visualSandbox.modalPresetManagerTitle")}</span>
        </h3>
        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>{t("visualSandbox.modalPresetManagerDesc")}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          type="button"
          className="primary-button compact"
          onClick={onOpenImport}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <UploadSimple size={15} weight="bold" />
          <span>{t("visualSandbox.importStyleBtn")}</span>
        </button>
        <button type="button" className="icon-button" onClick={onClose} title={t("common.close")}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
