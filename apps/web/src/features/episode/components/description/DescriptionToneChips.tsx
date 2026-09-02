import { PaperPlaneTilt, Sparkle } from "@phosphor-icons/react";

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
    <div className="video-description-tone-bar">
      <div className="tone-chips-row">
        <span className="tone-chips-label">AI Strategy / Tone:</span>
        {PRESET_TONES.map((preset) => {
          const isSelected = toneHint === preset.value;
          return (
            <button
              key={preset.label}
              type="button"
              className={`tone-preset-pill ${isSelected ? "active" : ""}`}
              disabled={disabled}
              onClick={() => onSelectTone(preset.value)}
              title={preset.value}
            >
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      <div className="tone-input-row">
        <div className="tone-input-wrapper">
          <Sparkle size={15} weight="duotone" className="tone-input-icon" />
          <input
            type="text"
            className="tone-custom-input"
            placeholder="Customize hook angle, target audience, or specific SEO instructions (press Enter to generate)..."
            value={toneHint}
            onChange={(e) => onCustomToneChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !disabled) {
                e.preventDefault();
                onSubmit();
              }
            }}
            disabled={disabled}
          />
        </div>

        {toneHint && !disabled && (
          <button
            type="button"
            className="secondary-button compact"
            onClick={onSubmit}
            title="Generate description using custom prompt"
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 10px" }}
          >
            <PaperPlaneTilt size={13} weight="bold" />
            <span style={{ fontSize: "0.78rem" }}>Apply</span>
          </button>
        )}
      </div>
    </div>
  );
}
