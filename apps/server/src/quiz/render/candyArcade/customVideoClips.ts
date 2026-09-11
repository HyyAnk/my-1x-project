import { getTransition, getTransitionDefinition, type IntroOutroTransitionType, type TransitionDefinition } from "@studio/shared";
import { escAttr } from "./candyArcadeSvg.js";

/**
 * Resolves a transition definition from the shared registry,
 * falling back to sensible defaults for known core transitions or standard naming.
 */
export function resolveTransitionDefinition(transitionType: IntroOutroTransitionType | string): TransitionDefinition {
  const def = getTransition(transitionType);
  if (def) {
    return def;
  }

  if (transitionType === "cut") {
    return {
      id: "cut",
      name: "Direct Cut",
      description: "Instant snap transition straight into the first question.",
      category: "intro_outro",
      defaultDuration: 0.0,
      minDuration: 0.0,
      maxDuration: 0.0,
      cssClass: "transition-cut",
    };
  }

  if (transitionType === "crossfade") {
    return {
      id: "crossfade",
      name: "Smooth Crossfade",
      description: "Gentle cinematic blend between intro and question cards.",
      category: "intro_outro",
      defaultDuration: 0.5,
      minDuration: 0.2,
      maxDuration: 1.5,
      cssClass: "transition-crossfade",
    };
  }

  if (transitionType === "swipe") {
    return {
      id: "swipe",
      name: "Curtain Swipe",
      description: "Sleek curtain swipe animation.",
      category: "intro_outro",
      defaultDuration: 0.8,
      minDuration: 0.2,
      maxDuration: 1.5,
      cssClass: "transition-swipe",
    };
  }

  return {
    id: transitionType,
    name: transitionType,
    description: "",
    category: "intro_outro",
    defaultDuration: 0.5,
    minDuration: 0.2,
    maxDuration: 1.5,
    cssClass: transitionType === "stinger_swipe" ? "transition-stinger" : `transition-${transitionType}`,
  };
}

/**
 * Calculates transition timing with definition duration bounds and clip duration safety limits.
 */
export function calculateIntroTransitionTiming(
  clipDurationSeconds: number,
  transitionType: IntroOutroTransitionType | string,
  configuredDurationSeconds?: number,
): { transitionStart: number; transitionDuration: number } {
  if (transitionType === "cut") {
    return { transitionStart: clipDurationSeconds, transitionDuration: 0 };
  }

  const def = resolveTransitionDefinition(transitionType);
  const rawDuration =
    configuredDurationSeconds !== undefined && Number.isFinite(configuredDurationSeconds)
      ? Math.min(def.maxDuration, Math.max(def.minDuration, configuredDurationSeconds))
      : def.defaultDuration;

  const maxClipBound = Math.max(0, clipDurationSeconds / 2);
  const transitionDuration = Math.min(rawDuration, maxClipBound);
  const transitionStart = Math.max(0, clipDurationSeconds - transitionDuration);

  return { transitionStart, transitionDuration };
}

/**
 * Generates transition overlay DOM markup dynamically based on transition metadata.
 */
export function renderIntroTransitionOverlay(
  transitionType: IntroOutroTransitionType | string,
  transitionStart: number,
  transitionDuration: number,
  def?: any,
  instanceId?: string,
): string {
  let activeDef = def;
  if (!activeDef) {
    try {
      activeDef = getTransitionDefinition(transitionType);
    } catch {
      activeDef = resolveTransitionDefinition(transitionType);
    }
  }
  const transitionId = activeDef?.id ?? "stinger_swipe";

  if (transitionId === "cut" || transitionDuration <= 0) {
    return "";
  }

  const instAttr = instanceId ? ` data-transition-instance="${instanceId}"` : "";
  const styleAttr = `style="--trans-start:${transitionStart.toFixed(3)}s;--trans-dur:${transitionDuration.toFixed(3)}s;"`;

  if (typeof activeDef?.renderMarkup === "function") {
    const markup = activeDef.renderMarkup({
      instanceId: instanceId ?? "intro",
      placement: "intro",
      fps: { numerator: 30, denominator: 1 },
      startFrame: Math.round(transitionStart * 30),
      boundaryFrame: Math.round((transitionStart + transitionDuration) * 30),
      availableEndFrameExclusive: Math.round((transitionStart + transitionDuration) * 30),
      width: 1920,
      height: 1080,
      fromColor: "#000000",
      toColor: "#000000",
      inkColor: "#ffffff",
    });
    const cssClass = activeDef.cssClass || `transition-${transitionId}`;
    return `<div class="intro-transition ${cssClass}"${instAttr} ${styleAttr}>${markup}</div>`;
  }

  switch (transitionId) {
    case "crossfade":
      return `<div class="intro-transition transition-crossfade"${instAttr} ${styleAttr}></div>`;
    case "stinger_swipe":
      return `<div class="intro-transition transition-stinger"${instAttr} ${styleAttr}><div class="stinger-slash slash-a"></div><div class="stinger-slash slash-b"></div><div class="stinger-flash"></div></div>`;
    case "swipe":
      return `<div class="intro-transition transition-swipe"${instAttr} ${styleAttr}><div class="swipe-curtain"></div></div>`;
    default: {
      const cssClass = activeDef?.cssClass || `transition-${transitionId}`;
      return `<div class="intro-transition ${cssClass}"${instAttr} ${styleAttr}></div>`;
    }
  }
}

/**
 * Renders custom intro video clip with transition overlay.
 */
export function customIntroVideoClip(
  videoPath: string,
  durationSeconds: number,
  transitionType: IntroOutroTransitionType | string = "stinger_swipe",
  hasAudioOrDuration: boolean | number = true,
  transitionDurationSeconds?: number,
  instanceId?: string,
): string {
  if (durationSeconds < 0.08) return "";

  let hasAudio = true;
  let targetDuration = transitionDurationSeconds;
  if (typeof hasAudioOrDuration === "boolean") {
    hasAudio = hasAudioOrDuration;
  } else if (typeof hasAudioOrDuration === "number") {
    targetDuration = hasAudioOrDuration;
  }

  let def: any;
  try {
    def = getTransitionDefinition(transitionType);
  } catch {
    def = resolveTransitionDefinition(transitionType);
  }
  const { transitionStart, transitionDuration } = calculateIntroTransitionTiming(durationSeconds, transitionType, targetDuration);
  const transitionHtml = renderIntroTransitionOverlay(transitionType, transitionStart, transitionDuration, def, instanceId);

  const audioAttrs = hasAudio ? 'data-has-audio="true"' : 'data-has-audio="false" muted';

  return `<section id="custom-intro" class="clip candy-scene custom-intro-scene" data-start="0" data-duration="${durationSeconds.toFixed(3)}" data-track-index="0"><video id="custom-intro-video-track" class="custom-intro-video" src="${escAttr(videoPath)}" data-start="0" data-duration="${durationSeconds.toFixed(3)}" ${audioAttrs} autoplay playsinline></video>${transitionHtml}</section>`;
}

/**
 * Renders custom outro video clip.
 */
export function customOutroVideoClip(videoPath: string, start: number, durationSeconds: number, hasAudio: boolean = true): string {
  if (durationSeconds < 0.08) return "";
  const audioAttrs = hasAudio ? 'data-has-audio="true"' : 'data-has-audio="false" muted';
  return `<section id="custom-outro" class="clip candy-scene custom-outro-scene" data-start="${start.toFixed(3)}" data-duration="${durationSeconds.toFixed(3)}" data-track-index="0"><video id="custom-outro-video-track" class="custom-outro-video" src="${escAttr(videoPath)}" data-start="0" data-duration="${durationSeconds.toFixed(3)}" ${audioAttrs} autoplay playsinline></video></section>`;
}
