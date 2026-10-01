import { useEffect } from "react";
import {
  CircleNotch,
  ShieldCheck,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type {
  MascotGreenScreenAuditResponse,
  MascotGreenScreenAuditStatusResponse,
} from "@studio/shared";
import { useTranslation } from "../../../i18n";
import {
  MascotAuditFooter,
  MascotAuditSummaryGrid,
  MascotAuditViolationList,
} from "./auditModal";

export interface MascotGreenScreenAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  mascotName?: string;
  auditResult: MascotGreenScreenAuditResponse | null;
  auditStatus: MascotGreenScreenAuditStatusResponse | null;
  isScanning: boolean;
  isRepairing: boolean;
  error?: string | null;
  onScan: () => void | Promise<void>;
  onRepair: () => void | Promise<void>;
  onOpenLightbox?: (imgUrl: string) => void;
}

export function MascotGreenScreenAuditModal({
  isOpen,
  onClose,
  mascotName,
  auditResult,
  auditStatus,
  isScanning,
  isRepairing,
  error,
  onScan,
  onRepair,
  onOpenLightbox,
}: MascotGreenScreenAuditModalProps) {
  const { t } = useTranslation();

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const summary = auditResult?.summary;
  const violations = auditResult?.violations ?? [];
  const effectiveRepairing = isRepairing || Boolean(auditStatus?.isRepairing);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
      data-testid="mascot-audit-backdrop"
    >
      <section
        className="modal mascot-audit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mascot-audit-modal-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="mascot-audit-modal"
      >
        {/* Header */}
        <div className="mascot-audit-header">
          <div>
            <span className="mascot-audit-eyebrow">
              <ShieldCheck size={14} weight="bold" />
              <span>{t("mascots.auditModalEyebrow") || "VFX & Compositing Diagnostics"}</span>
            </span>
            <h2 id="mascot-audit-modal-title" className="mascot-audit-title">
              {t("mascots.auditModalTitle") || "Chroma-Key Green Screen Audit"}
              {mascotName ? ` · ${mascotName}` : ""}
            </h2>
            <p className="mascot-audit-subtitle">
              {t("mascots.auditModalSubtitle") ||
                "Inspect expressive pose slots (Thinking and Celebrate states) for authentic green screen (#00FF00) background compliance."}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={t("common.close") || "Close"}
            onClick={onClose}
            data-testid="mascot-audit-close-button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="mascot-audit-content">
          {/* Repair In-Progress Alert */}
          {effectiveRepairing ? (
            <div className="mascot-audit-repair-banner" role="status">
              <CircleNotch size={18} className="spin" />
              <span>
                {t("mascots.auditActiveRepairWarning") ||
                  "Regeneration jobs are currently running in the background. Slots will update automatically upon completion."}
              </span>
            </div>
          ) : null}

          {/* Error Message */}
          {error ? (
            <div
              className="form-field-error"
              style={{
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.15)",
                borderRadius: "6px",
              }}
            >
              <WarningCircle size={16} />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Summary Metrics & Breakdown Chips */}
          {auditResult ? <MascotAuditSummaryGrid summary={summary} /> : null}

          {/* Scanning Spinner */}
          {isScanning ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "32px 0",
                gap: "12px",
              }}
            >
              <CircleNotch size={28} className="spin" style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                {t("mascots.auditScanningBtn") || "Scanning…"}
              </span>
            </div>
          ) : null}

          {/* Violations List or Compliant Empty State */}
          {auditResult ? (
            <MascotAuditViolationList
              violations={violations}
              onOpenLightbox={onOpenLightbox}
            />
          ) : null}
        </div>

        {/* Modal Footer Actions */}
        <MascotAuditFooter
          isScanning={isScanning}
          effectiveRepairing={effectiveRepairing}
          hasViolations={violations.length > 0}
          onScan={onScan}
          onRepair={onRepair}
          onClose={onClose}
        />
      </section>
    </div>
  );
}
