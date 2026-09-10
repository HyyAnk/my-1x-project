import React, { forwardRef } from "react";
import { CaretDown, Eye } from "@phosphor-icons/react";
import type { TransitionDefinition } from "@studio/shared";
import { TransitionIcon } from "./TransitionIcon";
import { TransitionTagBadge } from "./TransitionTagBadge";

export interface TransitionDropdownTriggerProps {
  isOpen: boolean;
  disabled: boolean;
  selectedDef?: TransitionDefinition;
  fallbackValue: string;
  label: string;
  onToggle: () => void;
  onPreview?: (id: string) => void;
}

export const TransitionDropdownTrigger = forwardRef<HTMLButtonElement, TransitionDropdownTriggerProps>(
  ({ isOpen, disabled, selectedDef, fallbackValue, label, onToggle, onPreview }, ref) => {
    return (
      <div className="transition-dropdown-trigger-wrapper">
        <button
          ref={ref}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label}
          aria-controls="transition-dropdown-menu-list"
          disabled={disabled}
          className={`transition-dropdown-trigger ${isOpen ? "is-open" : ""}`}
          onClick={onToggle}
        >
          <div className="transition-dropdown-trigger-content">
            <div className="transition-dropdown-trigger-icon">
              <TransitionIcon iconName={selectedDef?.iconName} transitionId={selectedDef?.id ?? fallbackValue} size={16} />
            </div>
            <div className="transition-dropdown-trigger-text">
              <span className="transition-trigger-name">{selectedDef?.name ?? fallbackValue}</span>
              {selectedDef?.tag && <TransitionTagBadge tag={selectedDef.tag} />}
            </div>
          </div>

          <div className="transition-dropdown-trigger-actions">
            <CaretDown size={14} weight="bold" className={`transition-dropdown-caret ${isOpen ? "is-open" : ""}`} />
          </div>
        </button>

        {onPreview && selectedDef && (
          <button
            type="button"
            className="transition-quick-preview-btn"
            title={`Preview current transition (${selectedDef.name})`}
            aria-label={`Preview current transition (${selectedDef.name})`}
            disabled={disabled}
            onClick={() => onPreview(selectedDef.id)}
          >
            <Eye size={15} weight="bold" />
            <span className="preview-btn-text">Preview</span>
          </button>
        )}
      </div>
    );
  },
);

TransitionDropdownTrigger.displayName = "TransitionDropdownTrigger";
