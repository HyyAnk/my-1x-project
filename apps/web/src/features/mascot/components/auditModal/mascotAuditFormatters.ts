import type { GreenScreenAuditItem } from "@studio/shared";

export type TranslationFn = (key: string, options?: Record<string, string | number>) => string;

export interface ViolationBadgeInfo {
  label: string;
  className: string;
  title: string;
}

export function getViolationBadgeInfo(
  item: GreenScreenAuditItem,
  t: TranslationFn,
): ViolationBadgeInfo {
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
}

export function formatTargetLabel(
  item: GreenScreenAuditItem,
  t: TranslationFn,
): string {
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
}
