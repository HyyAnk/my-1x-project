import type { MascotActionType, MascotProfile, MascotStateVariant, MascotStyle } from "@studio/shared";
import { type AssetLocalizer, isSafeLocalAssetUrl } from "./mascotAssetDiskCopier.js";

export function resolveActionFallback(actKey: string, styles?: MascotStyle[], masterImageUrl?: string): string | undefined {
  if (styles && Array.isArray(styles)) {
    for (const style of styles) {
      const stateMap = style.states as Record<string, MascotStateVariant[] | undefined> | undefined;
      const stateVariants = stateMap?.[actKey];
      if (Array.isArray(stateVariants)) {
        for (const variant of stateVariants) {
          if (isSafeLocalAssetUrl(variant.image_url)) {
            return variant.image_url;
          }
        }
      }
    }
  }
  if (isSafeLocalAssetUrl(masterImageUrl)) {
    return masterImageUrl;
  }
  return undefined;
}

export async function localizeActions(
  actions: MascotProfile["actions"] | undefined,
  localizer: AssetLocalizer,
  styles?: MascotStyle[],
  masterImageUrl?: string,
): Promise<MascotProfile["actions"]> {
  if (!actions) return {};
  const localizedActions: MascotProfile["actions"] = {};

  for (const [actKey, actSprite] of Object.entries(actions)) {
    if (!actSprite) continue;
    const rawLocalized = await localizer(actSprite.sprite_url);
    const fallbackUrl = resolveActionFallback(actKey, styles, masterImageUrl);
    const safeSpriteUrl = isSafeLocalAssetUrl(rawLocalized)
      ? rawLocalized!
      : isSafeLocalAssetUrl(actSprite.sprite_url)
        ? actSprite.sprite_url
        : (fallbackUrl ?? "");

    const rawPreview = actSprite.preview_url ? await localizer(actSprite.preview_url) : undefined;
    const safePreviewUrl = isSafeLocalAssetUrl(rawPreview)
      ? rawPreview!
      : isSafeLocalAssetUrl(actSprite.preview_url)
        ? actSprite.preview_url
        : safeSpriteUrl;

    localizedActions[actKey as MascotActionType] = {
      ...actSprite,
      sprite_url: safeSpriteUrl,
      preview_url: safePreviewUrl,
    };
  }

  return localizedActions;
}
