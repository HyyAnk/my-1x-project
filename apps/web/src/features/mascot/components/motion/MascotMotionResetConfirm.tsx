import { useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";

export interface MascotMotionResetConfirmProps {
  onResetDefaultMotions: () => void;
}

export function MascotMotionResetConfirm({ onResetDefaultMotions }: MascotMotionResetConfirmProps) {
  const { t } = useTranslation();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleConfirmReset = () => {
    onResetDefaultMotions();
    setShowResetConfirm(false);
  };

  return (
    <div className="motion-batch-actions" style={{ marginTop: "4px" }}>
      {!showResetConfirm ? (
        <button
          type="button"
          className="quiet-button compact"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => setShowResetConfirm(true)}
          title={t("mascots.resetDefaultMotionsTooltip")}
        >
          <ArrowCounterClockwise size={13} />
          <span>{t("mascots.resetDefaultMotionsBtn")}</span>
        </button>
      ) : (
        <div
          className="motion-reset-confirm-box"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            padding: "6px 10px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <span style={{ fontSize: "11.5px", color: "var(--ink-secondary)" }}>{t("mascots.resetConfirmPrompt")}</span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              className="quiet-button compact"
              style={{ fontSize: "11px", padding: "3px 8px" }}
              onClick={() => setShowResetConfirm(false)}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className="primary-button compact"
              style={{
                fontSize: "11px",
                padding: "3px 10px",
                backgroundColor: "#ef4444",
                color: "#fff",
                borderColor: "#ef4444",
              }}
              onClick={handleConfirmReset}
            >
              {t("mascots.confirmResetBtn")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
