import { isMockFixtureIdentifier } from "@studio/shared";
import type {
  MascotActionAssetV2,
  MascotActionType,
  MascotAnimationAssetV1,
  MascotMotionIntensity,
  MascotMotionPreset,
  MascotProfile,
  MascotPublishedAnimationAsset,
  MascotSpriteAction,
} from "@studio/shared";

export interface ResolveCanvasMediaOptions {
  editingMascot: MascotProfile | null;
  activePreviewAction: MascotActionType;
  animation?: MascotAnimationAssetV1 | MascotPublishedAnimationAsset | null;
  motionPreset?: MascotMotionPreset;
  motionSpeed?: number;
  motionIntensity?: MascotMotionIntensity;
}

export interface ResolvedCanvasMediaAndMotion {
  videoUrl: string | null;
  spriteImageUrl: string | null;
  effectiveMotionPreset: MascotMotionPreset;
  effectiveMotionSpeed: number;
  effectiveMotionIntensity: MascotMotionIntensity;
  intensityMultiplier: number;
}

function resolveCanvasVideoAndSprite(
  rawActionUrl: string | undefined,
  animation?: MascotAnimationAssetV1 | MascotPublishedAnimationAsset | null,
) {
  const isVideoAction = Boolean(rawActionUrl?.endsWith(".webm") || rawActionUrl?.endsWith(".mp4"));

  const validAnimationVideo =
    animation?.transparent_video_url && !isMockFixtureIdentifier(animation.transparent_video_url) ? animation.transparent_video_url : null;
  const validRawVideo = isVideoAction && rawActionUrl && !isMockFixtureIdentifier(rawActionUrl) ? rawActionUrl : null;
  const videoUrl = validAnimationVideo ?? validRawVideo;

  const spriteImageUrl = !isVideoAction && rawActionUrl && !isMockFixtureIdentifier(rawActionUrl) ? rawActionUrl : null;

  return { videoUrl, spriteImageUrl };
}

function resolveCanvasEffectiveMotion(
  options: ResolveCanvasMediaOptions,
  currentAsset?: MascotActionAssetV2 | null,
  currentSprite?: MascotSpriteAction | null,
) {
  const effectiveMotionPreset: MascotMotionPreset =
    options.motionPreset ?? currentAsset?.motion?.preset ?? currentSprite?.motion_preset ?? "breathe";

  const effectiveMotionSpeed = options.motionSpeed ?? currentAsset?.motion?.speed ?? currentSprite?.motion_speed ?? 1.0;

  const effectiveMotionIntensity: MascotMotionIntensity =
    options.motionIntensity ?? currentAsset?.motion?.intensity ?? currentSprite?.motion_intensity ?? "normal";

  const intensityMultiplier = effectiveMotionIntensity === "subtle" ? 0.35 : effectiveMotionIntensity === "dynamic" ? 2.2 : 1.0;

  return {
    effectiveMotionPreset,
    effectiveMotionSpeed,
    effectiveMotionIntensity,
    intensityMultiplier,
  };
}

export function resolveCanvasMediaAndMotion(options: ResolveCanvasMediaOptions): ResolvedCanvasMediaAndMotion {
  const { editingMascot, activePreviewAction, animation } = options;

  const currentActionAsset = editingMascot?.render_bundle?.assets?.actions?.[activePreviewAction];
  const currentActionSprite = editingMascot?.actions?.[activePreviewAction];
  const rawActionUrl = currentActionAsset?.image_url || currentActionSprite?.sprite_url;

  const { videoUrl, spriteImageUrl } = resolveCanvasVideoAndSprite(rawActionUrl, animation);
  const motionInfo = resolveCanvasEffectiveMotion(options, currentActionAsset, currentActionSprite);

  return {
    videoUrl,
    spriteImageUrl,
    ...motionInfo,
  };
}
