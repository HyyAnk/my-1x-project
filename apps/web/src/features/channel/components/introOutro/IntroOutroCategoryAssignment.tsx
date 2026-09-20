import { BUILT_IN_PRESETS } from "@studio/shared";

type Props = {
  styleName: string;
  disabled: boolean;
  onAssign: (stylePresetId: string) => void;
};

export function IntroOutroCategoryAssignment({ styleName, disabled, onAssign }: Props) {
  return (
    <select
      className="select-input intro-outro-category-assignment"
      value=""
      disabled={disabled}
      aria-label={`Assign category for ${styleName}`}
      onChange={(event) => {
        if (event.target.value) onAssign(event.target.value);
      }}
    >
      <option value="">Assign category</option>
      {BUILT_IN_PRESETS.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {preset.name}
        </option>
      ))}
    </select>
  );
}
