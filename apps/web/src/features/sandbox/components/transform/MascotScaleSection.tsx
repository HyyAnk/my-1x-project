import { useTranslation } from "../../../../i18n";

export interface MascotScaleSectionProps {
  mascotScale: number;
  setMascotScale: (scale: number | ((prev: number) => number)) => void;
}

export function MascotScaleSection({ mascotScale, setMascotScale }: MascotScaleSectionProps) {
  const { t } = useTranslation();

  return (
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px", marginTop: "6px" }}>
        {[0.6, 0.8, 1.0, 1.3, 1.6].map((preset) => (
          <button
            key={preset}
            type="button"
            className={Math.abs(mascotScale - preset) < 0.04 ? "primary-button compact" : "quiet-button compact"}
            style={{ fontSize: "10.5px", padding: "3px 0", justifyContent: "center" }}
            onClick={() => setMascotScale(preset)}
          >
            {Math.round(preset * 100)}%
          </button>
        ))}
      </div>
    </div>
  );
}
