import { ArrowsClockwise, CircleNotch, Wrench } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";

export interface MascotAuditFooterProps {
  isScanning: boolean;
  effectiveRepairing: boolean;
  hasViolations: boolean;
  onScan: () => void | Promise<void>;
  onRepair: () => void | Promise<void>;
  onClose: () => void;
}

export function MascotAuditFooter({
  isScanning,
  effectiveRepairing,
  hasViolations,
  onScan,
  onRepair,
  onClose,
}: MascotAuditFooterProps) {
  const { t } = useTranslation();

  return (
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

        {hasViolations ? (
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
  );
}
