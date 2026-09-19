import type { AppConfig, GenerateMascotSlotInput, MascotProfile, MascotStateVariant } from "@studio/shared";
import type { RepositoryService } from "../../../repository.js";
import type { StudioLogger } from "../../../logger.js";
import { buildMascotSlotPrompt } from "../../mascotPromptContract.js";
import { generateProceduralStateArt } from "../proceduralArt.js";
import { generateMascotArtWithFallback } from "../services/mascotAiImageClient.js";
import { deletePreviousMascotAsset, resolveSlotPromptModifier, resolveSlotReferenceImage } from "./artGeneratorHelpers.js";

export async function generateMascotStyleSlot(
  repository: RepositoryService,
  mascot: MascotProfile,
  styleId: string,
  input: GenerateMascotSlotInput & { composition?: "full_body" | "half_body_16_9" },
  imageConfig: AppConfig["image_generation"],
  logger?: StudioLogger,
  options: {
    signal?: AbortSignal;
    composition?: "full_body" | "half_body_16_9";
    imageFallbackConfig?: AppConfig["image_fallback"];
  } = {},
): Promise<{ mascot: MascotProfile; slot: MascotStateVariant; prompt_used: string; placeholder: boolean }> {
  const style = mascot.styles?.find((s) => s.id === styleId);
  if (!style) throw new Error(`Style ${styleId} not found`);

  const effectiveComposition = input.composition ?? options.composition ?? "half_body_16_9";
  const isHalfBody16x9 = effectiveComposition === "half_body_16_9";

  const effectivePromptModifier = resolveSlotPromptModifier(style, input.state, input.slot_index, input.prompt_modifier);
  const { referenceImageBase64, hasStyleAnchor } = await resolveSlotReferenceImage(repository, mascot, style, logger);

  const fullPrompt = buildMascotSlotPrompt(mascot, input.state, {
    prompt: effectivePromptModifier,
    keyword: style.keyword,
    hasReferenceImage: Boolean(referenceImageBase64),
    hasStyleAnchor,
    slotIndex: input.slot_index,
    composition: effectiveComposition,
  });

  const timestamp = Date.now();
  const filename = `style_${styleId}_${input.state}_slot${input.slot_index}_${timestamp}.png`;
  const rawFilename = `style_${styleId}_${input.state}_slot${input.slot_index}_raw_${timestamp}.png`;
  const { mattedBytes, rawBytes, placeholder } = await generateMascotArtWithFallback({
    prompt: fullPrompt,
    hasReferenceImage: Boolean(referenceImageBase64),
    imageConfig,
    imageFallbackConfig: options.imageFallbackConfig,
    options: {
      aspectRatio: isHalfBody16x9 ? "16:9" : "1:1",
      size: isHalfBody16x9 ? "1280x720" : "1024x1024",
      referenceImageBase64,
      background: "opaque",
      cancellationSignal: options.signal,
      idempotencyKey: `mascot_${mascot.id}_${styleId}_${input.state}_s${input.slot_index}_${timestamp}`,
    },
    logger,
    logContext: { profileId: mascot.id, styleId, state: input.state, slotIndex: input.slot_index },
    actionLabel: `mascot style slot for ${mascot.name} style ${styleId} (${input.state} slot ${input.slot_index})`,
    fallbackArt: () => generateProceduralStateArt(mascot.name, mascot.color_theme, input.state, 1, { composition: effectiveComposition }),
  });
  options.signal?.throwIfAborted();

  const existingSlot = style.states[input.state]?.find((s) => s.slot_index === input.slot_index);
  deletePreviousMascotAsset(repository, mascot.id, existingSlot?.image_url, filename);
  deletePreviousMascotAsset(repository, mascot.id, existingSlot?.raw_image_url, rawFilename);

  const assetUrl = await repository.saveMascotAsset(mascot.id, filename, mattedBytes);
  options.signal?.throwIfAborted();
  const rawAssetUrl = await repository.saveMascotAsset(mascot.id, rawFilename, rawBytes);
  options.signal?.throwIfAborted();
  const updatedMascot = await repository.updateMascotSlot(mascot.id, {
    style_id: styleId,
    state: input.state,
    slot_index: input.slot_index,
    image_url: assetUrl,
    raw_image_url: rawAssetUrl,
    transparent_image_url: assetUrl,
    prompt_modifier: effectivePromptModifier,
  });

  const updatedSlot = updatedMascot.styles
    ?.find((s) => s.id === styleId)
    ?.states[input.state]?.find((s) => s.slot_index === input.slot_index);
  if (!updatedSlot) throw new Error(`Updated slot not found for style ${styleId}, state ${input.state}, slot ${input.slot_index}`);

  return { mascot: updatedMascot, slot: updatedSlot, prompt_used: fullPrompt, placeholder };
}

/**
 * Convenience helper to generate a Step 2 large half-body 16:9 source image for a style slot
 */
export async function generateMascotSourceImageSlot(
  repository: RepositoryService,
  mascot: MascotProfile,
  styleId: string,
  input: GenerateMascotSlotInput,
  imageConfig: AppConfig["image_generation"],
  logger?: StudioLogger,
  options: { signal?: AbortSignal; imageFallbackConfig?: AppConfig["image_fallback"] } = {},
): Promise<{ mascot: MascotProfile; slot: MascotStateVariant; prompt_used: string; placeholder: boolean }> {
  return generateMascotStyleSlot(repository, mascot, styleId, input, imageConfig, logger, {
    ...options,
    composition: "half_body_16_9",
  });
}
