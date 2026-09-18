import { resolveAnimationFrameAtTime, resolveMascotRenderSpec } from "@studio/shared";
import { escAttr } from "../candyArcade/candyArcadeSvg.js";
import { numberValue, px } from "./mascotHtmlStyles.js";

export function renderArt(
  spec: NonNullable<ReturnType<typeof resolveMascotRenderSpec>>,
  timelineTime: number,
  duration: number,
  delay: number,
  playing: boolean,
  preview: boolean,
  sourceMapper: (url: string) => string,
  stateAtSeconds = 0,
  clipStartSeconds = 0,
): string {
  if (spec.asset.animation) {
    if (spec.asset.animation.transparent_video_url) {
      return renderVideoArt(spec, spec.asset.animation, timelineTime, duration, delay, sourceMapper, stateAtSeconds, clipStartSeconds);
    }
    if (spec.asset.animation.atlas_url) {
      return renderAtlasArt(spec.asset.animation, timelineTime, delay, playing, preview, sourceMapper, stateAtSeconds);
    }
  }
  return renderStaticOrLegacyArt(spec, timelineTime, duration, delay, playing, preview, sourceMapper);
}

export function renderVideoArt(
  spec: NonNullable<ReturnType<typeof resolveMascotRenderSpec>>,
  animation: NonNullable<NonNullable<ReturnType<typeof resolveMascotRenderSpec>>["asset"]["animation"]>,
  timelineTime: number,
  duration: number,
  delay: number,
  sourceMapper: (url: string) => string,
  stateAtSeconds = 0,
  clipStartSeconds = 0,
): string {
  const animationTime = Math.max(0, timelineTime - stateAtSeconds);
  const resolved = resolveAnimationFrameAtTime(animation, animationTime);
  const localizedVideoUrl = sourceMapper(animation.transparent_video_url || "");
  const isOneShot = animation.loop_policy === "one_shot_rest" || (!animation.loop && animation.loop_policy !== "loop");
  const isLoop = !isOneShot;
  const cycle = animation.duration_ms ? animation.duration_ms / 1000 : animation.frame_count / animation.fps;
  const seekTimeSeconds = isLoop ? animationTime % cycle : Math.min(animationTime, cycle);
  const videoId = `mascot-video-${spec.asset.action}-${animation.slot_index ?? 0}-${Math.round(delay * 1000)}`;

  const videoStyle = [
    `width:100%`,
    `height:100%`,
    `object-fit:contain`,
    `--mascot-video-cycle:${numberValue(cycle)}s`,
    `--mascot-video-seek:${numberValue(seekTimeSeconds)}s`,
    `--mascot-frame-index:${resolved.frameIndex}`,
  ];

  const loopAttr = isLoop ? " loop" : "";
  const localVideoStart = Math.max(0, delay - clipStartSeconds);

  return `<video class="mascot-v2-frame mascot-v2-animation-art mascot-v2-animation-video" id="${videoId}" src="${escAttr(localizedVideoUrl)}" data-start="${numberValue(localVideoStart)}" data-duration="${numberValue(duration)}"${loopAttr} autoplay muted playsinline style="${videoStyle.join(";")}" data-mascot-animation-frame="${resolved.frameIndex}" data-mascot-frame-index="${resolved.frameIndex}" data-mascot-animation-video="${escAttr(localizedVideoUrl)}" data-mascot-video-time="${numberValue(seekTimeSeconds)}" data-mascot-video-cycle="${numberValue(cycle)}"></video>`;
}

export function renderAtlasArt(
  animation: NonNullable<NonNullable<ReturnType<typeof resolveMascotRenderSpec>>["asset"]["animation"]>,
  timelineTime: number,
  delay: number,
  playing: boolean,
  preview: boolean,
  sourceMapper: (url: string) => string,
  stateAtSeconds = 0,
): string {
  const animationTime = Math.max(0, timelineTime - stateAtSeconds);
  const resolved = resolveAnimationFrameAtTime(animation, animationTime);
  const frame = resolved.frame;
  const offsets = resolved.atlasOffsets;
  const localizedAtlasUrl = sourceMapper(animation.atlas_url || "");

  const style = [
    `--mascot-art-url:url('${escAttr(localizedAtlasUrl)}')`,
    `background-image:url('${escAttr(localizedAtlasUrl)}')`,
    `background-position:${offsets.cssBackgroundPosition}`,
    `background-repeat:no-repeat`,
    `background-size:auto`,
    `--mascot-frame-index:${resolved.frameIndex}`,
    `--mascot-frame-offset-x:${px(offsets.offsetX)}`,
    `--mascot-frame-offset-y:${px(offsets.offsetY)}`,
    `--mascot-frame-width:${px(frame.width)}`,
    `--mascot-frame-height:${px(frame.height)}`,
  ];

  if (!preview && playing) {
    const cycle = animation.frame_count / animation.fps;
    const isOneShot = animation.loop_policy === "one_shot_rest" || (!animation.loop && animation.loop_policy !== "loop");
    const animName = isOneShot ? "mascot-v2-atlas-oneshot" : "mascot-v2-atlas-loop";
    const iterations = isOneShot ? "1" : "infinite";
    const fillMode = isOneShot ? "forwards" : "both";
    style.push(
      `--mascot-atlas-cycle:${numberValue(cycle)}s`,
      `animation:${animName} ${numberValue(cycle)}s steps(1) ${numberValue(delay)}s ${iterations} ${fillMode}`,
    );
  }

  return `<div class="mascot-v2-frame mascot-v2-animation-art" style="${style.join(";")}" data-mascot-animation-frame="${resolved.frameIndex}" data-mascot-frame-index="${resolved.frameIndex}" data-mascot-animation-atlas="${escAttr(localizedAtlasUrl)}" data-mascot-frame-x="${frame.x}" data-mascot-frame-y="${frame.y}" data-mascot-frame-width="${frame.width}" data-mascot-frame-height="${frame.height}"></div>`;
}

export function renderStaticOrLegacyArt(
  spec: NonNullable<ReturnType<typeof resolveMascotRenderSpec>>,
  timelineTime: number,
  duration: number,
  delay: number,
  playing: boolean,
  preview: boolean,
  sourceMapper: (url: string) => string,
): string {
  const style = [`--mascot-art-url:url('${escAttr(sourceMapper(spec.asset.image_url))}')`];
  const legacy = spec.asset.legacy_animation;
  if (legacy) {
    const cycle = legacy.frames_count / legacy.fps;
    const previewFrame = Math.floor(timelineTime * legacy.fps) % legacy.frames_count;
    const previewPosition = legacy.frames_count === 1 ? 0 : (previewFrame / (legacy.frames_count - 1)) * 100;
    const iterations = preview
      ? playing && legacy.loop
        ? "infinite"
        : "1"
      : String(legacy.loop ? Math.max(1, Math.ceil(duration / cycle) + 1) : 1);
    const animationDelay = preview ? -(timelineTime % cycle) : delay;
    style.push(
      `--mascot-legacy-frames:${legacy.frames_count}`,
      `--mascot-legacy-fps:${numberValue(legacy.fps)}`,
      `--mascot-preview-frame-position:${numberValue(previewPosition)}%`,
      `animation:mascot-v2-legacy-frame ${numberValue(cycle)}s steps(${Math.max(1, legacy.frames_count - 1)},end) ${numberValue(animationDelay)}s ${iterations} both`,
    );
    return `<div class="mascot-v2-frame mascot-v2-legacy-art" style="${style.join(";")}" data-mascot-legacy-frames="${legacy?.frames_count ?? 1}" data-mascot-legacy-fps="${legacy?.fps ?? 0}"></div>`;
  }
  return `<img class="mascot-v2-frame mascot-v2-image" src="${escAttr(sourceMapper(spec.asset.image_url))}" alt="" style="${style.join(";")}" data-mascot-image="${escAttr(sourceMapper(spec.asset.image_url))}">`;
}
