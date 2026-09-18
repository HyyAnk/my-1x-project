import { MASCOT_DEFAULT_PLACEMENT, MASCOT_RECOMMENDED_PLACEMENT, type MascotPlacementV2 } from "@studio/shared";
import { ArrowCounterClockwise, Sparkle, GridFour } from "@phosphor-icons/react";

export interface PlacementSettingsControlsProps {
  placement: MascotPlacementV2;
  onChangePlacement: (placement: MascotPlacementV2) => void;
  showGuides?: boolean;
  onToggleGuides?: () => void;
}

export function PlacementSettingsControls({
  placement,
  onChangePlacement,
  showGuides = false,
  onToggleGuides,
}: PlacementSettingsControlsProps) {
  const updateProp = <K extends keyof MascotPlacementV2>(key: K, value: MascotPlacementV2[K]) => {
    onChangePlacement({
      ...placement,
      [key]: value,
    });
  };

  return (
    <div
      className="placement-settings-controls"
      data-testid="placement-settings-controls"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        padding: "16px",
        background: "var(--surface, rgba(255,255,255,0.03))",
        border: "1px solid var(--line, rgba(255,255,255,0.08))",
        borderRadius: "var(--radius, 10px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>Quiz Placement & Framing (16:9)</h4>
        {onToggleGuides && (
          <button
            type="button"
            className={`quiet-button compact ${showGuides ? "is-active" : ""}`}
            onClick={onToggleGuides}
            title="Toggle Alignment Guides"
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              color: showGuides ? "var(--accent)" : "var(--muted)",
            }}
          >
            <GridFour size={13} weight={showGuides ? "fill" : "regular"} />
            <span>Guides</span>
          </button>
        )}
      </div>

      {/* Anchor Selector */}
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "6px" }}>
          Anchor Position
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          <button
            type="button"
            className={`quiet-button compact ${placement.anchor === "bottom_left" ? "is-active" : ""}`}
            style={{
              fontWeight: 600,
              fontSize: "12px",
              padding: "6px",
              justifyContent: "center",
              borderColor: placement.anchor === "bottom_left" ? "var(--accent)" : undefined,
              color: placement.anchor === "bottom_left" ? "var(--accent)" : undefined,
            }}
            onClick={() => updateProp("anchor", "bottom_left")}
          >
            Bottom Left (Default)
          </button>
          <button
            type="button"
            className={`quiet-button compact ${placement.anchor === "bottom_right" ? "is-active" : ""}`}
            style={{
              fontWeight: 600,
              fontSize: "12px",
              padding: "6px",
              justifyContent: "center",
              borderColor: placement.anchor === "bottom_right" ? "var(--accent)" : undefined,
              color: placement.anchor === "bottom_right" ? "var(--accent)" : undefined,
            }}
            onClick={() => updateProp("anchor", "bottom_right")}
          >
            Bottom Right
          </button>
        </div>
      </div>

      {/* Scale Slider */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)" }}>Render Scale</label>
          <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "monospace", color: "var(--ink)" }}>
            {placement.scale.toFixed(2)}x
          </span>
        </div>
        <input
          type="range"
          min={0.3}
          max={3.0}
          step={0.01}
          value={placement.scale}
          onChange={(e) => updateProp("scale", Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--accent)" }}
          aria-label="Render Scale"
        />
      </div>

      {/* Offsets (X and Y) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)" }}>Offset X</label>
            <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "monospace", color: "var(--ink)" }}>{placement.offset_x}px</span>
          </div>
          <input
            type="range"
            min={-800}
            max={800}
            step={1}
            value={placement.offset_x}
            onChange={(e) => updateProp("offset_x", Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent)" }}
            aria-label="Offset X"
          />
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)" }}>Offset Y</label>
            <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "monospace", color: "var(--ink)" }}>{placement.offset_y}px</span>
          </div>
          <input
            type="range"
            min={-800}
            max={800}
            step={1}
            value={placement.offset_y}
            onChange={(e) => updateProp("offset_y", Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent)" }}
            aria-label="Offset Y"
          />
        </div>
      </div>

      {/* Flip Horizontal Toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>Flip Horizontal</span>
        <button
          type="button"
          className={`quiet-button compact ${placement.flip_x ? "is-active" : ""}`}
          style={{
            fontSize: "11px",
            padding: "4px 10px",
            borderColor: placement.flip_x ? "var(--accent)" : undefined,
            color: placement.flip_x ? "var(--accent)" : undefined,
          }}
          onClick={() => updateProp("flip_x", !placement.flip_x)}
        >
          {placement.flip_x ? "Flipped (⇄)" : "Normal"}
        </button>
      </div>

      {/* Preset Quick Actions */}
      <div style={{ display: "flex", gap: "8px", marginTop: "4px", borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
        <button
          type="button"
          className="quiet-button compact"
          style={{ flex: 1, justifyContent: "center", fontSize: "11px" }}
          onClick={() => onChangePlacement({ ...MASCOT_DEFAULT_PLACEMENT })}
        >
          <ArrowCounterClockwise size={12} />
          <span>Reset Default</span>
        </button>

        <button
          type="button"
          className="quiet-button compact primary"
          style={{ flex: 1, justifyContent: "center", fontSize: "11px" }}
          onClick={() => onChangePlacement({ ...MASCOT_RECOMMENDED_PLACEMENT })}
        >
          <Sparkle size={12} weight="fill" />
          <span>Recommended</span>
        </button>
      </div>
    </div>
  );
}
