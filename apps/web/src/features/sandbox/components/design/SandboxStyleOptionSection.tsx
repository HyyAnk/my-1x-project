export interface StyleOptionItem<T extends string> {
  id: T;
  label: string;
}

export interface SandboxStyleOptionSectionProps<T extends string> {
  sectionTitle: string;
  activeLabel: string;
  description?: string;
  columns?: 2 | 3;
  options: StyleOptionItem<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
}

export function SandboxStyleOptionSection<T extends string>({
  sectionTitle,
  activeLabel,
  description,
  columns = 2,
  options,
  selectedValue,
  onSelect,
}: SandboxStyleOptionSectionProps<T>) {
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
          }}
        >
          {sectionTitle}
        </label>
        <span style={{ fontSize: "10px", color: "var(--accent)", fontWeight: 700 }}>{activeLabel}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: "6px",
          marginBottom: "4px",
        }}
      >
        {options.map((opt) => {
          const isSelected = selectedValue === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              style={{
                display: "flex",
                flexDirection: columns === 3 ? "column" : "row",
                alignItems: "center",
                justifyContent: "center",
                minHeight: columns === 3 ? "42px" : "36px",
                padding: columns === 3 ? "6px 4px" : "6px 8px",
                borderRadius: "8px",
                background: isSelected ? "var(--soft-accent)" : "var(--surface-strong)",
                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--line)",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: isSelected ? 800 : 500,
                  color: isSelected ? "var(--accent)" : "var(--text)",
                  lineHeight: 1.2,
                }}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {description ? <p style={{ fontSize: "10.5px", color: "var(--muted)", margin: 0, lineHeight: 1.35 }}>{description}</p> : null}
    </div>
  );
}
