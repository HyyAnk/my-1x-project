import type React from "react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import type { Notice } from "../../../components/types";

export type BatchProgressState = {
  batchId?: string;
  styleId?: string;
  styleName?: string;
  total: number;
  completed: number;
  failed: number;
  activeSlotKeys: string[];
  statusMessage: string;
  startTime: number;
  isStopping: boolean;
  targetState?: "thinking" | "celebrate" | "all";
  mode?: "single" | "batch_empty" | "regenerate_selected";
};

export type QueuedSlotTask = {
  styleId: string;
  state: "thinking" | "celebrate";
  slotIndex: number;
  promptModifier?: string;
  resolve: () => void;
  reject: (err: unknown) => void;
};

export type BatchSlotItem = {
  state: "thinking" | "celebrate";
  slotIndex: number;
  promptModifier?: string;
};

export type UseMascotBatchGenerationProps = {
  mascot: MascotProfile | null;
  activeStyleId: string;
  activeStyle: MascotStyle | null;
  onMascotUpdated: (mascot: MascotProfile) => void;
  onNotice: (notice: Notice) => void;
  onActivityChange?: () => void;
  onActiveStyleRecovered?: (styleId: string) => void;
};

export type UseMascotBatchGenerationResult = {
  busySlotKey: string | null;
  setBusySlotKey: React.Dispatch<React.SetStateAction<string | null>>;
  queuedSlotKeys: string[];
  batchProgress: BatchProgressState | null;
  setBatchProgress: React.Dispatch<React.SetStateAction<BatchProgressState | null>>;
  handleStopBatchGeneration: () => void;
  handleGenerateSlot: (state: "thinking" | "celebrate", slotIndex: number, promptModifier?: string) => Promise<void>;
  handleBatchGenerateStyle: (stateFilter?: "thinking" | "celebrate" | "all") => Promise<void>;
  handleRegenerateSelectedSlots: (
    slots: Array<{ state: "thinking" | "celebrate"; slotIndex: number; promptModifier?: string }>,
  ) => Promise<void>;
};

export type MascotQueueCallbacks = {
  onBusySlotChange: (slotKey: string | null) => void;
  onQueuedKeysChange: (keys: string[]) => void;
  onProgressChange: (updater: BatchProgressState | null | ((prev: BatchProgressState | null) => BatchProgressState | null)) => void;
  onMascotUpdated: (mascot: MascotProfile) => void;
  onNotice: (notice: Notice) => void;
  getLatestMascot: () => MascotProfile | null;
};
