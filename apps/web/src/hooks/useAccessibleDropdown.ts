import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface UseAccessibleDropdownOptions<T> {
  items: readonly T[];
  selectedItem?: T | null;
  onSelect: (item: T) => void;
  disabled?: boolean;
  isItemEqual?: (a: T, b: T) => boolean;
  closeOnSelect?: boolean;
  listboxId?: string;
  labelId?: string;
}

export interface UseAccessibleDropdownReturn<T, E extends HTMLElement = HTMLDivElement> {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  containerRef: React.RefObject<E | null>;
  listboxId: string;
  labelId: string;
  handleSelect: (item: T) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  triggerProps: {
    role: "combobox";
    "aria-haspopup": "listbox";
    "aria-expanded": boolean;
    "aria-controls": string;
    "aria-labelledby": string;
    disabled: boolean;
    onClick: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
  listboxProps: {
    id: string;
    role: "listbox";
    "aria-labelledby": string;
  };
}

export function useAccessibleDropdown<T, E extends HTMLElement = HTMLDivElement>({
  items,
  selectedItem,
  onSelect,
  disabled = false,
  isItemEqual = (a, b) => a === b,
  closeOnSelect = true,
  listboxId: customListboxId,
  labelId: customLabelId,
}: UseAccessibleDropdownOptions<T>): UseAccessibleDropdownReturn<T, E> {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<E>(null);
  const autoListboxId = useId();
  const autoLabelId = useId();

  const listboxId = customListboxId ?? autoListboxId;
  const labelId = customLabelId ?? autoLabelId;

  const open = useCallback(() => {
    if (!disabled) setIsOpen(true);
  }, [disabled]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    if (!disabled) setIsOpen((prev) => !prev);
  }, [disabled]);

  const handleSelect = useCallback(
    (item: T) => {
      onSelect(item);
      if (closeOnSelect) {
        setIsOpen(false);
      }
    },
    [closeOnSelect, onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (items.length > 0) {
          const currentIndex = selectedItem ? items.findIndex((item) => isItemEqual(item, selectedItem)) : -1;
          const activeIndex = currentIndex >= 0 ? currentIndex : 0;
          const nextIndex = e.key === "ArrowDown" ? (activeIndex + 1) % items.length : (activeIndex - 1 + items.length) % items.length;
          handleSelect(items[nextIndex]);
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    },
    [disabled, handleSelect, isItemEqual, isOpen, items, selectedItem],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const triggerProps = {
    role: "combobox" as const,
    "aria-haspopup": "listbox" as const,
    "aria-expanded": isOpen,
    "aria-controls": listboxId,
    "aria-labelledby": labelId,
    disabled,
    onClick: toggle,
    onKeyDown: handleKeyDown,
  };

  const listboxProps = {
    id: listboxId,
    role: "listbox" as const,
    "aria-labelledby": labelId,
  };

  return {
    isOpen,
    setIsOpen,
    open,
    close,
    toggle,
    containerRef,
    listboxId,
    labelId,
    handleSelect,
    handleKeyDown,
    triggerProps,
    listboxProps,
  };
}
