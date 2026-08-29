import { FloppyDisk, X } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";

export interface SandboxPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetName: string;
  onChangePresetName: (name: string) => void;
  onSave: () => void;
}

export function SandboxPresetModal({ isOpen, onClose, presetName, onChangePresetName, onSave }: SandboxPresetModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div className="panel" style={{ width: "420px", padding: "24px", borderRadius: "16px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <FloppyDisk size={18} weight="bold" />
            <span>{t("visualSandbox.modalSavePresetTitle")}</span>
          </h3>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>{t("visualSandbox.modalSavePresetDesc")}</p>

        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
            {t("visualSandbox.presetNameLabel")}
          </label>
          <input
            type="text"
            className="text-input"
            value={presetName}
            onChange={(e) => onChangePresetName(e.target.value)}
            placeholder={t("visualSandbox.presetNamePlaceholder")}
            style={{ width: "100%" }}
            autoFocus
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button type="button" className="quiet-button" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="button" className="primary-button" disabled={!presetName.trim()} onClick={onSave}>
            <FloppyDisk size={16} />
            <span>{t("visualSandbox.savePresetBtn")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
