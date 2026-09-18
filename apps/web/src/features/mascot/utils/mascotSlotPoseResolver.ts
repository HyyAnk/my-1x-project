import type { MascotStateVariant, MascotStyle } from "@studio/shared";
import { getMascotSlotDefaultPreset, pickShuffledUnusedPoses } from "@studio/shared";
import type { BatchSlotItem } from "../types/mascotBatch.types";

/**
 * Resolves empty slots for a single state ("thinking" | "celebrate") and assigns
 * either existing prompt modifiers or randomly shuffled unused poses from the library.
 */
export function resolveSlotsForState(slots: MascotStateVariant[], state: "thinking" | "celebrate"): BatchSlotItem[] {
  const filledPrompts: string[] = [];
  const emptySlotsForState: Array<{ slot_index: number; existingPrompt?: string }> = [];

  for (let i = 1; i <= 10; i++) {
    const slot = slots.find((s) => s.slot_index === i);
    if (slot && slot.image_url && slot.image_url.trim() !== "") {
      if (slot.prompt_modifier?.trim()) {
        filledPrompts.push(slot.prompt_modifier.trim());
      } else {
        filledPrompts.push(getMascotSlotDefaultPreset(state, i));
      }
    } else {
      emptySlotsForState.push({
        slot_index: i,
        existingPrompt: slot?.prompt_modifier?.trim() || undefined,
      });
    }
  }

  if (emptySlotsForState.length === 0) {
    return [];
  }

  const preassignedPrompts = emptySlotsForState.map((s) => s.existingPrompt).filter((p): p is string => Boolean(p));

  const alreadyUsedPrompts = [...filledPrompts, ...preassignedPrompts];
  const slotsNeedingPose = emptySlotsForState.filter((s) => !s.existingPrompt);

  const assignedPoses = pickShuffledUnusedPoses(state, alreadyUsedPrompts, slotsNeedingPose.length);

  let poseIdx = 0;
  return emptySlotsForState.map((item) => ({
    state,
    slotIndex: item.slot_index,
    promptModifier: item.existingPrompt || assignedPoses[poseIdx++]?.prompt,
  }));
}

/**
 * Resolves all empty slots across one or all states in a MascotStyle,
 * assigning shuffled unused poses to slots that don't have existing prompt modifiers.
 */
export function resolveSlotsToGenerate(style: MascotStyle, stateFilter: "thinking" | "celebrate" | "all" = "all"): BatchSlotItem[] {
  const statesToProcess: Array<"thinking" | "celebrate"> = stateFilter === "all" ? ["thinking", "celebrate"] : [stateFilter];

  const slotsToGenerate: BatchSlotItem[] = [];

  for (const st of statesToProcess) {
    const slots = style.states[st] || [];
    const stateSlots = resolveSlotsForState(slots, st);
    slotsToGenerate.push(...stateSlots);
  }

  return slotsToGenerate;
}
