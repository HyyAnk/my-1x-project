import { useState, useEffect } from "react";
import { X, Sparkle, Plus, CircleNotch } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";

export interface StyleCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, keyword: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function StyleCreateModal({ isOpen, onClose, onCreate, isSubmitting = false }: StyleCreateModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);

  const effectiveSubmitting = isSubmitting || isLocalSubmitting;

  useEffect(() => {
    if (isOpen) {
      setName("");
      setKeyword("");
      setValidationError(null);
      setIsLocalSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (effectiveSubmitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError(t("mascots.createStyleNameRequired") || "Style name is required");
      return;
    }
    setValidationError(null);
    setIsLocalSubmitting(true);
    try {
      await onCreate(trimmedName, keyword.trim());
    } finally {
      setIsLocalSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal style-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="style-modal-title"
        style={{ maxWidth: "540px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <div className="style-modal-title-group">
            <span className="style-modal-eyebrow">
              <Sparkle size={14} weight="fill" />
              <span>{t("mascots.createStyleModalEyebrow")}</span>
            </span>
            <h2 id="style-modal-title">{t("mascots.createStyleModalTitle")}</h2>
          </div>
          <button type="button" className="icon-button" aria-label={t("common.close")} onClick={onClose} disabled={effectiveSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <p className="style-modal-intro">{t("mascots.createStyleModalIntro")}</p>

            <div className="form-group">
              <label htmlFor="style-name-input">
                {t("mascots.createStyleNameLabel")} <span className="required-star">*</span>
              </label>
              <input
                id="style-name-input"
                type="text"
                className="full-prompt-input"
                placeholder={t("mascots.createStyleNamePlaceholder")}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                disabled={effectiveSubmitting}
                autoFocus
              />
              {validationError ? <span className="form-field-error">{validationError}</span> : null}
            </div>

            <div className="form-group">
              <label htmlFor="style-keyword-input">{t("mascots.createStyleKeywordLabel")}</label>
              <textarea
                id="style-keyword-input"
                className="full-prompt-textarea"
                rows={3}
                placeholder={t("mascots.createStyleKeywordPlaceholder")}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={effectiveSubmitting}
                style={{ width: "100%", fontSize: "13px", resize: "vertical" }}
              />
              <span className="form-field-hint">{t("mascots.createStyleKeywordHint")}</span>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" className="quiet-button" onClick={onClose} disabled={effectiveSubmitting}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="primary-button" disabled={effectiveSubmitting || !name.trim()}>
              {effectiveSubmitting ? (
                <>
                  <CircleNotch size={16} className="spin" />
                  <span>{t("mascots.createStyleCreatingBtn")}</span>
                </>
              ) : (
                <>
                  <Plus size={16} weight="bold" />
                  <span>{t("mascots.createStyleSubmitBtn")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
