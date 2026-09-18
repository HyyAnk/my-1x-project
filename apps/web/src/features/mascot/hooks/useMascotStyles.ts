import type { MascotProfile } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { useMascotStyleCrud, type UseMascotStyleCrudResult } from "./useMascotStyleCrud";
import { useMascotBatchGeneration, type UseMascotBatchGenerationResult } from "./useMascotBatchGeneration";
import { useMascotSlotModal, type UseMascotSlotModalResult } from "./useMascotSlotModal";
import { useMascotStyleQueue, type UseMascotStyleQueueResult } from "./styleQueue";

export type { BatchProgressState } from "./useMascotBatchGeneration";
export type { EditingSlotInfo } from "./useMascotSlotModal";
export type { StyleQueueProgressState } from "./styleQueue";

export type UseMascotStylesProps = {
  mascot: MascotProfile | null;
  onMascotUpdated: (mascot: MascotProfile) => void;
  onNotice: (notice: Notice) => void;
};

export type UseMascotStylesResult = UseMascotStyleCrudResult &
  UseMascotBatchGenerationResult &
  UseMascotSlotModalResult &
  UseMascotStyleQueueResult;

/**
 * Coordinator hook for Mascot Styles, poses, multi-state variant workflows, and style concept queue.
 * Composes CRUD operations, batch variant generation, style concept queueing, and slot modal management.
 */
export function useMascotStyles({ mascot, onMascotUpdated, onNotice }: UseMascotStylesProps): UseMascotStylesResult {
  const styleCrud = useMascotStyleCrud({
    mascot,
    onMascotUpdated,
    onNotice,
  });

  const styleQueue = useMascotStyleQueue({
    mascot,
    onMascotUpdated,
    onNotice,
  });

  const batchGen = useMascotBatchGeneration({
    mascot,
    activeStyleId: styleCrud.activeStyleId,
    activeStyle: styleCrud.activeStyle,
    onMascotUpdated,
    onNotice,
  });

  const slotModal = useMascotSlotModal({
    mascot,
    activeStyleId: styleCrud.activeStyleId,
    activeStyle: styleCrud.activeStyle,
    onMascotUpdated,
    onNotice,
  });

  return {
    ...styleCrud,
    ...styleQueue,
    ...batchGen,
    ...slotModal,
  };
}
