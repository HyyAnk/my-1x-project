import { useEffect } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  Warning,
  ArrowsClockwise,
  Wrench,
  CircleNotch,
  ImageSquare,
} from "@phosphor-icons/react";
import type {
  MascotGreenScreenAuditResponse,
  MascotGreenScreenAuditStatusResponse,
  GreenScreenAuditItem,
} from "@studio/shared";
import { useTranslation } from "../../../i18n";

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
  const totalChecked = summary?.totalChecked ?? 0;
  const compliantCount = summary?.compliantCount ?? 0;
  const violationCount = summary?.violationCount ?? 0;
  const missingRawCount = summary?.missingRawCount ?? 0;
  const transparencyCount = summary?.transparencyCount ?? 0;
  const insufficientChromaCount = summary?.insufficientChromaCount ?? 0;

  const effectiveRepairing = isRepairing || Boolean(auditStatus?.isRepairing);

  const getViolationBadgeInfo = (item: GreenScreenAuditItem) => {
    switch (item.violationReason) {
      case "has_transparency":
        return {
          label: t("mascots.auditTransparencyCount") || "Transparency Leak",
          className: "is-transparency",
          title: t("mascots.auditReasonHasTransparency") || "Pre-matted transparency leak",
        };
      case "missing_raw":
        return {
          label: t("mascots.auditMissingRawCount") || "Missing Raw File",
          className: "is-missing-raw",
          title: t("mascots.auditReasonMissingRaw") || "Missing raw master file on disk",
        };
      case "insufficient_green_chroma":
        return {
          label: t("mascots.auditInsufficientChromaCount") || "Non-Green Backdrop",
          className: "is-chroma",
          title: t("mascots.auditReasonInsufficientChroma") || "Backdrop is not chroma-key green",
        };
      case "corrupted_file":
        return {
          label: t("mascots.auditCorruptedFileCount") || "Corrupted File",
          className: "is-corrupted",
          title: t("mascots.auditReasonCorruptedFile") || "Corrupted or unreadable image",
        };
      default:
        return {
          label: t("mascots.auditViolationBadge") || "Violation",
          className: "is-chroma",
          title: "Non-compliant asset",
        };
    }
  };

  const formatTargetLabel = (item: GreenScreenAuditItem) => {
    if (item.targetType === "style_anchor") {
      return (
        t("mascots.auditTargetStyleAnchor", { styleName: item.styleName }) ||
        `Style Anchor: ${item.styleName}`
      );
    }
    const stateLabel = item.state === "thinking" ? "Thinking" : "Celebrate";
    return (
      t("mascots.auditTargetSlot", {
        slotIndex: item.slotIndex ?? 1,
        state: stateLabel,
        styleName: item.styleName,
      }) || `Slot #${item.slotIndex} (${stateLabel}) · ${item.styleName}`
    );
  };

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
            <div className="form-field-error" style={{ padding: "8px 12px", background: "rgba(239, 68, 68, 0.15)", borderRadius: "6px" }}>
              <WarningCircle size={16} />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Summary Metrics */}
          {auditResult ? (
            <>
              <div className="mascot-audit-metrics">
                <div className="audit-metric-card">
                  <span className="audit-metric-label">
                    {t("mascots.auditTotalChecked") || "Total Checked"}
                  </span>
                  <span className="audit-metric-value">{totalChecked}</span>
                </div>
                <div className="audit-metric-card is-compliant">
                  <span className="audit-metric-label">
                    {t("mascots.auditCompliantCount") || "Compliant"}
                  </span>
                  <span className="audit-metric-value">{compliantCount}</span>
                </div>
                <div
                  className={`audit-metric-card ${
                    violationCount > 0 ? "has-active-violations" : "is-violations"
                  }`}
                >
                  <span className="audit-metric-label">
                    {t("mascots.auditViolationsCount") || "Violations"}
                  </span>
                  <span className="audit-metric-value">{violationCount}</span>
                </div>
              </div>

              {/* Breakdown Chips */}
              <div className="audit-breakdown-row">
                <div className="audit-breakdown-chip">
                  <span>{t("mascots.auditMissingRawCount") || "Missing Raw"}:</span>
                  <span
                    className={`audit-chip-count ${missingRawCount > 0 ? "is-warning" : ""}`}
                  >
                    {missingRawCount}
                  </span>
                </div>
                <div className="audit-breakdown-chip">
                  <span>{t("mascots.auditTransparencyCount") || "Transparency Leaks"}:</span>
                  <span
                    className={`audit-chip-count ${transparencyCount > 0 ? "is-danger" : ""}`}
                  >
                    {transparencyCount}
                  </span>
                </div>
                <div className="audit-breakdown-chip">
                  <span>{t("mascots.auditInsufficientChromaCount") || "Non-Green Backdrop"}:</span>
                  <span
                    className={`audit-chip-count ${
                      insufficientChromaCount > 0 ? "is-warning" : ""
                    }`}
                  >
                    {insufficientChromaCount}
                  </span>
                </div>
              </div>
            </>
          ) : isScanning ? (
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
            violations.length === 0 ? (
              <div className="audit-empty-compliant">
                <CheckCircle size={40} weight="fill" className="audit-empty-icon" />
                <h3 className="audit-empty-title">
                  {t("mascots.auditNoViolationsTitle") || "All Assets Compliant"}
                </h3>
                <p className="audit-empty-desc">
                  {t("mascots.auditNoViolationsDesc") ||
                    "All style concept anchors and pose slots possess genuine, opaque chroma-key green (#00FF00) backgrounds."}
                </p>
              </div>
            ) : (
              <div className="audit-violations-section">
                <h4 className="audit-section-heading">
                  {t("mascots.auditViolationsTableTitle") || "Detected Non-Compliant Assets"} (
                  {violations.length})
                </h4>
                <div className="audit-violations-list" role="list">
                  {violations.map((v, idx) => {
                    const badge = getViolationBadgeInfo(v);
                    const previewImg = v.rawImageUrl || v.imageUrl;

                    return (
                      <div
                        key={`${v.targetType}-${v.styleId}-${v.slotIndex ?? 0}-${idx}`}
                        className="audit-violation-row"
                        role="listitem"
                      >
                        <div className="audit-violation-left">
                          <button
                            type="button"
                            className="audit-thumbnail-wrap"
                            onClick={() => {
                              if (previewImg && onOpenLightbox) {
                                onOpenLightbox(previewImg);
                              }
                            }}
                            disabled={!previewImg}
                            title={previewImg ? "Click to inspect full image" : "No preview available"}
                            aria-label={`Preview for ${formatTargetLabel(v)}`}
                          >
                            {previewImg ? (
                              <img
                                src={previewImg}
                                alt={formatTargetLabel(v)}
                                className="audit-thumbnail-img"
                              />
                            ) : (
                              <ImageSquare size={20} className="audit-thumbnail-fallback" />
                            )}
                          </button>

                          <div className="audit-violation-meta">
                            <span className="audit-target-title">{formatTargetLabel(v)}</span>
                            <span className="audit-target-sub">
                              {v.details || badge.title}
                              {typeof v.greenRatio === "number"
                                ? ` · ${(v.greenRatio * 100).toFixed(1)}% green`
                                : ""}
                            </span>
                          </div>
                        </div>

                        <div className="audit-violation-right">
                          <span
                            className={`violation-badge ${badge.className}`}
                            title={badge.title}
                          >
                            <Warning size={12} weight="bold" />
                            <span>{badge.label}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="mascot-audit-footer">
          <div className="mascot-audit-footer-left">
            <button
              type="button"
              className="quiet-button"
              onClick={() => void onScan()}
              disabled={isScanning || effectiveRepairing}
            >
              {isScanning ? (
                <>
                  <CircleNotch size={14} className="spin" />
                  <span>{t("mascots.auditScanningBtn") || "Scanning…"}</span>
                </>
              ) : (
                <>
                  <ArrowsClockwise size={14} />
                  <span>{t("mascots.auditScanBtn") || "Scan Again"}</span>
                </>
              )}
            </button>
          </div>

          <div className="mascot-audit-footer-right">
            <button
              type="button"
              className="quiet-button"
              onClick={onClose}
              disabled={isScanning}
            >
              {t("common.close") || "Close"}
            </button>

            {violations.length > 0 ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => void onRepair()}
                disabled={isScanning || effectiveRepairing}
              >
                {effectiveRepairing ? (
                  <>
                    <CircleNotch size={15} className="spin" />
                    <span>{t("mascots.auditFixingBtn") || "Fixing Violations…"}</span>
                  </>
                ) : (
                  <>
                    <Wrench size={15} weight="bold" />
                    <span>{t("mascots.auditFixAllBtn") || "Fix All Violations"}</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
