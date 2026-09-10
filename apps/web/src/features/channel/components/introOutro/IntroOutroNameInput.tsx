import React from "react";

export const STYLE_NAME_PRESETS = ["Mascot 3D Showcase", "Cyberpunk Neon", "Epic Cinematic", "Minimalist Modern"];

export interface IntroOutroNameInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export const IntroOutroNameInput: React.FC<IntroOutroNameInputProps> = ({ value, onChange, disabled = false }) => {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label htmlFor="style-name" style={{ fontSize: 13, fontWeight: 700 }}>
        Style Name
      </label>
      <input
        id="style-name"
        type="text"
        className="text-input"
        placeholder="e.g. Hero Mascot 3D, Cyberpunk Neon"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={50}
        required
      />
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, color: "var(--muted)", alignSelf: "center" }}>Suggestions:</span>
        {STYLE_NAME_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            disabled={disabled}
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 999,
              background: "var(--surface-hover)",
              border: "1px solid var(--line)",
              color: "var(--ink-secondary)",
              cursor: "pointer",
            }}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
};
