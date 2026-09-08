import {
  MASCOT_ACTION_META,
  type AppConfig,
  type GenerateMascotSlotInput,
  type MascotActionType,
  type MascotProfile,
  type MascotSpriteAction,
  type MascotStateVariant,
  getMascotSlotDefaultPreset,
  pickRandomUnusedPose,
} from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import type { StudioLogger } from "../../logger.js";
import { withMascotWriteLock } from "../../repository/mascots.js";
import { buildMascotActionPrompt, buildMascotConceptPrompt, buildMascotStyleConceptPrompt } from "../mascotPromptContract.js";
import { generateProceduralMascotArt, generateProceduralStateArt } from "./proceduralArt.js";
import { generateMascotArtWithFallback } from "./services/mascotAiImageClient.js";
import { loadMasterReferenceImageBase64, loadMascotAssetBase64ByUrl } from "./services/mascotAssetLoader.js";

export { generateMascotAiImageBytes } from "./services/mascotAiImageClient.js";
export { loadMascotAssetBase64ByUrl } from "./services/mascotAssetLoader.js";
export { generateMascotStyleBatch } from "./services/mascotBatchScheduler.js";

function deletePreviousMascotAsset(repository: RepositoryService, mascotId: string, prevUrl?: string | null, newFilename?: string): void {
  if (!prevUrl) return;
  const prevFilename = prevUrl.split("/").pop();
  if (prevFilename && prevFilename !== newFilename && typeof repository.deleteMascotAssetFile === "function") {
    void repository.deleteMascotAssetFile(mascotId, prevFilename);
  }
}

function resolveSlotPromptModifier(
  style: NonNullable<MascotProfile["styles"]>[number],
  state: "thinking" | "celebrate" | "idle" | "wave" | "point" | "oops" | "outro",
  slotIndex: number,
  explicitPrompt?: string,
): string | undefined {
  if (explicitPrompt?.trim()) return explicitPrompt.trim();
  if (state !== "thinking" && state !== "celebrate") return undefined;
  const otherSlots = (style.states[state] || []).filter((s) => s.slot_index !== slotIndex);
  const otherUsed = otherSlots
    .map((s) => s.prompt_modifier?.trim() || (s.image_url?.trim() ? getMascotSlotDefaultPreset(state, s.slot_index) : ""))
    .filter(Boolean);
  return pickRandomUnusedPose(state, otherUsed).prompt;
}

async function resolveSlotReferenceImage(
  repository: RepositoryService,
  mascot: MascotProfile,
  styleAnchorUrl?: string | null,
  logger?: StudioLogger,
): Promise<{ referenceImageBase64?: string; hasStyleAnchor: boolean }> {
  if (styleAnchorUrl) {
    const anchorBase64 = await loadMascotAssetBase64ByUrl(repository, mascot.id, styleAnchorUrl, logger);
    if (anchorBase64) return { referenceImageBase64: anchorBase64, hasStyleAnchor: true };
  }
  const masterBase64 = await loadMasterReferenceImageBase64(repository, mascot, logger);
  return { referenceImageBase64: masterBase64, hasStyleAnchor: false };
}

export async function generateMascotConceptArt(
  repository: RepositoryService,
  mascot: MascotProfile,
  imageConfig: AppConfig["image_generation"],
  overridePrompt?: string,
  logger?: StudioLogger,
): Promise<{ master_image_url: string; prompt_used: string; placeholder: boolean }> {
  const fullPrompt = buildMascotConceptPrompt(mascot, overridePrompt);
  const filename = `master_concept_${Date.now()}.png`;

  const { mattedBytes, placeholder } = await generateMascotArtWithFallback({
    prompt: fullPrompt,
    imageConfig,
    options: {
      aspectRatio: "1:1",
      size: "1024x1024",
      background: "opaque",
      cancellationSignal: AbortSignal.timeout(90_000),
    },
    logger,
    logContext: { profileId: mascot.id },
    actionLabel: `mascot concept for ${mascot.name} (${mascot.id})`,
    fallbackArt: () => generateProceduralMascotArt(mascot.name, mascot.color_theme, "master"),
  });

  const { assetUrl, prompt_used: promptUsed } = await withMascotWriteLock(mascot.id, async () => {
    deletePreviousMascotAsset(repository, mascot.id, mascot.master_image_url, filename);
    const savedUrl = await repository.saveMascotAsset(mascot.id, filename, mattedBytes);
    const latest = await repository.getMascot(mascot.id).catch(() => mascot);
    await repository.saveMascot({
      ...latest,
      master_image_url: savedUrl,
      master_prompt: overridePrompt || latest.master_prompt || latest.description || "",
      updated_at: new Date().toISOString(),
    });
    return { assetUrl: savedUrl, prompt_used: fullPrompt };
  });

  return { master_image_url: assetUrl, prompt_used: promptUsed, placeholder };
}

/**
 * @deprecated Kept as a compatibility adapter for existing clients. New mascot
 * authoring writes one action image (frames_count=1) and uses V2 CSS motion;
 * legacy multi-frame strips are read-only compatibility assets.
 */
export async function generateMascotActionSprite(
  repository: RepositoryService,
  mascot: MascotProfile,
  action: MascotActionType,
  imageConfig: AppConfig["image_generation"],
  options: { prompt?: string; frames_count?: number; fps?: number; loop?: boolean } = {},
  logger?: StudioLogger,
): Promise<{ action_sprite: MascotSpriteAction; prompt_used: string; placeholder: boolean }> {
  const meta = MASCOT_ACTION_META[action] || MASCOT_ACTION_META.idle;
  const framesCount = options.frames_count !== undefined ? options.frames_count : meta.defaultFrames || 1;
  const fps = options.fps || meta.defaultFps || 8;
  const loop = options.loop !== undefined ? options.loop : true;

  const referenceImageBase64 = await loadMasterReferenceImageBase64(repository, mascot, logger);
  const fullPrompt = buildMascotActionPrompt(mascot, action, {
    prompt: options.prompt,
    hasReferenceImage: Boolean(referenceImageBase64),
  });

  const filename = `state_${action}_${Date.now()}.png`;
  const { mattedBytes, placeholder } = await generateMascotArtWithFallback({
    prompt: fullPrompt,
    hasReferenceImage: Boolean(referenceImageBase64),
    imageConfig,
    options: {
      aspectRatio: framesCount === 1 ? "1:1" : "16:9",
      size: framesCount === 1 ? "1024x1024" : "1280x720",
      referenceImageBase64,
      background: "opaque",
      cancellationSignal: AbortSignal.timeout(90_000),
    },
    logger,
    logContext: { profileId: mascot.id },
    actionLabel: `mascot state for ${mascot.name} action ${action} (frames: ${framesCount}, hasRefImage: ${Boolean(referenceImageBase64)})`,
    fallbackArt: () => generateProceduralStateArt(mascot.name, mascot.color_theme, action, framesCount),
  });

  const actionSprite = await withMascotWriteLock(mascot.id, async () => {
    deletePreviousMascotAsset(repository, mascot.id, mascot.actions[action]?.sprite_url, filename);
    const assetUrl = await repository.saveMascotAsset(mascot.id, filename, mattedBytes);
    const latest = await repository.getMascot(mascot.id).catch(() => mascot);
    const nextSprite: MascotSpriteAction = {
      action,
      sprite_url: assetUrl,
      frames_count: framesCount,
      fps,
      loop,
      frame_width: framesCount === 1 ? 512 : 256,
      frame_height: framesCount === 1 ? 512 : 256,
      offset_x: latest.actions[action]?.offset_x || 0,
      offset_y: latest.actions[action]?.offset_y || 0,
      preview_url: assetUrl,
      motion_preset: meta.motionPreset,
    };

    await repository.saveMascot({
      ...latest,
      actions: { ...latest.actions, [action]: nextSprite },
      updated_at: new Date().toISOString(),
    });
    return nextSprite;
  });

  return { action_sprite: actionSprite, prompt_used: fullPrompt, placeholder };
}

export async function generateMascotStyleSlot(
  repository: RepositoryService,
  mascot: MascotProfile,
  styleId: string,
  input: GenerateMascotSlotInput,
  imageConfig: AppConfig["image_generation"],
  logger?: StudioLogger,
  options: { signal?: AbortSignal } = {},
): Promise<{ mascot: MascotProfile; slot: MascotStateVariant; prompt_used: string; placeholder: boolean }> {
  const style = mascot.styles?.find((s) => s.id === styleId);
  if (!style) throw new Error(`Style ${styleId} not found`);

  const effectivePromptModifier = resolveSlotPromptModifier(style, input.state, input.slot_index, input.prompt_modifier);
  const { referenceImageBase64, hasStyleAnchor } = await resolveSlotReferenceImage(repository, mascot, style.anchor_image_url, logger);

  const fullPrompt = buildMascotActionPrompt(mascot, input.state, {
    prompt: effectivePromptModifier,
    keyword: style.keyword,
    hasReferenceImage: Boolean(referenceImageBase64),
    hasStyleAnchor,
    slotIndex: input.slot_index,
  });

  const filename = `style_${styleId}_${input.state}_slot${input.slot_index}_${Date.now()}.png`;
  const { mattedBytes, placeholder } = await generateMascotArtWithFallback({
    prompt: fullPrompt,
    hasReferenceImage: Boolean(referenceImageBase64),
    imageConfig,
    options: {
      aspectRatio: "1:1",
      size: "1024x1024",
      referenceImageBase64,
      background: "opaque",
      cancellationSignal: options.signal ?? AbortSignal.timeout(90_000),
      idempotencyKey: `mascot_${mascot.id}_${styleId}_${input.state}_s${input.slot_index}_${Date.now()}`,
    },
    logger,
    logContext: { profileId: mascot.id, styleId, state: input.state, slotIndex: input.slot_index },
    actionLabel: `mascot style slot for ${mascot.name} style ${styleId} (${input.state} slot ${input.slot_index})`,
    fallbackArt: () => generateProceduralStateArt(mascot.name, mascot.color_theme, input.state, 1),
  });

  const existingSlot = style.states[input.state]?.find((s) => s.slot_index === input.slot_index);
  deletePreviousMascotAsset(repository, mascot.id, existingSlot?.image_url, filename);

  const assetUrl = await repository.saveMascotAsset(mascot.id, filename, mattedBytes);
  const updatedMascot = await repository.updateMascotSlot(mascot.id, {
    style_id: styleId,
    state: input.state,
    slot_index: input.slot_index,
    image_url: assetUrl,
    prompt_modifier: effectivePromptModifier,
  });

  const updatedSlot = updatedMascot.styles
    ?.find((s) => s.id === styleId)
    ?.states[input.state]?.find((s) => s.slot_index === input.slot_index);
  if (!updatedSlot) throw new Error(`Updated slot not found for style ${styleId}, state ${input.state}, slot ${input.slot_index}`);

  return { mascot: updatedMascot, slot: updatedSlot, prompt_used: fullPrompt, placeholder };
}

export async function generateMascotStyleConcept(
  repository: RepositoryService,
  mascot: MascotProfile,
  styleId: string,
  imageConfig: AppConfig["image_generation"],
  options: { prompt?: string; signal?: AbortSignal } = {},
  logger?: StudioLogger,
): Promise<{
  anchor_image_url: string;
  raw_image_url: string;
  prompt_used: string;
  placeholder: boolean;
}> {
  const style = mascot.styles?.find((s) => s.id === styleId);
  if (!style) throw new Error(`Style ${styleId} not found`);

  const referenceImageBase64 = await loadMasterReferenceImageBase64(repository, mascot, logger);
  const fullPrompt = buildMascotStyleConceptPrompt(mascot, style, options.prompt);

  const timestamp = Date.now();
  const mattedFilename = `style_${styleId}_anchor_${timestamp}.png`;
  const rawFilename = `style_${styleId}_anchor_raw_${timestamp}.png`;

  const { mattedBytes, rawBytes, placeholder } = await generateMascotArtWithFallback({
    prompt: fullPrompt,
    hasReferenceImage: Boolean(referenceImageBase64),
    imageConfig,
    options: {
      aspectRatio: "1:1",
      size: "1024x1024",
      referenceImageBase64,
      background: "opaque",
      cancellationSignal: options.signal ?? AbortSignal.timeout(90_000),
      idempotencyKey: `mascot_${mascot.id}_${styleId}_anchor_${timestamp}`,
    },
    logger,
    logContext: { profileId: mascot.id, styleId, hasRefImage: Boolean(referenceImageBase64) },
    actionLabel: `mascot style concept for ${mascot.name} style ${style.name} (${styleId})`,
    fallbackArt: () => generateProceduralMascotArt(mascot.name, mascot.color_theme, `style_${styleId}`),
  });

  const { anchor_image_url, raw_image_url } = await withMascotWriteLock(mascot.id, async () => {
    deletePreviousMascotAsset(repository, mascot.id, style.anchor_image_url, mattedFilename);
    deletePreviousMascotAsset(repository, mascot.id, style.anchor_image_url?.replace("_anchor_", "_anchor_raw_"), rawFilename);

    const savedAnchorUrl = await repository.saveMascotAsset(mascot.id, mattedFilename, mattedBytes);
    const savedRawUrl = await repository.saveMascotAsset(mascot.id, rawFilename, rawBytes);

    if (typeof repository.getMascot === "function" && typeof repository.saveMascot === "function") {
      const latest = await repository.getMascot(mascot.id).catch(() => mascot);
      const updatedStyles = (latest.styles || []).map((s) =>
        s.id === styleId ? { ...s, anchor_image_url: savedAnchorUrl, updated_at: new Date().toISOString() } : s,
      );
      await repository.saveMascot({ ...latest, styles: updatedStyles, updated_at: new Date().toISOString() });
    }

    return { anchor_image_url: savedAnchorUrl, raw_image_url: savedRawUrl };
  });

  return {
    anchor_image_url,
    raw_image_url,
    prompt_used: fullPrompt,
    placeholder,
  };
}
