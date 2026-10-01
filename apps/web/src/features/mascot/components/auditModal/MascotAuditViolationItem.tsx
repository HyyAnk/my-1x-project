import { ImageSquare, Warning } from "@phosphor-icons/react";
import type { GreenScreenAuditItem } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { formatTargetLabel, getViolationBadgeInfo } from "./mascotAuditFormatters";

export interface MascotAuditViolationItemProps {
  item: GreenScreenAuditItem;
  onOpenLightbox?: (imgUrl: string) => void;
}

export function MascotAuditViolationItem({
  item,
  onOpenLightbox,
}: MascotAuditViolationItemProps) {
  const { t } = useTranslation();
  const badge = getViolationBadgeInfo(item, t);
  const targetLabel = formatTargetLabel(item, t);
  const previewImg = item.rawImageUrl || item.imageUrl;

  return (
    <div className="audit-violation-row" role="listitem">
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
          aria-label={`Preview for ${targetLabel}`}
        >
          {previewImg ? (
            <img
              src={previewImg}
              alt={targetLabel}
              className="audit-thumbnail-img"
            />
          ) : (
            <ImageSquare size={20} className="audit-thumbnail-fallback" />
          )}
        </button>

        <div className="audit-violation-meta">
          <span className="audit-target-title">{targetLabel}</span>
          <span className="audit-target-sub">
            {item.details || badge.title}
            {typeof item.greenRatio === "number"
              ? ` · ${(item.greenRatio * 100).toFixed(1)}% green`
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
}
