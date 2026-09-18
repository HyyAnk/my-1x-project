import {
  MascotActionTypeSchema,
  MascotRenderBundleV2Schema,
  MascotStyleSchema,
  type MascotActionType,
  type MascotRenderBundleV2,
  type MascotSpriteAction,
  type MascotStyle,
} from "@studio/shared";
import { isRecord, type RawMascotActionEntry } from "./packageManifestParser.js";

export function remapAssetUrl(oldUrl: string | null | undefined, urlMap: Map<string, string>): string | null {
  if (!oldUrl || typeof oldUrl !== "string") return null;
  const filename = oldUrl.split("/").pop()?.split("?")[0];
  if (filename && urlMap.has(filename)) {
    return urlMap.get(filename)!;
  }
  return oldUrl;
}

function remapVariantUrls(variant: Record<string, unknown>, urlMap: Map<string, string>): void {
  if (typeof variant.image_url === "string") {
    variant.image_url = remapAssetUrl(variant.image_url, urlMap) || "";
  }
  if (typeof variant.raw_image_url === "string") {
    variant.raw_image_url = remapAssetUrl(variant.raw_image_url, urlMap);
  }
  if (typeof variant.transparent_image_url === "string") {
    variant.transparent_image_url = remapAssetUrl(variant.transparent_image_url, urlMap);
  }
}

export function buildImportedStyles(rawStyles: unknown[] | undefined, urlMap: Map<string, string>): MascotStyle[] {
  if (!Array.isArray(rawStyles)) return [];
  const result: MascotStyle[] = [];

  for (const rawStyle of rawStyles) {
    if (!isRecord(rawStyle)) continue;
    const styleCopy = JSON.parse(JSON.stringify(rawStyle)) as Record<string, unknown>;

    if (typeof styleCopy.anchor_image_url === "string") {
      styleCopy.anchor_image_url = remapAssetUrl(styleCopy.anchor_image_url, urlMap);
    }
    if (typeof styleCopy.raw_anchor_image_url === "string") {
      styleCopy.raw_anchor_image_url = remapAssetUrl(styleCopy.raw_anchor_image_url, urlMap);
    }

    if (isRecord(styleCopy.states)) {
      for (const [, variants] of Object.entries(styleCopy.states)) {
        if (Array.isArray(variants)) {
          for (const variant of variants) {
            if (isRecord(variant)) {
              remapVariantUrls(variant, urlMap);
            }
          }
        }
      }
    }

    const parseResult = MascotStyleSchema.safeParse(styleCopy);
    if (parseResult.success) {
      result.push(parseResult.data);
    }
  }

  return result;
}

function remapActionAsset(
  actionAsset: Record<string, unknown>,
  actionName: string,
  urlMap: Map<string, string>,
  importedActions: Record<string, MascotSpriteAction | null>,
): void {
  if (typeof actionAsset.image_url === "string") {
    const remapped = remapAssetUrl(actionAsset.image_url, urlMap);
    actionAsset.image_url = remapped || importedActions[actionName]?.sprite_url || actionAsset.image_url;
  }
  if (actionAsset.animation && isRecord(actionAsset.animation)) {
    const anim = actionAsset.animation;
    if (typeof anim.spritesheet_url === "string") {
      anim.spritesheet_url = remapAssetUrl(anim.spritesheet_url, urlMap) || anim.spritesheet_url;
    }
  }
}

export function buildImportedRenderBundle(
  rawBundle: unknown,
  urlMap: Map<string, string>,
  masterUrl: string | null,
  importedActions: Record<string, MascotSpriteAction | null>,
): MascotRenderBundleV2 | null {
  if (!isRecord(rawBundle)) return null;
  const bundleCopy = JSON.parse(JSON.stringify(rawBundle)) as Record<string, unknown>;

  if (isRecord(bundleCopy.assets)) {
    if (isRecord(bundleCopy.assets.master)) {
      const masterAsset = bundleCopy.assets.master;
      if (typeof masterAsset.image_url === "string") {
        masterAsset.image_url = remapAssetUrl(masterAsset.image_url, urlMap) || masterUrl || masterAsset.image_url;
      }
    }

    if (isRecord(bundleCopy.assets.actions)) {
      for (const [actionName, actionAsset] of Object.entries(bundleCopy.assets.actions)) {
        if (actionAsset && isRecord(actionAsset)) {
          remapActionAsset(actionAsset, actionName, urlMap, importedActions);
        }
      }
    }
  }

  const parsed = MascotRenderBundleV2Schema.safeParse(bundleCopy);
  if (parsed.success) {
    return parsed.data;
  }
  return null;
}

export function buildImportedActions(
  rawActions: Record<string, RawMascotActionEntry | null | undefined> | undefined,
  urlMap: Map<string, string>,
): Record<string, MascotSpriteAction | null> {
  const importedActions: Record<string, MascotSpriteAction | null> = {};
  if (!rawActions) return importedActions;

  for (const [actionKey, act] of Object.entries(rawActions)) {
    if (act && typeof act.sprite_url === "string") {
      const oldSpriteFile = act.sprite_url.split("/").pop();
      const newSpriteUrl = oldSpriteFile && urlMap.has(oldSpriteFile) ? urlMap.get(oldSpriteFile)! : "";
      const actionType: MascotActionType = MascotActionTypeSchema.safeParse(actionKey).success ? (actionKey as MascotActionType) : "idle";

      importedActions[actionKey] = {
        action: actionType,
        sprite_url: newSpriteUrl,
        preview_url: newSpriteUrl,
        frames_count: typeof act.frames_count === "number" ? act.frames_count : 1,
        fps: typeof act.fps === "number" ? act.fps : 8,
        loop: typeof act.loop === "boolean" ? act.loop : true,
        frame_width: typeof act.frame_width === "number" ? act.frame_width : 512,
        frame_height: typeof act.frame_height === "number" ? act.frame_height : 512,
        offset_x: typeof act.offset_x === "number" ? act.offset_x : 0,
        offset_y: typeof act.offset_y === "number" ? act.offset_y : 0,
        motion_preset: act.motion_preset,
        motion_speed: typeof act.motion_speed === "number" ? act.motion_speed : undefined,
        motion_intensity: act.motion_intensity,
      };
    }
  }

  return importedActions;
}
