import path from "node:path";
import sharp from "sharp";
import {
  adaptMascotV1ToV2,
  type MascotActionAssetV2,
  type MascotAssetRegistration,
  type MascotBounds,
  type MascotProfile,
  type MascotRenderBundleV2,
  type MascotStateVariant,
  type MascotStyle,
} from "@studio/shared";
import { findAlphaBoundingBox } from "../../quiz/mascot/videoAnimation/packaging/atlasStitcher.js";

const LOCAL_ASSET_PREFIX = "./";
const ALPHA_THRESHOLD = 16;

export type MeasuredImageContent = { canvas: { width: number; height: number }; bounds: MascotBounds };

/** Opaque pixel box of an image in its own pixel coordinates, or null when fully transparent. */
export async function measureImageContent(imagePath: string): Promise<MeasuredImageContent | null> {
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const box = findAlphaBoundingBox(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), info.width, info.height, ALPHA_THRESHOLD);
  if (!box) return null;
  return {
    canvas: { width: info.width, height: info.height },
    bounds: { x: box.minX, y: box.minY, width: box.width, height: box.height },
  };
}

function coversWholeSource(registration: MascotAssetRegistration): boolean {
  const bounds = registration.content_bounds;
  return bounds.x <= 0 && bounds.y <= 0 && bounds.width >= registration.source_width && bounds.height >= registration.source_height;
}

/**
 * Measures the opaque pixel box of a mascot image and expresses it in the registration's source
 * coordinates, so pivots and offsets authored against `source_width` x `source_height` stay valid.
 */
export async function measureRegistrationContentBounds(
  imagePath: string,
  registration: MascotAssetRegistration,
): Promise<MascotAssetRegistration | null> {
  const measured = await measureImageContent(imagePath);
  if (!measured) return null;
  const scaleX = registration.source_width / measured.canvas.width;
  const scaleY = registration.source_height / measured.canvas.height;
  return {
    ...registration,
    content_bounds: {
      x: Math.floor(measured.bounds.x * scaleX),
      y: Math.floor(measured.bounds.y * scaleY),
      width: Math.ceil(measured.bounds.width * scaleX),
      height: Math.ceil(measured.bounds.height * scaleY),
    },
  };
}

function isLocalAsset(url: string | undefined): url is string {
  return Boolean(url && url.startsWith(LOCAL_ASSET_PREFIX));
}

async function measureAction(asset: MascotActionAssetV2, renderRoot: string): Promise<MascotActionAssetV2> {
  if (!isLocalAsset(asset.image_url) || !coversWholeSource(asset.registration)) return asset;
  try {
    const measured = await measureRegistrationContentBounds(path.join(renderRoot, asset.image_url), asset.registration);
    return measured ? { ...asset, registration: measured } : asset;
  } catch {
    return asset;
  }
}

/** Style state variants carry optional canvas and content bounds; fill them from the pixels when absent. */
async function measureVariant(variant: MascotStateVariant, renderRoot: string): Promise<MascotStateVariant> {
  if (variant.content_bounds || !isLocalAsset(variant.image_url)) return variant;
  try {
    const measured = await measureImageContent(path.join(renderRoot, variant.image_url));
    return measured ? { ...variant, canvas: measured.canvas, content_bounds: measured.bounds } : variant;
  } catch {
    return variant;
  }
}

async function measureStyle(style: MascotStyle, renderRoot: string): Promise<MascotStyle> {
  const states = await Promise.all(
    Object.entries(style.states ?? {}).map(
      async ([state, variants]) =>
        [state, await Promise.all((variants ?? []).map((variant) => measureVariant(variant, renderRoot)))] as const,
    ),
  );
  return { ...style, states: { ...style.states, ...Object.fromEntries(states) } };
}

async function measureBundle(bundle: MascotRenderBundleV2 | null, renderRoot: string): Promise<MascotRenderBundleV2 | null> {
  if (!bundle?.assets?.actions) return bundle;
  const entries = await Promise.all(
    Object.entries(bundle.assets.actions).map(
      async ([action, asset]) => [action, asset ? await measureAction(asset, renderRoot) : asset] as const,
    ),
  );
  return { ...bundle, assets: { ...bundle.assets, actions: Object.fromEntries(entries) } };
}

/**
 * Fills in the opaque pixel bounds of every localized mascot image: style state variants (the
 * source of question-beat actions) and any pre-built render bundle action. Mascot art generated at
 * a canvas edge often carries transparent padding that the stored metadata does not know about;
 * without this pass the render reports the whole box as visible content and anything aligned to
 * the art's edge (such as the portrait ledge) lands low. Calibrated bounds are left untouched.
 */
export async function measureMascotContentBounds(profile: MascotProfile, renderRoot: string): Promise<MascotProfile> {
  const styles = profile.styles ? await Promise.all(profile.styles.map((style) => measureStyle(style, renderRoot))) : profile.styles;
  // Legacy profiles get their render bundle synthesized at render time; build it here so the
  // measured registrations travel with the profile into the composition.
  const bundle = await measureBundle(profile.render_bundle ?? adaptMascotV1ToV2(profile), renderRoot);
  return { ...profile, styles, ...(bundle ? { render_bundle: bundle } : {}) };
}
