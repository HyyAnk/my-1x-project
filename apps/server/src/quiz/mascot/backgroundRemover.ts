import { readFile } from "node:fs/promises";
import { ALL_MASCOT_ACTIONS, type MascotActionType, type MascotProfile, type MascotStyle } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import type { StudioLogger } from "../../logger.js";
import { removeImageBackground } from "../../utils/imageMatting.js";

import {
  parseStyleSlotTarget,
  type MascotStyleSlotTarget,
  type MascotMattingTarget,
  type ParsedStyleSlotTarget,
} from "./mascotSlotTargetParser.js";
export { parseStyleSlotTarget, type MascotStyleSlotTarget, type MascotMattingTarget, type ParsedStyleSlotTarget };

/**
 * Removes background from an asset referenced by URL, saves back to repository, and returns updated URL.
 */
async function matMascotAssetUrl(
  repository: RepositoryService,
  mascotId: string,
  imageUrl: string,
  fallbackFilename: string,
  logger?: StudioLogger,
  contextDesc?: string,
): Promise<string> {
  if (!imageUrl?.trim()) {
    return imageUrl;
  }

  try {
    if (imageUrl.startsWith("data:")) {
      const base64Data = imageUrl.replace(/^data:[^;]+;base64,/i, "");
      const rawBytes = Buffer.from(base64Data, "base64");
      const transparentBytes = await removeImageBackground(rawBytes);
      return await repository.saveMascotAsset(mascotId, fallbackFilename, transparentBytes);
    }

    const rawFilename = imageUrl.split("/").pop();
    const filename = rawFilename?.split("?")[0];
    if (!filename) return imageUrl;

    const file = await repository.getMascotAssetFile(mascotId, filename);
    const rawBytes = await readFile(file.absolutePath);
    const transparentBytes = await removeImageBackground(rawBytes);
    return await repository.saveMascotAsset(mascotId, filename, transparentBytes);
  } catch (error) {
    logger?.warn(
      `Failed to remove background for mascot asset ${contextDesc ?? imageUrl} (${mascotId}): ${error instanceof Error ? error.message : String(error)}`,
      { step: "mascot" },
    );
    return imageUrl;
  }
}

async function matMasterImage(
  repository: RepositoryService,
  mascotId: string,
  masterImageUrl?: string | null,
  logger?: StudioLogger,
): Promise<string | null> {
  if (!masterImageUrl) return null;
  return matMascotAssetUrl(repository, mascotId, masterImageUrl, `master_${Date.now()}.png`, logger, "master image");
}

async function matActionSprites(
  repository: RepositoryService,
  mascotId: string,
  actions: MascotProfile["actions"],
  target: MascotMattingTarget,
  logger?: StudioLogger,
): Promise<MascotProfile["actions"]> {
  const isAll = target === "all";
  const isMascotAction = typeof target === "string" && ALL_MASCOT_ACTIONS.includes(target as MascotActionType);
  const actionsToProcess = isAll ? ALL_MASCOT_ACTIONS : isMascotAction ? [target as MascotActionType] : [];
  if (actionsToProcess.length === 0) return { ...actions };

  const updatedActions = { ...actions };
  for (const action of actionsToProcess) {
    const sprite = actions[action];
    if (sprite?.sprite_url) {
      const updatedSpriteUrl = await matMascotAssetUrl(
        repository,
        mascotId,
        sprite.sprite_url,
        `sprite_${action}_${Date.now()}.png`,
        logger,
        `sprite action ${action}`,
      );
      updatedActions[action] = {
        ...sprite,
        sprite_url: updatedSpriteUrl,
      };
    }
  }
  return updatedActions;
}

async function matAllStyleVariants(
  repository: RepositoryService,
  mascotId: string,
  styles: MascotStyle[],
  logger?: StudioLogger,
): Promise<void> {
  for (const style of styles) {
    for (const state of ["thinking", "celebrate"] as const) {
      const variants = style.states?.[state] ?? [];
      for (const variant of variants) {
        if (variant.image_url && variant.image_url.trim().length > 0) {
          const updatedUrl = await matMascotAssetUrl(
            repository,
            mascotId,
            variant.image_url,
            `style_${style.id}_${state}_slot_${variant.slot_index}_${Date.now()}.png`,
            logger,
            `style ${style.id} ${state} slot ${variant.slot_index}`,
          );
          variant.image_url = updatedUrl;
        }
      }
    }
  }
}

async function matTargetedStyleSlots(
  repository: RepositoryService,
  mascotId: string,
  styles: MascotStyle[],
  slotTarget: ParsedStyleSlotTarget,
  activeStyleId?: string | null,
  logger?: StudioLogger,
): Promise<void> {
  let targetStyles: MascotStyle[] = [];
  if (slotTarget.styleId) {
    const found = styles.find((s) => s.id === slotTarget.styleId);
    if (found) targetStyles = [found];
    else logger?.warn(`Style ${slotTarget.styleId} not found on mascot ${mascotId}`, { step: "mascot" });
  } else {
    const active = styles.find((s) => s.id === activeStyleId) || styles.find((s) => s.is_default) || styles[0];
    if (active) targetStyles = [active];
    else logger?.warn(`No active or default style found on mascot ${mascotId}`, { step: "mascot" });
  }

  for (const style of targetStyles) {
    const statesToCheck: Array<"thinking" | "celebrate"> = slotTarget.state ? [slotTarget.state] : ["thinking", "celebrate"];

    for (const state of statesToCheck) {
      const variants = style.states?.[state] ?? [];
      for (const variant of variants) {
        if (slotTarget.slotIndex !== undefined && variant.slot_index !== slotTarget.slotIndex) {
          continue;
        }
        if (variant.image_url?.trim()) {
          const updatedUrl = await matMascotAssetUrl(
            repository,
            mascotId,
            variant.image_url,
            `style_${style.id}_${state}_slot_${variant.slot_index}_${Date.now()}.png`,
            logger,
            `style ${style.id} ${state} slot ${variant.slot_index}`,
          );
          variant.image_url = updatedUrl;
        }
      }
    }
  }
}

/**
 * Removes background from an existing mascot master image, action sprites, or style variant slots
 */
export async function removeMascotAssetBackground(
  repository: RepositoryService,
  mascotId: string,
  target: MascotMattingTarget = "all",
  logger?: StudioLogger,
): Promise<MascotProfile> {
  const mascot = await repository.getMascot(mascotId);
  let updatedMaster = mascot.master_image_url;
  let updatedActions = { ...mascot.actions };

  const updatedStyles: MascotStyle[] = (mascot.styles ?? []).map((style) => ({
    ...style,
    states: {
      thinking: (style.states?.thinking ?? []).map((v) => ({ ...v })),
      celebrate: (style.states?.celebrate ?? []).map((v) => ({ ...v })),
    },
  }));

  const isAll = target === "all";
  const isMaster = target === "master";
  const slotTarget = !isAll && !isMaster ? parseStyleSlotTarget(target) : null;

  if (isAll || isMaster) {
    updatedMaster = await matMasterImage(repository, mascotId, mascot.master_image_url, logger);
  }

  if (isAll || (!isMaster && !slotTarget)) {
    updatedActions = await matActionSprites(repository, mascotId, mascot.actions, target, logger);
  }

  if (isAll) {
    await matAllStyleVariants(repository, mascotId, updatedStyles, logger);
    for (const style of updatedStyles) style.style_revision = (style.style_revision ?? 1) + 1;
  } else if (slotTarget) {
    await matTargetedStyleSlots(repository, mascotId, updatedStyles, slotTarget, mascot.active_style_id, logger);
    const targetStyle = slotTarget.styleId
      ? updatedStyles.find((style) => style.id === slotTarget.styleId)
      : (updatedStyles.find((style) => style.id === mascot.active_style_id) ??
        updatedStyles.find((style) => style.is_default) ??
        updatedStyles[0]);
    if (targetStyle) targetStyle.style_revision = (targetStyle.style_revision ?? 1) + 1;
  }

  return repository.saveMascot({
    ...mascot,
    master_image_url: updatedMaster,
    actions: updatedActions,
    styles: updatedStyles,
    updated_at: new Date().toISOString(),
  });
}
