import { Check } from "@phosphor-icons/react";
import type { ReactNode } from "react";

type StyleOptionRowProps = {
  name: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
  onHover?: () => void;
  leading?: ReactNode;
};

export function StyleOptionRow({ name, label, checked, onSelect, onHover, leading }: StyleOptionRowProps) {
  return (
    <label className={`style-option-row ${checked ? "is-checked" : ""}`} onMouseEnter={onHover} onClick={onSelect}>
      <input type="radio" name={name} checked={checked} onChange={onSelect} />
      {leading ? <span className="style-option-leading">{leading}</span> : null}
      <span className="style-option-label">{label}</span>
      {checked ? <Check size={14} weight="bold" className="style-option-check" /> : null}
    </label>
  );
}
