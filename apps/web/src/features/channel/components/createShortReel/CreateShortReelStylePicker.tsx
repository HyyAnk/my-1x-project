import type { QuizImageStyle } from "@studio/shared";

export type ReelVisualStyle = QuizImageStyle | "mixed";

export interface CreateShortReelStylePickerProps {
  value: ReelVisualStyle;
  onChange: (value: ReelVisualStyle) => void;
  disabled?: boolean;
}

const STYLE_OPTIONS: Array<{ value: ReelVisualStyle; label: string }> = [
  { value: "mixed", label: "Mixed Styles" },
  { value: "pixar_3d", label: "3D Pixar" },
  { value: "flat_vector", label: "Flat Vector" },
  { value: "kawaii_chibi", label: "Chibi Anime" },
  { value: "natural_realism", label: "Cinematic" },
  { value: "plastic_toy", label: "Vinyl Toy" },
];

export function CreateShortReelStylePicker({ value, onChange, disabled = false }: CreateShortReelStylePickerProps) {
  return (
    <div className="short-reel-style-picker" data-testid="short-reel-style-picker">
      <label className="short-reel-picker-label" htmlFor="short-reel-style-select">
        Visual Style:
      </label>
      <select
        id="short-reel-style-select"
        className="short-reel-style-select"
        value={value}
        onChange={(e) => onChange(e.target.value as ReelVisualStyle)}
        disabled={disabled}
        aria-label="Select visual image style"
      >
        {STYLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
