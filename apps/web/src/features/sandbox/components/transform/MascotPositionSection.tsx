import type { MascotRenderAspectRatio } from "@studio/shared";
import { useTranslation } from "../../../../i18n";

export interface MascotPositionSectionProps {
  mascotPosition: "bottom_left" | "bottom_right";
  setMascotPosition: (pos: "bottom_left" | "bottom_right") => void;
  mascotFlipX: boolean;
  setMascotFlipX: (flipped: boolean | ((prev: boolean) => boolean)) => void;
  aspectRatio?: MascotRenderAspectRatio;
}

export function MascotPositionSection({
  mascotPosition,
  setMascotPosition,
  mascotFlipX,
  setMascotFlipX,
  aspectRatio = "16:9",
}: MascotPositionSectionProps) {
  const { t } = useTranslation();
  const isWidescreen = aspectRatio === "16:9";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t("visualSandbox.mascotPositionSection")}
        </label>
        {isWidescreen && (
          <span
            style={{
              fontSize: "10px",
              color: "var(--muted)",
              fontWeight: 500,
            }}
          >
            Left Pillar (16:9)
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        <button
          type="button"
          className={mascotPosition === "bottom_left" ? "primary-button compact" : "quiet-button compact"}
          style={{ fontSize: "11px", padding: "6px", justifyContent: "center" }}
          onClick={() => setMascotPosition("bottom_left")}
        >
          {t("visualSandbox.posBottomLeft")}
        </button>
        <button
          type="button"
          className={!isWidescreen && mascotPosition === "bottom_right" ? "primary-button compact" : "quiet-button compact"}
          style={{
            fontSize: "11px",
            padding: "6px",
            justifyContent: "center",
            ...(isWidescreen ? { opacity: 0.45, cursor: "not-allowed" } : {}),
          }}
          onClick={() => {
            if (!isWidescreen) {
              setMascotPosition("bottom_right");
            }
          }}
          disabled={isWidescreen}
          title={isWidescreen ? "Locked to Left Brand Pillar in 16:9" : undefined}
          aria-disabled={isWidescreen ? "true" : undefined}
        >
          {t("visualSandbox.posBottomRight")}
        </button>
      </div>
      <button
        type="button"
        className={mascotFlipX ? "primary-button compact" : "quiet-button compact"}
        style={{ width: "100%", marginTop: "6px", fontSize: "11px", justifyContent: "center" }}
        onClick={() => setMascotFlipX((current) => !current)}
        aria-pressed={mascotFlipX}
      >
        {t("visualSandbox.flipDirection")}
      </button>
    </div>
  );
}
