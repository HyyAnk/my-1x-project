import { CheckCircle } from "@phosphor-icons/react";
import type { GreenScreenAuditItem } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { MascotAuditViolationItem } from "./MascotAuditViolationItem";

export interface MascotAuditViolationListProps {
  violations: GreenScreenAuditItem[];
  onOpenLightbox?: (imgUrl: string) => void;
}

export function MascotAuditViolationList({
  violations,
  onOpenLightbox,
}: MascotAuditViolationListProps) {
  const { t } = useTranslation();

  if (violations.length === 0) {
    return (
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
    );
  }

  return (
    <div className="audit-violations-section">
      <h4 className="audit-section-heading">
        {t("mascots.auditViolationsTableTitle") || "Detected Non-Compliant Assets"} (
        {violations.length})
      </h4>
      <div className="audit-violations-list" role="list">
        {violations.map((v, idx) => (
          <MascotAuditViolationItem
            key={`${v.targetType}-${v.styleId}-${v.slotIndex ?? 0}-${idx}`}
            item={v}
            onOpenLightbox={onOpenLightbox}
          />
        ))}
      </div>
    </div>
  );
}
