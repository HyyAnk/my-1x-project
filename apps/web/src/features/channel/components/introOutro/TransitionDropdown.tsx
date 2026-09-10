import React, { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { getTransition, listTransitions, type TransitionCategory, type TransitionDefinition } from "@studio/shared";
import { TransitionDropdownOption } from "./TransitionDropdownOption";
import { TransitionDropdownTrigger } from "./TransitionDropdownTrigger";

export interface TransitionDropdownProps {
  value: string;
  onChange: (id: string, def?: TransitionDefinition) => void;
  category?: TransitionCategory;
  disabled?: boolean;
  onPreview?: (id: string) => void;
  label?: string;
  className?: string;
}

export const TransitionDropdown: React.FC<TransitionDropdownProps> = ({
  value,
  onChange,
  category = "intro_outro",
  disabled = false,
  onPreview,
  label = "Transition Type",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Dynamically pull options from registry
  const allOptions = useMemo(() => {
    return listTransitions(category);
  }, [category, isOpen]);

  // Find currently selected definition
  const selectedDef = useMemo(() => {
    return allOptions.find((opt) => opt.id === value) ?? getTransition(value) ?? allOptions[0];
  }, [allOptions, value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        opt.description.toLowerCase().includes(q) ||
        (opt.tag && opt.tag.toLowerCase().includes(q)) ||
        opt.id.toLowerCase().includes(q),
    );
  }, [allOptions, searchQuery]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (id: string) => {
    const def = allOptions.find((opt) => opt.id === id);
    onChange(id, def);
    setIsOpen(false);
    setSearchQuery("");
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev + 1) % (filteredOptions.length || 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % (filteredOptions.length || 1));
      }
    } else if (e.key === "Enter" && isOpen && filteredOptions[highlightedIndex]) {
      e.preventDefault();
      handleSelect(filteredOptions[highlightedIndex].id);
    }
  };

  return (
    <div ref={containerRef} className={`transition-dropdown-container ${className}`.trim()} onKeyDown={handleKeyDown}>
      <TransitionDropdownTrigger
        ref={triggerRef}
        isOpen={isOpen}
        disabled={disabled}
        selectedDef={selectedDef}
        fallbackValue={value}
        label={label}
        onToggle={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setSearchQuery("");
            setHighlightedIndex(0);
          }
        }}
        onPreview={onPreview}
      />

      {isOpen && (
        <div id="transition-dropdown-menu-list" role="listbox" aria-label={label} className="transition-dropdown-menu">
          {allOptions.length > 3 && (
            <div className="transition-dropdown-search">
              <MagnifyingGlass size={14} className="transition-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search transitions..."
                className="transition-search-input"
                aria-label="Filter transitions"
              />
            </div>
          )}

          <div className="transition-dropdown-options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => (
                <TransitionDropdownOption
                  key={opt.id}
                  option={opt}
                  isSelected={opt.id === value}
                  isHighlighted={index === highlightedIndex}
                  onSelect={handleSelect}
                  onPreview={onPreview}
                />
              ))
            ) : (
              <div className="transition-dropdown-empty">No transitions found matching &quot;{searchQuery}&quot;</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
