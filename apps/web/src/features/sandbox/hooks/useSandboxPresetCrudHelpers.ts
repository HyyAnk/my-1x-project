import type { VisualPresetItem } from "@studio/shared";
import type { Notice } from "../../../components/types";
import type { SandboxDesignState } from "./useSandboxDesignState";
import type { SandboxMascotState } from "./useSandboxMascotState";
import type { SandboxBrandNameState } from "./useSandboxBrandNameState";
import type { SandboxTransitionState } from "./useSandboxTransitionState";
import { createCustomPreset } from "../services/sandboxPresetService";

export {
  createCustomPreset,
  duplicateCustomPreset,
  loadStoredCustomPresets,
  saveStoredCustomPresets,
  updateCustomPreset,
} from "../services/sandboxPresetService";

export type SandboxPresetTransitionInput = Pick<SandboxTransitionState, "syncFromPreset"> &
  Partial<Pick<SandboxTransitionState, "transitionId" | "transitionDuration">>;

export interface UseSandboxPresetCrudInput {
  design: SandboxDesignState;
  mascot: SandboxMascotState;
  brandName?: SandboxBrandNameState;
  transition?: SandboxPresetTransitionInput;
  onNotice?: (notice: NonNullable<Notice>) => void;
  loadedPresetId: string | null;
  onSelectLoadedPreset: (id: string | null) => void;
  newPresetName: string;
  onSaveSuccess?: () => void;
}

export function resolvePresetTransitions(transition?: SandboxPresetTransitionInput) {
  if (!transition?.transitionId) return undefined;
  return {
    scene: {
      id: transition.transitionId,
      durationSeconds: transition.transitionDuration ?? 0.5,
    },
  };
}

export function createCustomPresetItem({
  name,
  design,
  mascot,
  channelBrandName,
  transition,
  defaultDesc,
}: {
  name: string;
  design: SandboxDesignState;
  mascot: SandboxMascotState;
  channelBrandName?: string;
  transition?: SandboxPresetTransitionInput;
  defaultDesc: string;
}) {
  const currentTransitions = resolvePresetTransitions(transition);
  const preset = createCustomPreset({
    name,
    defaultDesc,
    design,
    mascot,
    channelBrandName,
    transitions: currentTransitions,
  });
  return { preset, currentTransitions };
}

export function toPresetCreatePayload(preset: VisualPresetItem, transitions?: VisualPresetItem["transitions"]) {
  return {
    ...preset,
    background_style: preset.background_style || "candy_rays",
    ...(transitions ? { transitions } : {}),
  };
}

export function toPresetUpdatePayload(preset: VisualPresetItem) {
  return {
    theme: preset.theme,
    palette_id: preset.palette_id,
    thinking_bar_style: preset.thinking_bar_style,
    question_box_style: preset.question_box_style,
    answer_card_style: preset.answer_card_style,
    counter_style: preset.counter_style,
    background_style: preset.background_style,
    transitions: preset.transitions,
  };
}

export function resolveCustomPresets(
  apiAvailable: boolean,
  isLoading: boolean,
  hasError: unknown,
  apiPresets: unknown[],
  localPresets: VisualPresetItem[],
): VisualPresetItem[] {
  if (!apiAvailable || isLoading || hasError) {
    return localPresets;
  }
  return apiPresets as VisualPresetItem[];
}
