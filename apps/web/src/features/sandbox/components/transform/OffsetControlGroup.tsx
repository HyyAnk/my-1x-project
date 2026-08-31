export interface OffsetControlGroupProps {
  label: string;
  value: number;
  onChange: (offset: number | ((prev: number) => number)) => void;
}

export function OffsetControlGroup({ label, value, onChange }: OffsetControlGroupProps) {
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
          {label}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <input
            type="number"
            min={-500}
            max={500}
            step={1}
            value={value}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (!isNaN(val)) onChange(Math.max(-500, Math.min(500, val)));
            }}
            className="text-input compact"
            style={{ width: "56px", fontSize: "11px", padding: "2px 4px", textAlign: "right" }}
          />
          <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>px</span>
        </div>
      </div>

      {/* Stepper Buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px", marginBottom: "6px" }}>
        <button
          type="button"
          className="quiet-button compact"
          style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
          onClick={() => onChange((p) => Math.max(-500, p - 50))}
        >
          -50
        </button>
        <button
          type="button"
          className="quiet-button compact"
          style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
          onClick={() => onChange((p) => Math.max(-500, p - 10))}
        >
          -10
        </button>
        <button
          type="button"
          className="quiet-button compact"
          style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
          onClick={() => onChange((p) => Math.min(500, p + 10))}
        >
          +10
        </button>
        <button
          type="button"
          className="quiet-button compact"
          style={{ fontSize: "10.5px", padding: "3px 4px", justifyContent: "center" }}
          onClick={() => onChange((p) => Math.min(500, p + 50))}
        >
          +50
        </button>
      </div>

      {/* Range Slider */}
      <input
        type="range"
        min="-300"
        max="300"
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)" }}
      />
    </div>
  );
}
