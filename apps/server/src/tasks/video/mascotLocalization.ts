import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Channel, MascotActionType, MascotProfile, MascotRenderBundleV2, MascotStateVariant, MascotStyle } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { type AnimationAssetContext } from "./mascotAnimationResolver.js";
import { type AssetLocalizer, createMascotAssetLocalizer, isSafeLocalAssetUrl } from "./mascotAssetDiskCopier.js";
import { localizeActions } from "./mascotActionFallback.js";

export { createMascotAssetLocalizer, type AssetLocalizer } from "./mascotAssetDiskCopier.js";
export { localizeActions } from "./mascotActionFallback.js";

async function localizeVariantAnimation(
  animation: MascotStateVariant["animation"],
  localizer: AssetLocalizer,
  context: AnimationAssetContext,
): Promise<MascotStateVariant["animation"]> {
  if (!animation) return undefined;

  const [transparentVideoUrl, atlasUrl, manifestUrl] = await Promise.all([
    animation.transparent_video_url ? localizer(animation.transparent_video_url, context) : undefined,
    animation.atlas_url ? localizer(animation.atlas_url, context) : undefined,
    animation.manifest_url ? localizer(animation.manifest_url, context) : undefined,
  ]);

  const safeVideo =
    transparentVideoUrl && (transparentVideoUrl.startsWith("./") || transparentVideoUrl.startsWith("../"))
      ? transparentVideoUrl
      : undefined;
  const safeAtlas = atlasUrl && (atlasUrl.startsWith("./") || atlasUrl.startsWith("../")) ? atlasUrl : undefined;
  if (!safeVideo && !safeAtlas) return undefined;

  return {
    ...animation,
    ...(safeVideo ? { transparent_video_url: safeVideo } : {}),
    ...(safeAtlas ? { atlas_url: safeAtlas } : {}),
    ...(manifestUrl ? { manifest_url: manifestUrl } : {}),
  };
}

async function localizeStateVariant(
  variant: MascotStateVariant,
  localizer: AssetLocalizer,
  context: AnimationAssetContext,
): Promise<MascotStateVariant> {
  const [imageUrl, transparentUrl, animation] = await Promise.all([
    localizer(variant.image_url, context),
    variant.transparent_image_url ? localizer(variant.transparent_image_url, context) : undefined,
    localizeVariantAnimation(variant.animation, localizer, context),
  ]);

  return {
    ...variant,
    image_url: imageUrl ?? variant.image_url,
    ...(transparentUrl ? { transparent_image_url: transparentUrl } : {}),
    ...(animation ? { animation } : {}),
  };
}

export async function localizeStates(
  states: MascotStyle["states"] | undefined,
  localizer: AssetLocalizer,
  styleId?: string,
): Promise<MascotStyle["states"]> {
  if (!states) return { thinking: [], celebrate: [] };
  const result: Record<string, MascotStateVariant[]> = {};

  for (const [stateName, variants] of Object.entries(states)) {
    if (!Array.isArray(variants)) continue;
    result[stateName] = await Promise.all(
      variants.map((variant) =>
        localizeStateVariant(variant, localizer, {
          styleId: styleId ?? "core",
          state: stateName,
          slotIndex: variant.slot_index ?? 1,
        }),
      ),
    );
  }

  return { thinking: result.thinking ?? [], celebrate: result.celebrate ?? [], ...result };
}

async function localizeStyles(styles: MascotStyle[] | undefined, localizer: AssetLocalizer): Promise<MascotStyle[] | undefined> {
  if (!styles || !Array.isArray(styles)) return styles;

  return Promise.all(
    styles.map(async (style) => ({
      ...style,
      anchor_image_url: (await localizer(style.anchor_image_url)) ?? style.anchor_image_url,
      states: await localizeStates(style.states, localizer, style.id),
    })),
  );
}

export async function localizeRenderBundle(
  bundle: MascotRenderBundleV2 | undefined,
  localizer: AssetLocalizer,
): Promise<MascotRenderBundleV2 | undefined> {
  if (!bundle?.assets) return bundle;

  let localizedMaster = bundle.assets.master;
  if (localizedMaster?.image_url) {
    const masterUrl = await localizer(localizedMaster.image_url);
    if (masterUrl) localizedMaster = { ...localizedMaster, image_url: masterUrl };
  }

  const localizedActions: MascotRenderBundleV2["assets"]["actions"] = {};
  for (const [actionKey, actionAsset] of Object.entries(bundle.assets.actions ?? {})) {
    if (!actionAsset) continue;
    const actionUrl = actionAsset.image_url ? await localizer(actionAsset.image_url) : undefined;
    const localizedAnim = await localizeVariantAnimation(actionAsset.animation, localizer, {
      styleId: "core",
      state: actionKey,
      slotIndex: 1,
    });
    const safeActionUrl = isSafeLocalAssetUrl(actionUrl)
      ? actionUrl!
      : isSafeLocalAssetUrl(actionAsset.image_url)
        ? actionAsset.image_url
        : (localizedMaster?.image_url ?? "");

    localizedActions[actionKey as MascotActionType] = {
      ...actionAsset,
      image_url: safeActionUrl,
      ...(localizedAnim ? { animation: localizedAnim } : {}),
    };
  }

  return {
    ...bundle,
    assets: { ...bundle.assets, master: localizedMaster, actions: localizedActions },
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
  const masterImage = await localizer(mascotProfile.master_image_url);
  const styles = await localizeStyles(mascotProfile.styles, localizer);
  const actions = await localizeActions(
    mascotProfile.actions,
    localizer,
    styles,
    masterImage ?? mascotProfile.master_image_url ?? undefined,
  );
  const bundle = await localizeRenderBundle(mascotProfile.render_bundle, localizer);

  return {
    ...mascotProfile,
    master_image_url: masterImage ?? mascotProfile.master_image_url,
    actions,
    styles,
    render_bundle: bundle,
  };
}
