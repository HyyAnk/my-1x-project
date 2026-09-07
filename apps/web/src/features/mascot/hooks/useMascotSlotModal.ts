import { useState, useCallback } from "react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export type EditingSlotInfo = {
  state: "thinking" | "celebrate";
  slotIndex: number;
  currentPrompt: string;
};

export type UseMascotSlotModalProps = {
  mascot: MascotProfile | null;
  activeStyleId: string;
  activeStyle: MascotStyle | null;
  onMascotUpdated: (mascot: MascotProfile) => void;
  onNotice: (notice: Notice) => void;
};

export type UseMascotSlotModalResult = {
  editingSlot: EditingSlotInfo | null;
  setEditingSlot: React.Dispatch<React.SetStateAction<EditingSlotInfo | null>>;
  handleOpenSlotPromptModal: (state: "thinking" | "celebrate", slotIndex: number) => void;
  handleCloseSlotPromptModal: () => void;
  handleSaveSlotPrompt: (prompt: string) => Promise<void>;
};

export function useMascotSlotModal({
  mascot,
  activeStyleId,
  activeStyle,
  onMascotUpdated,
  onNotice,
}: UseMascotSlotModalProps): UseMascotSlotModalResult {
  const [editingSlot, setEditingSlot] = useState<EditingSlotInfo | null>(null);

  const handleOpenSlotPromptModal = useCallback(
    (state: "thinking" | "celebrate", slotIndex: number) => {
      const slot = activeStyle?.states?.[state]?.find((s) => s.slot_index === slotIndex);
      setEditingSlot({
        state,
        slotIndex,
        currentPrompt: slot?.prompt_modifier || "",
      });
    },
    [activeStyle],
  );

  const handleCloseSlotPromptModal = useCallback(() => {
    setEditingSlot(null);
  }, []);

  const handleSaveSlotPrompt = useCallback(
    async (prompt: string) => {
      if (!mascot || !editingSlot) return;
      const targetStyleId = activeStyle?.id || activeStyleId || "core";
      try {
        const result = await api.updateMascotSlot(mascot.id, targetStyleId, {
          style_id: targetStyleId,
          state: editingSlot.state,
          slot_index: editingSlot.slotIndex,
          prompt_modifier: prompt,
        });
        onMascotUpdated(result.mascot);
        setEditingSlot(null);
        onNotice({
          tone: "good",
          message: "Slot prompt updated successfully",
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to update slot prompt",
        });
      }
    },
    [mascot, editingSlot, activeStyle?.id, activeStyleId, onMascotUpdated, onNotice],
  );

  return {
    editingSlot,
    setEditingSlot,
    handleOpenSlotPromptModal,
    handleCloseSlotPromptModal,
    handleSaveSlotPrompt,
  };
}
