import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  type MascotProfile,
  type MascotStyle,
  type UpdateMascotStyleInput,
  resolveMascotStyle,
} from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export type UseMascotStylesProps = {
  mascot: MascotProfile | null;
  onMascotUpdated: (mascot: MascotProfile) => void;
  onNotice: (notice: Notice) => void;
};

export type EditingSlotInfo = {
  state: "thinking" | "celebrate";
  slotIndex: number;
  currentPrompt: string;
};

export type BatchProgressState = {
  total: number;
  completed: number;
  failed: number;
  activeSlotKeys: string[];
  statusMessage: string;
  startTime: number;
  isStopping: boolean;
};

export function useMascotStyles({
  mascot,
  onMascotUpdated,
  onNotice,
}: UseMascotStylesProps) {
  const [activeStyleId, setActiveStyleId] = useState<string>(
    () => mascot?.active_style_id || "core",
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newStyleName, setNewStyleName] = useState<string>("");
  const [newStyleKeyword, setNewStyleKeyword] = useState<string>("");
  const [busySlotKey, setBusySlotKey] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<EditingSlotInfo | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgressState | null>(null);
  const stopBatchRef = useRef<AbortController | null>(null);

  const handleStopBatchGeneration = useCallback(() => {
    stopBatchRef.current?.abort();
    setBatchProgress((prev) =>
      prev ? { ...prev, isStopping: true, statusMessage: "Cancelling remaining server slots..." } : null,
    );
  }, []);

  useEffect(() => {
    if (mascot?.active_style_id && activeStyleId === "core") {
      setActiveStyleId(mascot.active_style_id);
    }
  }, [mascot?.active_style_id]);

  const activeStyle = useMemo<MascotStyle | null>(() => {
    if (!mascot) return null;
    return resolveMascotStyle(mascot, activeStyleId);
  }, [mascot, activeStyleId]);

  const handleCreateStyle = useCallback(
    async (name?: string, keyword?: string) => {
      const finalName = (name ?? newStyleName).trim();
      const finalKeyword = (keyword ?? newStyleKeyword).trim();
      if (!mascot) return;
      if (!finalName) {
        onNotice({ tone: "bad", message: "Style name is required" });
        return;
      }
      try {
        const result = await api.createMascotStyle(mascot.id, {
          name: finalName,
          keyword: finalKeyword,
        });
        onMascotUpdated(result.mascot);
        setActiveStyleId(result.style.id);
        setIsCreateModalOpen(false);
        setNewStyleName("");
        setNewStyleKeyword("");
        onNotice({
          tone: "good",
          message: `Style "${result.style.name}" created successfully`,
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to create mascot style",
        });
      }
    },
    [mascot, newStyleName, newStyleKeyword, onMascotUpdated, onNotice],
  );

  const handleUpdateStyleKeyword = useCallback(
    async (styleId: string, keyword: string) => {
      if (!mascot) return;
      try {
        const result = await api.updateMascotStyle(mascot.id, styleId, { keyword });
        onMascotUpdated(result.mascot);
        onNotice({
          tone: "good",
          message: "Style keyword updated successfully",
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to update style keyword",
        });
      }
    },
    [mascot, onMascotUpdated, onNotice],
  );

  const handleUpdateStyle = useCallback(
    async (styleId: string, input: UpdateMascotStyleInput) => {
      if (!mascot) return;
      try {
        const result = await api.updateMascotStyle(mascot.id, styleId, input);
        onMascotUpdated(result.mascot);
        onNotice({
          tone: "good",
          message: "Style updated successfully",
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to update style",
        });
      }
    },
    [mascot, onMascotUpdated, onNotice],
  );

  const handleDeleteStyle = useCallback(
    async (styleId: string) => {
      if (!mascot) return;
      try {
        const result = await api.deleteMascotStyle(mascot.id, styleId);
        onMascotUpdated(result.mascot);
        if (activeStyleId === styleId) {
          setActiveStyleId("core");
        }
        onNotice({
          tone: "good",
          message: "Style deleted successfully",
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to delete mascot style",
        });
      }
    },
    [mascot, activeStyleId, onMascotUpdated, onNotice],
  );

  const handleSetActiveStyle = useCallback(
    async (styleId: string) => {
      if (!mascot) return;
      try {
        const result = await api.setActiveMascotStyle(mascot.id, styleId);
        onMascotUpdated(result.mascot);
        setActiveStyleId(styleId);
        onNotice({
          tone: "good",
          message: "Active style updated successfully",
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || "Failed to set active style",
        });
      }
    },
    [mascot, onMascotUpdated, onNotice],
  );

  const handleGenerateSlot = useCallback(
    async (state: "thinking" | "celebrate", slotIndex: number, promptModifier?: string) => {
      if (!mascot) return;
      const targetStyleId = activeStyle?.id || activeStyleId || "core";
      const slotKey = `${state}_${slotIndex}`;
      setBusySlotKey(slotKey);
      try {
        const result = await api.generateMascotStyleSlot(mascot.id, targetStyleId, {
          style_id: targetStyleId,
          state,
          slot_index: slotIndex,
          prompt_modifier: promptModifier,
        });
        onMascotUpdated(result.mascot);
        onNotice({
          tone: "good",
          message: `Slot ${slotIndex} (${state}) generated successfully`,
        });
      } catch (err: unknown) {
        const error = err as Error;
        onNotice({
          tone: "bad",
          message: error?.message || `Failed to generate ${state} slot`,
        });
      } finally {
        setBusySlotKey(null);
      }
    },
    [mascot, activeStyle?.id, activeStyleId, onMascotUpdated, onNotice],
  );

  const handleBatchGenerateStyle = useCallback(
    async (stateFilter: "thinking" | "celebrate" | "all" = "all") => {
      if (!mascot) return;
      const targetStyleId = activeStyle?.id || activeStyleId || "core";
      const style = resolveMascotStyle(mascot, targetStyleId);
      if (!style) return;

      const statesToProcess: Array<"thinking" | "celebrate"> =
        stateFilter === "all" ? ["thinking", "celebrate"] : [stateFilter];

      const total = statesToProcess.reduce((count, st) => {
        const slots = style.states[st] || [];
        for (let i = 1; i <= 10; i++) {
          const slot = slots.find((s) => s.slot_index === i);
          if (!slot || !slot.image_url || slot.image_url.trim() === "") count += 1;
        }
        return count;
      }, 0);

      if (total === 0) {
        onNotice({
          tone: "good",
          message: `All ${stateFilter === "all" ? "slots" : `${stateFilter} slots`} in this style are already generated`,
        });
        return;
      }

      stopBatchRef.current?.abort();
      const abortController = new AbortController();
      stopBatchRef.current = abortController;

      setBusySlotKey("batch");
      setBatchProgress({
        total,
        completed: 0,
        failed: 0,
        activeSlotKeys: [],
        statusMessage: `Server is generating ${total} slots (3 concurrent streams)...`,
        startTime: Date.now(),
        isStopping: false,
      });

      try {
        const result = await api.generateMascotStyleBatch(
          mascot.id,
          targetStyleId,
          { style_id: targetStyleId, state: stateFilter },
          abortController.signal,
        );
        if (result?.mascot) {
          onMascotUpdated(result.mascot);
        }
        onNotice({
          tone: "good",
          message: result.cancelled
            ? `Batch generation stopped (${result.generated_count}/${total} slots generated)`
            : `Batch generation complete (${result.generated_count}/${total} slots generated)`,
        });
      } catch (err: unknown) {
        const error = err as Error;
        if (abortController.signal.aborted) {
          onNotice({
            tone: "good",
            message: "Batch generation stopped — remaining slots were cancelled on the server",
          });
        } else {
          onNotice({
            tone: "bad",
            message: error?.message || "Error during batch generation",
          });
        }
      } finally {
        setBusySlotKey(null);
        setBatchProgress(null);
        if (stopBatchRef.current === abortController) stopBatchRef.current = null;
      }
    },
    [mascot, activeStyle?.id, activeStyleId, onMascotUpdated, onNotice],
  );

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
    activeStyleId,
    setActiveStyleId,
    activeStyle,
    isCreateModalOpen,
    setIsCreateModalOpen,
    newStyleName,
    setNewStyleName,
    newStyleKeyword,
    setNewStyleKeyword,
    handleCreateStyle,
    handleUpdateStyleKeyword,
    handleUpdateStyle,
    handleDeleteStyle,
    handleSetActiveStyle,
    busySlotKey,
    handleGenerateSlot,
    handleBatchGenerateStyle,
    batchProgress,
    handleStopBatchGeneration,
    editingSlot,
    setEditingSlot,
    handleOpenSlotPromptModal,
    handleCloseSlotPromptModal,
    handleSaveSlotPrompt,
  };
}
