import { CircleNotch } from "@phosphor-icons/react";
import type { SelectOption } from "../utils/quizShortSettingsOptions";

export type QuizShortSettingSelectProps = {
  id: string;
  label: string;
  value: string;
  options: readonly SelectOption[];
  disabled: boolean;
  saving: boolean;
  onChange: (value: string) => void;
};

/** Labelled native select used by the Quiz Short customization bar. */
export function QuizShortSettingSelect({ id, label, value, options, disabled, saving, onChange }: QuizShortSettingSelectProps) {
  return (
    <label className="quiz-short-setting" htmlFor={id}>
      <span className="quiz-short-setting-label">
        {label}
        {saving ? <CircleNotch className="spin" size={12} aria-label="Saving" /> : null}
      </span>
      <select
        id={id}
        className="quiz-short-setting-select"
        value={value}
        disabled={disabled || saving}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export type QuizShortSettingToggleProps = {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  saving: boolean;
  onChange: (checked: boolean) => void;
};

export function QuizShortSettingToggle({ id, label, checked, disabled, saving, onChange }: QuizShortSettingToggleProps) {
  return (
    <label className="quiz-short-setting quiz-short-setting-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled || saving}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="quiz-short-setting-label">
        {label}
        {saving ? <CircleNotch className="spin" size={12} aria-label="Saving" /> : null}
      </span>
    </label>
  );
}
