import type { CSSProperties } from "react";
import { getMascotStyleReadiness, type MascotStyle } from "@studio/shared";

export const KEYWORD_BADGE_STYLE: CSSProperties = {
  marginLeft: 8,
  fontSize: "0.75rem",
  padding: "1px 6px",
  borderRadius: 4,
  background: "rgba(255, 255, 255, 0.12)",
  color: "inherit",
};

export function computeDisplayValue(
  hasNoMascot: boolean,
  isMascotDisabled: boolean,
  currentStyleId: string | null,
  styles: MascotStyle[],
): string {
  if (hasNoMascot) return "No Mascot";
  if (isMascotDisabled) return "Disabled";
  if (currentStyleId === "cycle" || currentStyleId === "all") return "Cycle All Styles";
  if (currentStyleId && currentStyleId !== "core" && currentStyleId !== "default") {
    const matched = styles.find((s) => s.id === currentStyleId);
    if (matched) {
      return matched.is_default ? `${matched.name} (Default)` : matched.name;
    }
    return currentStyleId;
  }
  const defaultStyle = styles.find((s) => s.is_default);
  if (defaultStyle && defaultStyle.id !== "core") {
    return `${defaultStyle.name} (Default)`;
  }
  return "Core Style (Default)";
}

export function getStyleReadinessLabel(style: MascotStyle | null): string | null {
  if (!style) return null;
  const readiness = getMascotStyleReadiness(style);
  const thinkingCount = (style.states?.thinking || []).filter((v) => Boolean(v.image_url?.trim())).length;
  const celebrateCount = (style.states?.celebrate || []).filter((v) => Boolean(v.image_url?.trim())).length;
  const total = thinkingCount + celebrateCount;

  if (readiness === "fully_expressive") {
    return `${total} Poses`;
  }
  if (readiness === "concept_locked") {
    return total > 0 ? `${total} Poses` : "Concept Locked";
  }
  return null;
}

export function resolveStyleThumbnail(
  style: MascotStyle | null,
  isCore: boolean,
  hasMascotId: boolean,
  masterImageUrl?: string | null,
): string | null {
  if (style?.anchor_image_url?.trim()) {
    return style.anchor_image_url.trim();
  }
  if (isCore && hasMascotId) {
    return masterImageUrl?.trim() || null;
  }
  return null;
}

export function createFallbackCoreStyle(masterImageUrl?: string | null, createdAt = "", updatedAt = ""): MascotStyle {
  return {
    id: "core",
    name: "Core Style",
    keyword: "",
    anchor_image_url: masterImageUrl || null,
    is_default: true,
    states: {
      thinking: [],
      celebrate: [],
    },
    created_at: createdAt,
    updated_at: updatedAt,
  };
}
