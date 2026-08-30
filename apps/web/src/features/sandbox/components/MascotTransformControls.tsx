import { useTranslation } from "../../../i18n";

export interface MascotTransformControlsProps {
  mascotPosition: "bottom_left" | "bottom_right";
  setMascotPosition: (pos: "bottom_left" | "bottom_right") => void;
  mascotScale: number;
  setMascotScale: (scale: number | ((prev: number) => number)) => void;
  mascotOffsetX: number;
  setMascotOffsetX: (offset: number | ((prev: number) => number)) => void;
  mascotOffsetY: number;
  setMascotOffsetY: (offset: number | ((prev: number) => number)) => void;
  mascotFlipX: boolean;
  setMascotFlipX: (flipped: boolean | ((prev: boolean) => boolean)) => void;
  onResetDefaultPlacement?: () => void;
}

export function MascotTransformControls({
  mascotPosition,
  setMascotPosition,
  mascotScale,
  setMascotScale,
  mascotOffsetX,
  setMascotOffsetX,
  mascotOffsetY,
  setMascotOffsetY,
  mascotFlipX,
  setMascotFlipX,
  onResetDefaultPlacement,
}: MascotTransformControlsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Position & Anchor */}
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

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* Mascot Scale Slider & Presets (0.3x - 3.0x) */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <label
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: 0,
            }}
          >
            {t("visualSandbox.scaleDimensionsLabel")}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <input
              type="number"
              min={30}
              max={300}
              step={1}
              value={Math.round(mascotScale * 100)}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val)) setMascotScale(Math.max(0.3, Math.min(3.0, val / 100)));
              }}
              className="text-input compact"
              style={{ width: "56px", fontSize: "11px", padding: "2px 4px", textAlign: "right" }}
            />
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>%</span>
          </div>
        </div>

        {/* Scale Stepper Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", marginBottom: "6px" }}>
          <button
            type="button"
            className="quiet-button compact"
            style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
            onClick={() => setMascotScale((p) => Math.max(0.3, Math.round((p - 0.25) * 100) / 100))}
          >
            -25%
          </button>
          <button
            type="button"
            className="quiet-button compact"
            style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
            onClick={() => setMascotScale((p) => Math.max(0.3, Math.round((p - 0.05) * 100) / 100))}
          >
            -5%
          </button>
          <button
            type="button"
            className="quiet-button compact"
            style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
            onClick={() => setMascotScale((p) => Math.min(3.0, Math.round((p + 0.05) * 100) / 100))}
          >
            +5%
          </button>
          <button
            type="button"
            className="quiet-button compact"
            style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
            onClick={() => setMascotScale((p) => Math.min(3.0, Math.round((p + 0.25) * 100) / 100))}
          >
            +25%
          </button>
        </div>

        {/* Scale Range Slider */}
        <input
          type="range"
          min="0.3"
          max="3.0"
          step="0.01"
          value={mascotScale}
          onChange={(e) => setMascotScale(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--accent)" }}
        />

        {/* Quick Presets Row */}
        <div style={{ display: "flex", gap: "4px", marginTop: "6px", overflowX: "auto" }}>
          {[0.75, 1.0, 1.25, 1.5, 1.84, 2.0, 2.5].map((presetVal) => {
            const isActive = Math.abs(mascotScale - presetVal) < 0.02;
            return (
              <button
                key={presetVal}
                type="button"
                className={isActive ? "primary-button compact" : "quiet-button compact"}
                style={{ fontSize: "10px", padding: "2px 6px" }}
                onClick={() => setMascotScale(presetVal)}
              >
                {Math.round(presetVal * 100)}%
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--line)" }} />

      {/* Mascot Offset X & Y */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <label
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: 0,
            }}
          >
            {t("visualSandbox.offsetsTitleLabel")}
          </label>
          <div style={{ display: "flex", gap: "4px" }}>
            {onResetDefaultPlacement && (
              <button
                type="button"
                className="quiet-button compact"
                style={{ fontSize: "10.5px", padding: "2px 6px", color: "var(--accent)" }}
                onClick={onResetDefaultPlacement}
                title={t("visualSandbox.resetDefaultPlacementTitle")}
              >
                {t("visualSandbox.resetDefaultPlacement")}
              </button>
            )}
            <button
              type="button"
              className="quiet-button compact"
              style={{ fontSize: "10.5px", padding: "2px 6px" }}
              onClick={() => {
                setMascotOffsetX(0);
                setMascotOffsetY(0);
              }}
              title={t("visualSandbox.resetOffsetsTitle")}
            >
              Reset 0
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Axis X */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)" }}>
                {t("visualSandbox.axisXPrefix")}: {mascotOffsetX > 0 ? `+${mascotOffsetX}` : mascotOffsetX}px
              </span>
              <div style={{ display: "flex", gap: "2px" }}>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetX((p) => Math.max(-1000, p - 50))}
                >
                  -50
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetX((p) => Math.max(-1000, p - 10))}
                >
                  -10
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetX((p) => Math.min(1000, p + 10))}
                >
                  +10
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetX((p) => Math.min(1000, p + 50))}
                >
                  +50
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-1000"
              max="1000"
              step="5"
              value={mascotOffsetX}
              onChange={(e) => setMascotOffsetX(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>

          {/* Axis Y */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent)" }}>
                {t("visualSandbox.axisYPrefix")}: {mascotOffsetY > 0 ? `+${mascotOffsetY}` : mascotOffsetY}px
              </span>
              <div style={{ display: "flex", gap: "2px" }}>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetY((p) => Math.max(-1000, p - 50))}
                >
                  -50
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetY((p) => Math.max(-1000, p - 10))}
                >
                  -10
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetY((p) => Math.min(1000, p + 10))}
                >
                  +10
                </button>
                <button
                  type="button"
                  className="quiet-button compact"
                  style={{ fontSize: "10px", padding: "2px 4px" }}
                  onClick={() => setMascotOffsetY((p) => Math.min(1000, p + 50))}
                >
                  +50
                </button>
              </div>
            </div>
            <input
              type="range"
              min="-1000"
              max="1000"
              step="5"
              value={mascotOffsetY}
              onChange={(e) => setMascotOffsetY(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
