import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Channel, MascotActionType, MascotProfile } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { removeImageBackground } from "../../utils/imageMatting.js";

export async function prepareLocalizedMascot(
  channel: Channel,
  repository: RepositoryService,
  renderRoot: string,
): Promise<MascotProfile | null> {
  if (!channel.mascot_id) return null;

  const mascotProfile = await repository.getMascot(channel.mascot_id).catch(() => null);
  if (!mascotProfile) return null;

  const renderMascotDir = path.join(renderRoot, "mascot-assets");
  await mkdir(renderMascotDir, { recursive: true });

  const localizeMascotAsset = async (url?: string | null): Promise<string | undefined> => {
    if (!url) return undefined;
    if (url.startsWith("data:") || url.startsWith("./") || url.startsWith("../")) return url;
    const match = url.match(/\/api\/mascots\/[^/]+\/assets\/([^/?#]+)/);
    if (match && match[1]) {
      const filename = match[1];
      try {
        const assetFile = await repository.getMascotAssetFile(mascotProfile.id, filename);
        const rawContent = await readFile(assetFile.absolutePath);
        const transparentContent = await removeImageBackground(rawContent);
        await writeFile(path.join(renderMascotDir, filename), transparentContent);
        return `./mascot-assets/${filename}`;
      } catch {
        return url;
      }
    }
    return url;
  };

  const localizedMasterImage = await localizeMascotAsset(mascotProfile.master_image_url);
  const localizedActions: MascotProfile["actions"] = {};
  for (const [actKey, actSprite] of Object.entries(mascotProfile.actions)) {
    if (actSprite) {
      const localizedSpriteUrl = await localizeMascotAsset(actSprite.sprite_url);
      localizedActions[actKey as MascotActionType] = {
        ...actSprite,
        sprite_url: localizedSpriteUrl || actSprite.sprite_url,
        preview_url: localizedSpriteUrl || actSprite.preview_url,
      };
    }
  }

  return {
    ...mascotProfile,
    master_image_url: localizedMasterImage || mascotProfile.master_image_url,
    actions: localizedActions,
  };
}
