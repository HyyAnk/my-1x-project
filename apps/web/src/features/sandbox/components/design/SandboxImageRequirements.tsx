import { useState } from "react";
import { Info } from "@phosphor-icons/react";
import type { ImageFit, ImageSizingRecommendation } from "@studio/shared";

export interface SandboxImageRequirementItem {
  role: "hero" | "choice";
  label: string;
  aspectRatio: string;
  recommended: { width: number; height: number };
  fit?: ImageFit;
  providerPayload?: {
    width: number;
    height: number;
    aspectRatio?: string;
  } | null;
  actual?: {
    width: number;
    height: number;
  } | null;
}

export type SandboxRecommendationLike = {
  aspectRatio: string;
  recommended: { width: number; height: number };
  fit?: ImageFit;
  geometry?: {
    viewports?: readonly { fit?: ImageFit }[];
  };
  [key: string]: unknown;
};

export interface SandboxImageRequirementsProps {
  requirements?: SandboxImageRequirementItem[] | null;
  recommendation?: ImageSizingRecommendation | SandboxRecommendationLike | null;
  role?: "hero" | "choice";
  label?: string;
  providerPayload?: {
    width: number;
    height: number;
    aspectRatio?: string;
  } | null;
  actual?: {
    width: number;
    height: number;
  } | null;
}

export function SandboxImageRequirements({
  requirements,
  recommendation,
  role = "hero",
  label,
  providerPayload,
  actual,
}: SandboxImageRequirementsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const items: SandboxImageRequirementItem[] = [];

  if (requirements && requirements.length > 0) {
    items.push(...requirements);
  } else if (recommendation) {
    const derivedFit: ImageFit | undefined =
      "geometry" in recommendation && recommendation.geometry?.viewports?.[0]?.fit
        ? recommendation.geometry.viewports[0].fit
        : "fit" in recommendation && typeof (recommendation as SandboxRecommendationLike).fit === "string"
          ? (recommendation as SandboxRecommendationLike).fit
          : undefined;

    items.push({
      role,
      label: label ?? (role === "choice" ? "Choices" : "Hero Media"),
      aspectRatio: recommendation.aspectRatio,
      recommended: recommendation.recommended,
      fit: derivedFit,
      providerPayload,
      actual,
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="sandbox-layout-media-spec"
      style={{
        marginTop: "6px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          alignItems: "center",
        }}
      >
        {items.map((item, idx) => {
          const isHero = item.role === "hero";
          const themeColor = isHero ? "#38bdf8" : "#10b981";
          const bgColor = isHero ? "rgba(56, 189, 248, 0.12)" : "rgba(16, 185, 129, 0.12)";
          const borderColor = isHero ? "rgba(56, 189, 248, 0.25)" : "rgba(16, 185, 129, 0.25)";

          return (
            <span
              key={`${item.role}-${idx}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "6px",
                background: bgColor,
                color: themeColor,
                border: `1px solid ${borderColor}`,
              }}
            >
              {item.label}: {item.aspectRatio} ({item.recommended.width}×{item.recommended.height}px)
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-label="Toggle image sizing details"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "3px 6px",
            fontSize: "10px",
            fontWeight: 500,
            borderRadius: "6px",
            border: "1px solid var(--border, rgba(255, 255, 255, 0.12))",
            background: isExpanded ? "var(--soft-accent, rgba(56, 189, 248, 0.15))" : "transparent",
            color: "var(--muted, #94a3b8)",
            cursor: "pointer",
            gap: "3px",
            lineHeight: 1,
          }}
        >
          <Info size={13} weight="bold" />
          <span>Details</span>
        </button>
      </div>

      {isExpanded && (
        <div
          data-testid="sandbox-media-spec-details"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: "8px 10px",
            borderRadius: "8px",
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: "11px",
            color: "var(--text, #e2e8f0)",
          }}
        >
          {items.map((item, idx) => (
            <div
              key={`detail-${item.role}-${idx}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                paddingBottom: idx < items.length - 1 ? "4px" : "0",
                borderBottom: idx < items.length - 1 ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
              }}
            >
              <div style={{ fontWeight: 600, color: item.role === "hero" ? "#38bdf8" : "#10b981" }}>{item.label}</div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", color: "var(--muted, #94a3b8)" }}>
                <span>
                  Target Ratio: <strong style={{ color: "#f8fafc" }}>{item.aspectRatio}</strong>
                </span>
                <span>
                  Recommended:{" "}
                  <strong style={{ color: "#f8fafc" }}>
                    {item.recommended.width}×{item.recommended.height}px
                  </strong>
                </span>
                {item.fit && (
                  <span>
                    Fit: <strong style={{ color: "#f8fafc" }}>{item.fit}</strong>
                  </span>
                )}
                {item.providerPayload && (
                  <span>
                    Provider Request:{" "}
                    <strong style={{ color: "#f8fafc" }}>
                      {item.providerPayload.width}×{item.providerPayload.height}px
                    </strong>
                    {item.providerPayload.aspectRatio ? ` (${item.providerPayload.aspectRatio})` : ""}
                  </span>
                )}
                {item.actual && (
                  <span>
                    Actual Output:{" "}
                    <strong style={{ color: "#f8fafc" }}>
                      {item.actual.width}×{item.actual.height}px
                    </strong>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
