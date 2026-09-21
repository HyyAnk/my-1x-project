import { useState, useCallback, useMemo } from "react";

export interface UseMascotSlotSelectionProps {
  availableSlotIndices: number[];
}

export interface UseMascotSlotSelectionResult {
  selectedSlotIndices: Set<number>;
  isSelected: (slotIndex: number) => boolean;
  toggleSlot: (slotIndex: number, selected?: boolean) => void;
  selectAll: (indicesToSelect?: number[]) => void;
  deselectSlots: (slotIndices: number[]) => void;
  deselectAll: () => void;
  clearSelection: () => void;
  selectedCount: number;
  isAllSelected: boolean;
}

/**
 * Custom hook to manage slot selection state for batch variant regeneration.
 * Supports individual toggle, select-all, deselect-all, and selection clearing.
 */
export function useMascotSlotSelection({ availableSlotIndices }: UseMascotSlotSelectionProps): UseMascotSlotSelectionResult {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const toggleSlot = useCallback((slotIndex: number, selected?: boolean) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      const shouldSelect = selected !== undefined ? selected : !next.has(slotIndex);
      if (shouldSelect) {
        next.add(slotIndex);
      } else {
        next.delete(slotIndex);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(
    (indicesToSelect?: number[]) => {
      const target = indicesToSelect || availableSlotIndices;
      setSelectedIndices(new Set(target));
    },
    [availableSlotIndices],
  );

  const deselectAll = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const deselectSlots = useCallback((slotIndices: number[]) => {
    setSelectedIndices((current) => {
      const next = new Set(current);
      for (const slotIndex of slotIndices) next.delete(slotIndex);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const isSelected = useCallback((slotIndex: number) => selectedIndices.has(slotIndex), [selectedIndices]);

  const selectedCount = selectedIndices.size;

  const isAllSelected = useMemo(() => {
    if (availableSlotIndices.length === 0) return false;
    return availableSlotIndices.every((idx) => selectedIndices.has(idx));
  }, [availableSlotIndices, selectedIndices]);

  return {
    selectedSlotIndices: selectedIndices,
    isSelected,
    toggleSlot,
    selectAll,
    deselectSlots,
    deselectAll,
    clearSelection,
    selectedCount,
    isAllSelected,
  };
}
