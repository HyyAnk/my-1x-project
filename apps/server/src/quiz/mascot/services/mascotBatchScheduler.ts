import { getMascotSlotDefaultPreset, pickShuffledUnusedPoses } from "@studio/shared";
import type { AppConfig, BatchGenerateStyleSlotsInput, MascotProfile } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import { generateMascotStyleSlot } from "../artGenerator.js";

/**
 * Executes batch slot generation for a mascot style with bounded concurrency,
 * state filtering, slot preset assignments, and cancellation handling.
 */
export async function generateMascotStyleBatch(
  repository: RepositoryService,
  mascot: MascotProfile,
  styleId: string,
  input: BatchGenerateStyleSlotsInput,
  imageConfig: AppConfig["image_generation"],
  logger?: StudioLogger,
  options: { signal?: AbortSignal } = {},
): Promise<{ mascot: MascotProfile; generated_count: number; cancelled: boolean }> {
  const style = mascot.styles?.find((s) => s.id === styleId);
  if (!style) {
    throw new Error(`Style ${styleId} not found`);
  }

  const stateFilter = input.state || "all";
  const statesToProcess: Array<"thinking" | "celebrate"> =
    stateFilter === "all" ? ["thinking", "celebrate"] : [stateFilter];

  const emptySlots: Array<{ state: "thinking" | "celebrate"; slot_index: number; prompt_modifier?: string }> = [];

  for (const state of statesToProcess) {
    const slots = style.states[state] || [];
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

    if (emptySlotsForState.length > 0) {
      const preassignedPrompts = emptySlotsForState
        .map((s) => s.existingPrompt)
        .filter((p): p is string => Boolean(p));

      const alreadyUsedPrompts = [...filledPrompts, ...preassignedPrompts];
      const slotsNeedingPose = emptySlotsForState.filter((s) => !s.existingPrompt);

      const assignedPoses = pickShuffledUnusedPoses(
        state,
        alreadyUsedPrompts,
        slotsNeedingPose.length,
      );

      let poseIdx = 0;
      for (const item of emptySlotsForState) {
        const promptModifier = item.existingPrompt || assignedPoses[poseIdx++]?.prompt;
        emptySlots.push({
          state,
          slot_index: item.slot_index,
          prompt_modifier: promptModifier,
        });
      }
    }
  }

  const CONCURRENCY = 3;
  let queueIndex = 0;
  let generatedCount = 0;

  const runWorker = async () => {
    while (queueIndex < emptySlots.length) {
      if (options.signal?.aborted) break;
      const itemIndex = queueIndex++;
      if (itemIndex >= emptySlots.length) break;
      const item = emptySlots[itemIndex]!;
      const latestMascot = await repository.getMascot(mascot.id);
      await generateMascotStyleSlot(
        repository,
        latestMascot,
        styleId,
        {
          style_id: styleId,
          state: item.state,
          slot_index: item.slot_index,
          prompt_modifier: item.prompt_modifier,
        },
        imageConfig,
        logger,
        { signal: options.signal },
      );
      generatedCount++;
    }
  };

  const workerCount = Math.min(CONCURRENCY, emptySlots.length);
  const workers = Array.from({ length: workerCount }, () => runWorker());
  await Promise.all(workers);

  const finalMascot = await repository.getMascot(mascot.id);
  return { mascot: finalMascot, generated_count: generatedCount, cancelled: Boolean(options.signal?.aborted) };
}
