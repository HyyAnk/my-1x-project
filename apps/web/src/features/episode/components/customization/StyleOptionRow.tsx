import { Check } from "@phosphor-icons/react";
import type { ReactNode } from "react";

type StyleOptionRowProps = {
  name: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
  onHover?: () => void;
  leading?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
};

export function StyleOptionRow({ name, label, checked, onSelect, onHover, leading, subtitle, badge }: StyleOptionRowProps) {
  return (
    <label className={`style-option-row ${checked ? "is-checked" : ""}`} onMouseEnter={onHover} onClick={onSelect}>
      <input type="radio" name={name} checked={checked} onChange={onSelect} aria-label={label} />
      {leading ? <span className="style-option-leading" aria-hidden="true">{leading}</span> : null}
      <div className="style-option-text">
        <span className="style-option-label">{label}</span>
        {subtitle ? <span className="style-option-subtitle">{subtitle}</span> : null}
      </div>
      {badge ? <span className="style-option-badge">{badge}</span> : null}
      {checked ? <Check size={14} weight="bold" className="style-option-check" /> : null}
    </label>
  );
}
