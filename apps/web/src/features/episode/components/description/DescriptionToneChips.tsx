const PRESET_TONES = [
  { label: "⚡ Witty & Fun", value: "Witty and fun, humorous engaging tone" },
  { label: "🧠 Brain Challenge", value: "High intellect challenge, fast reflex trivia" },
  { label: "🔥 Dramatic & Suspenseful", value: "Dramatic suspense, high retention hook" },
  { label: "📚 Educational Insights", value: "Educational insights, fascinating facts" },
  { label: "🎯 Tricky Riddles", value: "Mind-bending tricky riddles, surprising twist" },
];

interface DescriptionToneChipsProps {
  toneHint: string;
  disabled: boolean;
  onSelectTone: (toneValue: string) => void;
  onCustomToneChange: (customTone: string) => void;
  onSubmit: () => void;
}

export function DescriptionToneChips({
  toneHint,
  disabled,
  onSelectTone,
  onCustomToneChange,
  onSubmit,
}: DescriptionToneChipsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "10px 0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", color: "var(--text-muted, #94a3b8)", fontWeight: 500 }}>
          Style & Tone Hints:
        </span>
        {PRESET_TONES.map((preset) => {
          const isSelected = toneHint === preset.value;
          return (
            <button
              key={preset.label}
              type="button"
              className={`quiet-button compact ${isSelected ? "is-selected" : ""}`}
              disabled={disabled}
              onClick={() => onSelectTone(preset.value)}
              style={{
                fontSize: "11.5px",
                padding: "3px 8px",
                borderRadius: "14px",
                border: isSelected ? "1px solid var(--accent, #6366f1)" : "1px solid rgba(255, 255, 255, 0.1)",
                backgroundColor: isSelected ? "rgba(99, 102, 241, 0.18)" : "rgba(0, 0, 0, 0.2)",
                color: isSelected ? "var(--accent-light, #a5b4fc)" : "var(--text-muted, #cbd5e1)",
              }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Enter custom perspective or hook angle (or pick a preset above)..."
          value={toneHint}
          onChange={(e) => onCustomToneChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled) onSubmit();
          }}
          disabled={disabled}
          style={{
            flex: 1,
            padding: "7px 12px",
            fontSize: "13px",
            background: "rgba(0, 0, 0, 0.25)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "6px",
            color: "var(--text, #f8fafc)",
          }}
        />
      </div>
    </div>
  );
}
