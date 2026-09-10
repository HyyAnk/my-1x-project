import React from "react";
import { Check, Eye } from "@phosphor-icons/react";
import type { TransitionDefinition } from "@studio/shared";
import { TransitionIcon } from "./TransitionIcon";
import { TransitionTagBadge } from "./TransitionTagBadge";

export interface TransitionDropdownOptionProps {
  option: TransitionDefinition;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPreview?: (id: string) => void;
  isHighlighted?: boolean;
}

export const TransitionDropdownOption: React.FC<TransitionDropdownOptionProps> = ({
  option,
  isSelected,
  onSelect,
  onPreview,
  isHighlighted = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(option.id);
    }
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      className={`transition-dropdown-option ${isSelected ? "is-selected" : ""} ${isHighlighted ? "is-highlighted" : ""}`}
      onClick={() => onSelect(option.id)}
      onKeyDown={handleKeyDown}
    >
      <div className="transition-option-icon-box">
        <TransitionIcon iconName={option.iconName} transitionId={option.id} size={18} />
      </div>

      <div className="transition-option-info">
        <div className="transition-option-head">
          <span className="transition-option-name">{option.name}</span>
          <TransitionTagBadge tag={option.tag} />
          <span className="transition-option-duration">{option.defaultDuration > 0 ? `${option.defaultDuration}s` : "0.0s"}</span>
        </div>
        <p className="transition-option-desc">{option.description}</p>
      </div>

      <div className="transition-option-actions">
        {onPreview && (
          <button
            type="button"
            className="transition-option-preview-btn"
            title={`Preview ${option.name}`}
            aria-label={`Preview ${option.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onPreview(option.id);
            }}
          >
            <Eye size={14} weight="bold" />
          </button>
        )}
        {isSelected && (
          <span className="transition-option-check" aria-hidden="true">
            <Check size={14} weight="bold" />
          </span>
        )}
      </div>
    </div>
  );
};
