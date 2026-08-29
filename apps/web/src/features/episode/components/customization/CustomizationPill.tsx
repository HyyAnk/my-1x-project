import { CaretDown } from "@phosphor-icons/react";
import { CircleNotch } from "@phosphor-icons/react";

type CustomizationPillProps = {
  label: string;
  value: string;
  isOpen: boolean;
  disabled: boolean;
  saving: boolean;
  onToggle: () => void;
};

export function CustomizationPill({ label, value, isOpen, disabled, saving, onToggle }: CustomizationPillProps) {
  return (
    <button
      type="button"
      className={`customization-pill-btn ${isOpen ? "is-active" : ""} ${saving ? "is-saving" : ""}`}
      disabled={disabled || saving}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      onClick={onToggle}
    >
      <span className="pill-btn-text">
        <span className="pill-label">{label}</span>
        <strong className="pill-value">{value}</strong>
      </span>
      {saving ? <CircleNotch className="pill-spinner spin" size={13} /> : <CaretDown size={12} className="pill-caret" />}
    </button>
  );
}
