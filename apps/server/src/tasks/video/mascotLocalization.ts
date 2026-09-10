import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type {
  Channel,
  MascotActionType,
  MascotProfile,
  MascotRenderBundleV2,
  MascotStateVariant,
  MascotStyle,
} from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { getOrCreateTransparentMascotAsset } from "../../quiz/mascotAssetCache.js";

type AssetLocalizer = (url?: string | null) => Promise<string | undefined>;

function createMascotAssetLocalizer(
  repository: RepositoryService,
  mascotId: string,
  renderMascotDir: string,
): AssetLocalizer {
  return async (url?: string | null): Promise<string | undefined> => {
    if (!url) return undefined;
    if (url.startsWith("data:") || url.startsWith("./") || url.startsWith("../")) return url;
    if (url.startsWith("/mascot-assets/")) return `.${url}`;

    const match = url.match(/\/api\/mascots\/[^/]+\/assets\/([^/?#]+)/);
    if (match && match[1]) {
      const filename = decodeURIComponent(match[1]);
      try {
        const cachedAsset = await getOrCreateTransparentMascotAsset(repository, mascotId, filename);
        await copyFile(cachedAsset.absolutePath, path.join(renderMascotDir, filename));
        return `./mascot-assets/${filename}`;
      } catch {
        return url;
      }
    }
    return url;
  };
}

async function localizeActions(
  actions: MascotProfile["actions"] | undefined,
  localizer: AssetLocalizer,
): Promise<MascotProfile["actions"]> {
  if (!actions) return {};
  const localizedActions: MascotProfile["actions"] = {};

  for (const [actKey, actSprite] of Object.entries(actions)) {
    if (actSprite) {
      const localizedSpriteUrl = await localizer(actSprite.sprite_url);
      const localizedPreviewUrl = actSprite.preview_url ? await localizer(actSprite.preview_url) : localizedSpriteUrl;
      localizedActions[actKey as MascotActionType] = {
        ...actSprite,
        sprite_url: localizedSpriteUrl ?? actSprite.sprite_url,
        preview_url: localizedPreviewUrl ?? actSprite.preview_url,
      };
    }
  }

  return localizedActions;
}

async function localizeStates(
  states: MascotStyle["states"] | undefined,
  localizer: AssetLocalizer,
): Promise<MascotStyle["states"]> {
  if (!states) return { thinking: [], celebrate: [] };
  const result: Record<string, MascotStateVariant[]> = {};

  for (const [stateName, variants] of Object.entries(states)) {
    if (!Array.isArray(variants)) continue;
    const localizedVariants: MascotStateVariant[] = [];
    for (const variant of variants) {
      const localizedUrl = await localizer(variant.image_url);
      localizedVariants.push({
        ...variant,
        image_url: localizedUrl ?? variant.image_url,
      });
    }
    result[stateName] = localizedVariants;
  }

  return {
    thinking: result.thinking ?? [],
    celebrate: result.celebrate ?? [],
    ...result,
  };
}

async function localizeStyles(
  styles: MascotStyle[] | undefined,
  localizer: AssetLocalizer,
): Promise<MascotStyle[] | undefined> {
  if (!styles || !Array.isArray(styles)) return styles;

  const localizedStyles: MascotStyle[] = [];
  for (const style of styles) {
    const localizedAnchor = await localizer(style.anchor_image_url);
    const localizedStates = await localizeStates(style.states, localizer);
    localizedStyles.push({
      ...style,
      anchor_image_url: localizedAnchor ?? style.anchor_image_url,
      states: localizedStates,
    });
  }

  return localizedStyles;
}

async function localizeRenderBundle(
  bundle: MascotRenderBundleV2 | undefined,
  localizer: AssetLocalizer,
): Promise<MascotRenderBundleV2 | undefined> {
  if (!bundle?.assets) return bundle;

  let localizedMaster = bundle.assets.master;
  if (localizedMaster?.image_url) {
    const masterUrl = await localizer(localizedMaster.image_url);
    if (masterUrl) {
      localizedMaster = { ...localizedMaster, image_url: masterUrl };
    }
  }

  const localizedActions: MascotRenderBundleV2["assets"]["actions"] = {};
  for (const [actionKey, actionAsset] of Object.entries(bundle.assets.actions ?? {})) {
    if (actionAsset?.image_url) {
      const actionUrl = await localizer(actionAsset.image_url);
      localizedActions[actionKey as MascotActionType] = {
        ...actionAsset,
        image_url: actionUrl ?? actionAsset.image_url,
      };
    } else if (actionAsset) {
      localizedActions[actionKey as MascotActionType] = actionAsset;
    }
  }

  return {
    ...bundle,
    assets: {
      ...bundle.assets,
      master: localizedMaster,
      actions: localizedActions,
    },
  };
}

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

  const localizer = createMascotAssetLocalizer(repository, mascotProfile.id, renderMascotDir);
  const localizedMasterImage = await localizer(mascotProfile.master_image_url);
  const localizedActions = await localizeActions(mascotProfile.actions, localizer);
  const localizedStyles = await localizeStyles(mascotProfile.styles, localizer);
  const localizedBundle = await localizeRenderBundle(mascotProfile.render_bundle, localizer);

  return {
    ...mascotProfile,
    master_image_url: localizedMasterImage ?? mascotProfile.master_image_url,
    actions: localizedActions,
    styles: localizedStyles,
    render_bundle: localizedBundle,
  };
}
