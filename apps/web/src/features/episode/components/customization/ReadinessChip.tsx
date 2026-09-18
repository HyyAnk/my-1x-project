import { getMascotStyleReadiness, type MascotStyle } from "@studio/shared";
import { getStyleReadinessLabel } from "../../utils/mascotDropdownHelpers";

export interface ReadinessChipProps {
  style: MascotStyle | null;
}

export function ReadinessChip({ style }: ReadinessChipProps) {
  const readinessText = getStyleReadinessLabel(style);
  if (!readinessText || !style) return null;

  const readiness = getMascotStyleReadiness(style);
  const isFully = readiness === "fully_expressive";

  return (
    <span
      className={`mascot-style-readiness-chip ${isFully ? "is-fully-expressive" : "is-concept-locked"}`}
      style={{
        marginLeft: 8,
        fontSize: "0.72rem",
        padding: "1px 6px",
        borderRadius: 4,
        background: isFully ? "rgba(34, 197, 94, 0.15)" : "rgba(59, 130, 246, 0.15)",
        color: isFully ? "#4ade80" : "#60a5fa",
        border: isFully ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(59, 130, 246, 0.3)",
        fontWeight: 600,
      }}
    >
      {readinessText}
    </span>
  );
}
