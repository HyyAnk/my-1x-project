import { useState } from "react";
import { Trash, Warning, X } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";

export interface QuestionBankClearAllModalProps {
  clearing: boolean;
  totalCount: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function QuestionBankClearAllModal({
  clearing,
  totalCount,
  onConfirm,
  onClose,
}: QuestionBankClearAllModalProps) {
  const { t } = useTranslation();
  const [confirmationInput, setConfirmationInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmationInput.trim() === "Yes";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || clearing) return;

    try {
      setError(null);
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear Question Bank");
    }
  };

  return (
    <div className="qb-modal-backdrop" onClick={onClose}>
      <div className="qb-modal-card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="qb-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--danger, #ef4444)" }}>
            <Warning size={22} weight="fill" />
            <h2 className="qb-modal-title">{t("questionBank.clearModal.title")}</h2>
          </div>
          <button
            type="button"
            className="qb-modal-close"
            onClick={onClose}
            title={t("questionBank.clearModal.cancelBtn")}
            disabled={clearing}
          >
            <X size={18} />
          </button>
        </div>

        <form className="qb-modal-body" onSubmit={handleSubmit}>
          {error && <div className="qb-modal-error">{error}</div>}

          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "var(--text-primary, #f1f5f9)",
              fontSize: "13px",
              lineHeight: 1.5,
              marginBottom: "16px",
            }}
          >
            <p style={{ margin: 0, fontWeight: 500 }}>
              {t("questionBank.clearModal.warning")}
            </p>
            {totalCount > 0 && (
              <p style={{ margin: "6px 0 0", color: "#f87171", fontSize: "12px" }}>
                Current questions in bank: <strong>{totalCount}</strong>
              </p>
            )}
          </div>

          <div className="qb-form-group">
            <label className="qb-label" htmlFor="qb-clear-confirm-input">
              {t("questionBank.clearModal.confirmPrompt")}
            </label>
            <input
              id="qb-clear-confirm-input"
              type="text"
              className="qb-input"
              placeholder={t("questionBank.clearModal.placeholder")}
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              disabled={clearing}
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="qb-modal-footer" style={{ marginTop: "20px" }}>
            <button
              type="button"
              className="qb-btn qb-btn-secondary"
              onClick={onClose}
              disabled={clearing}
            >
              {t("questionBank.clearModal.cancelBtn")}
            </button>
            <button
              type="submit"
              className="qb-btn qb-btn-danger"
              disabled={!isConfirmed || clearing}
              style={{
                opacity: !isConfirmed || clearing ? 0.5 : 1,
                cursor: !isConfirmed || clearing ? "not-allowed" : "pointer",
                background: "#dc2626",
                borderColor: "#b91c1c",
                color: "#ffffff",
              }}
            >
              <Trash size={15} weight="bold" />
              <span>
                {clearing
                  ? t("questionBank.clearModal.clearingBtn")
                  : t("questionBank.clearModal.confirmBtn")}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
