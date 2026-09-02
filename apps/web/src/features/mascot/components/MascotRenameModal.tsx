import { useState, useEffect } from "react";
import { CircleNotch, FloppyDisk, X } from "@phosphor-icons/react";
import type { MascotProfile } from "@studio/shared";
import { useTranslation } from "../../../i18n";

export interface MascotRenameModalProps {
  isOpen: boolean;
  mascot: MascotProfile | null;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
  renaming: boolean;
}

export function MascotRenameModal({ isOpen, mascot, onClose, onRename, renaming }: MascotRenameModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");

  useEffect(() => {
    if (mascot) {
      setName(mascot.name);
    }
  }, [mascot]);

  if (!isOpen || !mascot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed === mascot.name) {
      onClose();
      return;
    }
    await onRename(trimmed);
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-mascot-title"
        style={{ maxWidth: "460px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t("mascots.renameEyebrow")}</p>
            <h2 id="rename-mascot-title">{t("mascots.renameTitle", { name: mascot.name })}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={t("common.close")}
            onClick={onClose}
            disabled={renaming}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: "16px" }}>
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label htmlFor="mascot-rename-input">
              {t("mascots.nameLabel")} <span style={{ color: "var(--coral)" }}>*</span>
            </label>
            <input
              id="mascot-rename-input"
              type="text"
              className="identity-name-input"
              style={{ width: "100%", marginTop: "6px" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("mascots.namePlaceholder")}
              autoFocus
              disabled={renaming}
            />
          </div>

          <p className="modal-copy" style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "20px" }}>
            {t("mascots.renameModalDesc")}
          </p>

          <div className="modal-actions">
            <button type="button" className="quiet-button" onClick={onClose} disabled={renaming}>
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={renaming || !name.trim()}
            >
              {renaming ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
              <span>{renaming ? t("mascots.renamingBtn") : t("mascots.renameConfirmBtn")}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
