import { useTranslation } from "../../../../i18n";
import { PALETTES } from "../../constants";

export interface SandboxPaletteSelectorProps {
  paletteId: string;
  setPaletteId: (id: string) => void;
}

export function SandboxPaletteSelector({ paletteId, setPaletteId }: SandboxPaletteSelectorProps) {
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
        {t("visualSandbox.paletteSection")}
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
        {PALETTES.map((p) => {
          const isSelected = paletteId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaletteId(p.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
                padding: "5px",
                borderRadius: "8px",
                background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "16px",
                  borderRadius: "4px",
                  background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})`,
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: isSelected ? 800 : 500,
                  color: isSelected ? "var(--accent)" : "var(--text)",
                }}
              >
                {p.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
