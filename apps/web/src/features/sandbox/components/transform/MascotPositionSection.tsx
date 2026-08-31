import { useTranslation } from "../../../../i18n";

export interface MascotPositionSectionProps {
  mascotPosition: "bottom_left" | "bottom_right";
  setMascotPosition: (pos: "bottom_left" | "bottom_right") => void;
  mascotFlipX: boolean;
  setMascotFlipX: (flipped: boolean | ((prev: boolean) => boolean)) => void;
}

export function MascotPositionSection({ mascotPosition, setMascotPosition, mascotFlipX, setMascotFlipX }: MascotPositionSectionProps) {
  const { t } = useTranslation();

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "11px",
          fontWeight: 700,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "6px",
        }}
      >
        {t("visualSandbox.mascotPositionSection")}
      </label>
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
          className={mascotPosition === "bottom_right" ? "primary-button compact" : "quiet-button compact"}
          style={{ fontSize: "11px", padding: "6px", justifyContent: "center" }}
          onClick={() => setMascotPosition("bottom_right")}
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
