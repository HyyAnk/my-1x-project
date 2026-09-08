import { readFile } from "node:fs/promises";
import { ALL_MASCOT_ACTIONS, type MascotActionType, type MascotProfile, type MascotStyle } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import type { StudioLogger } from "../../logger.js";
import { removeImageBackground } from "../../utils/imageMatting.js";

export interface MascotStyleSlotTarget {
  /** Optional style identifier. If omitted, uses active_style_id or default/first style. */
  style_id?: string;
  styleId?: string;
  /** State to target ("thinking" | "celebrate") */
  state?: "thinking" | "celebrate";
  /** Slot index (1..10). If omitted, targets all filled slots in the specified state/style */
  slot_index?: number;
  slotIndex?: number;
}

export type MascotMattingTarget =
  | "master"
  | "all"
  | MascotActionType
  | MascotStyleSlotTarget
  | `style:${string}:${"thinking" | "celebrate"}:${number}`
  | `slot:${string}:${"thinking" | "celebrate"}:${number}`
  | `${string}:${"thinking" | "celebrate"}:${number}`;

/**
 * Parses target into a structured style slot target if applicable
 */
export function parseStyleSlotTarget(target: unknown): {
  styleId?: string;
  state?: "thinking" | "celebrate";
  slotIndex?: number;
} | null {
  if (!target) return null;

  if (typeof target === "object" && target !== null) {
    const obj = target as Record<string, unknown>;
    const rawState = typeof obj.state === "string" ? obj.state.toLowerCase() : undefined;
    const state = rawState === "thinking" || rawState === "celebrate" ? rawState : undefined;
    const rawSlot = obj.slot_index ?? obj.slotIndex;
    const slotIndex = typeof rawSlot === "number" ? rawSlot : typeof rawSlot === "string" ? parseInt(rawSlot, 10) : undefined;
    const styleId = (obj.style_id ?? obj.styleId) as string | undefined;

    if (state !== undefined || styleId !== undefined || (slotIndex !== undefined && !isNaN(slotIndex))) {
      return {
        styleId: styleId ? String(styleId) : undefined,
        state,
        slotIndex: slotIndex !== undefined && !isNaN(slotIndex) ? slotIndex : undefined,
      };
    }
    return null;
  }

  if (typeof target === "string") {
    const trimmed = target.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return parseStyleSlotTarget(parsed);
      } catch {
        // Not valid JSON, continue with regex parsing
      }
    }

    // Pattern 1: style:<styleId>:<state>:<slotIndex> or slot:<styleId>:<state>:<slotIndex> or <styleId>:<state>:<slotIndex>
    const matchFull = trimmed.match(/^(?:style|slot)?:?([^:]+):(thinking|celebrate):([0-9]+)$/i);
    if (matchFull) {
      return {
        styleId: matchFull[1],
        state: matchFull[2].toLowerCase() as "thinking" | "celebrate",
        slotIndex: parseInt(matchFull[3], 10),
      };
    }

    // Pattern 2: style:<state>:<slotIndex> or slot:<state>:<slotIndex> or <state>:<slotIndex>
    const matchShort = trimmed.match(/^(?:style|slot)?:?(thinking|celebrate):([0-9]+)$/i);
    if (matchShort) {
      return {
        state: matchShort[1].toLowerCase() as "thinking" | "celebrate",
        slotIndex: parseInt(matchShort[2], 10),
      };
    }

    // Pattern 3: style:<styleId>:(thinking|celebrate) or slot:<styleId>:(thinking|celebrate)
    const matchStyleState = trimmed.match(/^(?:style|slot):([^:]+):(thinking|celebrate)$/i);
    if (matchStyleState) {
      return {
        styleId: matchStyleState[1],
        state: matchStyleState[2].toLowerCase() as "thinking" | "celebrate",
      };
    }

    // Pattern 4: style:<styleId>
    const matchStyleOnly = trimmed.match(/^style:([^:]+)$/i);
    if (matchStyleOnly) {
      return {
        styleId: matchStyleOnly[1],
      };
    }

    // Pattern 5: slot:<slotIndex>
    const matchSlotOnly = trimmed.match(/^slot:([0-9]+)$/i);
    if (matchSlotOnly) {
      return {
        slotIndex: parseInt(matchSlotOnly[1], 10),
      };
    }
  }

  return null;
}

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
  if (!imageUrl || !imageUrl.trim()) {
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
  slotTarget: NonNullable<ReturnType<typeof parseStyleSlotTarget>>,
  activeStyleId?: string | null,
  logger?: StudioLogger,
): Promise<void> {
  let targetStyles: MascotStyle[] = [];
  if (slotTarget.styleId) {
    const found = styles.find((s) => s.id === slotTarget.styleId);
    if (found) {
      targetStyles = [found];
    } else {
      logger?.warn(`Style ${slotTarget.styleId} not found on mascot ${mascotId}`, { step: "mascot" });
    }
  } else {
    const active = styles.find((s) => s.id === activeStyleId) || styles.find((s) => s.is_default) || styles[0];
    if (active) {
      targetStyles = [active];
    } else {
      logger?.warn(`No active or default style found on mascot ${mascotId}`, { step: "mascot" });
    }
  }

  for (const style of targetStyles) {
    const statesToCheck: Array<"thinking" | "celebrate"> = slotTarget.state ? [slotTarget.state] : ["thinking", "celebrate"];

    for (const state of statesToCheck) {
      const variants = style.states?.[state] ?? [];
      for (const variant of variants) {
        if (slotTarget.slotIndex !== undefined && variant.slot_index !== slotTarget.slotIndex) {
          continue;
        }
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
  } else if (slotTarget) {
    await matTargetedStyleSlots(repository, mascotId, updatedStyles, slotTarget, mascot.active_style_id, logger);
  }

  return repository.saveMascot({
    ...mascot,
    master_image_url: updatedMaster,
    actions: updatedActions,
    styles: updatedStyles,
    updated_at: new Date().toISOString(),
  });
}
