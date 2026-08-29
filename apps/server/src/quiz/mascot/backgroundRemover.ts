import { readFile } from "node:fs/promises";
import { ALL_MASCOT_ACTIONS, type MascotActionType, type MascotProfile } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import type { StudioLogger } from "../../logger.js";
import { removeImageBackground } from "../../utils/imageMatting.js";

/**
 * Removes background from an existing mascot master image or action sprites
 */
export async function removeMascotAssetBackground(
  repository: RepositoryService,
  mascotId: string,
  target: "master" | "all" | MascotActionType = "all",
  logger?: StudioLogger,
): Promise<MascotProfile> {
  const mascot = await repository.getMascot(mascotId);
  const updatedActions = { ...mascot.actions };
  const updatedMaster = mascot.master_image_url;

  if (target === "master" || target === "all") {
    if (mascot.master_image_url) {
      const filename = mascot.master_image_url.split("/").pop();
      if (filename) {
        try {
          const file = await repository.getMascotAssetFile(mascotId, filename);
          const rawBytes = await readFile(file.absolutePath);
          const transparentBytes = await removeImageBackground(rawBytes);
          await repository.saveMascotAsset(mascotId, filename, transparentBytes);
        } catch (error) {
          logger?.warn(
            `Failed to remove background for mascot master image (${mascotId}/${filename}): ${error instanceof Error ? error.message : String(error)}`,
            { step: "mascot" },
          );
        }
      }
    }
  }

  const actionsToProcess = target === "all" ? ALL_MASCOT_ACTIONS : target !== "master" ? [target] : [];

  for (const action of actionsToProcess) {
    const sprite = mascot.actions[action];
    if (sprite?.sprite_url) {
      const filename = sprite.sprite_url.split("/").pop();
      if (filename) {
        try {
          const file = await repository.getMascotAssetFile(mascotId, filename);
          const rawBytes = await readFile(file.absolutePath);
          const transparentBytes = await removeImageBackground(rawBytes);
          await repository.saveMascotAsset(mascotId, filename, transparentBytes);
        } catch (error) {
          logger?.warn(
            `Failed to remove background for mascot sprite ${action} (${mascotId}/${filename}): ${error instanceof Error ? error.message : String(error)}`,
            { step: "mascot" },
          );
        }
      }
    }
  }

  return repository.saveMascot({
    ...mascot,
    master_image_url: updatedMaster,
    actions: updatedActions,
    updated_at: new Date().toISOString(),
  });
}
