import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MascotStateVariant } from "@studio/shared";
import type { BatchSlotItem } from "../types/mascotBatch.types";
import { useMascotSlotSelection } from "./useMascotSlotSelection";

export type MascotSlotSelectionMode = "generate" | "regenerate";

export interface UseMascotSlotQueueSelectionProps {
  state: "thinking" | "celebrate";
  variants: MascotStateVariant[];
  availableSlotIndices: number[];
  onGenerateSelected?: (slots: BatchSlotItem[]) => Promise<boolean>;
  onRegenerateSelected?: (slots: BatchSlotItem[]) => Promise<boolean>;
}

export function useMascotSlotQueueSelection({
  state,
  variants,
  availableSlotIndices,
  onGenerateSelected,
  onRegenerateSelected,
}: UseMascotSlotQueueSelectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const protectedSelectionRef = useRef<Set<number>>(new Set());
  const selection = useMascotSlotSelection({ availableSlotIndices });

  const filledSlotIndices = useMemo(
    () => new Set(variants.filter((variant) => Boolean(variant.image_url)).map((variant) => variant.slot_index)),
    [variants],
  );
  const availableSlotSet = useMemo(() => new Set(availableSlotIndices), [availableSlotIndices]);
  const emptySlotIndices = useMemo(
    () => availableSlotIndices.filter((slotIndex) => !filledSlotIndices.has(slotIndex)),
    [availableSlotIndices, filledSlotIndices],
  );
  const generatedSlotIndices = useMemo(
    () => availableSlotIndices.filter((slotIndex) => filledSlotIndices.has(slotIndex)),
    [availableSlotIndices, filledSlotIndices],
  );
  const selectedIndices = useMemo(
    () => Array.from(selection.selectedSlotIndices).sort((left, right) => left - right),
    [selection.selectedSlotIndices],
  );
  const firstSelectedIndex = selectedIndices[0];
  const mode: MascotSlotSelectionMode =
    firstSelectedIndex !== undefined
      ? filledSlotIndices.has(firstSelectedIndex)
        ? "regenerate"
        : "generate"
      : emptySlotIndices.length > 0
        ? "generate"
        : "regenerate";
  const targetSlotIndices = mode === "generate" ? emptySlotIndices : generatedSlotIndices;
  const isAllSelected =
    targetSlotIndices.length > 0 && targetSlotIndices.every((slotIndex) => selection.selectedSlotIndices.has(slotIndex));

  useEffect(() => {
    const staleSelections = selectedIndices.filter(
      (slotIndex) => !availableSlotSet.has(slotIndex) && !protectedSelectionRef.current.has(slotIndex),
    );
    if (staleSelections.length > 0) selection.deselectSlots(staleSelections);
  }, [availableSlotSet, selectedIndices, selection]);

  const isSlotSelectable = useCallback(
    (slotIndex: number): boolean => {
      if (!availableSlotSet.has(slotIndex)) return false;
      if (selection.selectedCount === 0) return true;
      return filledSlotIndices.has(slotIndex) === (mode === "regenerate");
    },
    [availableSlotSet, filledSlotIndices, mode, selection.selectedCount],
  );

  const toggleSlot = useCallback(
    (slotIndex: number, selected: boolean) => {
      if (selected && !isSlotSelectable(slotIndex)) return;
      selection.toggleSlot(slotIndex, selected);
    },
    [isSlotSelectable, selection],
  );

  const selectAllForMode = useCallback(() => {
    selection.selectAll(targetSlotIndices);
  }, [selection, targetSlotIndices]);

  const submitSelected = useCallback(async (): Promise<boolean> => {
    if (selectedIndices.length === 0 || isSubmitting) return false;
    const slots = selectedIndices.map((slotIndex) => {
      const variant = variants.find((item) => item.slot_index === slotIndex);
      return {
        state,
        slotIndex,
        promptModifier: variant?.prompt_modifier || undefined,
      };
    });
    const submit = mode === "generate" ? onGenerateSelected : onRegenerateSelected;
    if (!submit) return false;

    protectedSelectionRef.current = new Set(selectedIndices);
    setIsSubmitting(true);
    try {
      const accepted = await submit(slots);
      if (accepted) selection.deselectSlots(selectedIndices);
      return accepted;
    } finally {
      protectedSelectionRef.current.clear();
      setIsSubmitting(false);
    }
  }, [isSubmitting, mode, onGenerateSelected, onRegenerateSelected, selectedIndices, selection, state, variants]);

  return {
    mode,
    selectedCount: selection.selectedCount,
    isSelected: selection.isSelected,
    isSlotSelectable,
    toggleSlot,
    selectAllForMode,
    deselectAll: selection.deselectAll,
    isAllSelected,
    totalSelectableCount: targetSlotIndices.length,
    isSubmitting,
    submitSelected,
  };
}
