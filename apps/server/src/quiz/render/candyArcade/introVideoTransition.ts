import {
  getTransition,
  getTransitionDefinition,
  MASCOT_CANVAS_SIZES,
  type MascotRenderAspectRatio,
  type TransitionDefinition,
} from "@studio/shared";

export type TransitionWithMarkup = TransitionDefinition & {
  renderMarkup?: (args: {
    instanceId: string;
    placement: string;
    fps: { numerator: number; denominator: number };
    startFrame: number;
    boundaryFrame: number;
    availableEndFrameExclusive: number;
    width: number;
    height: number;
    fromColor: string;
    toColor: string;
    inkColor: string;
  }) => string;
};

export interface IntroTransitionColors {
  fromColor?: string;
  toColor?: string;
  inkColor?: string;
}

/**
 * Resolves a transition definition from the shared registry,
 * falling back to sensible defaults for known core transitions or standard naming.
 */
export function resolveTransitionDefinition(transitionType: string): TransitionDefinition {
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
  transitionType: string,
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
  transitionType: string,
  transitionStart: number,
  transitionDuration: number,
  def?: TransitionWithMarkup | null,
  instanceId?: string,
  aspectRatio: MascotRenderAspectRatio = "16:9",
  colors?: IntroTransitionColors,
): string {
  let activeDef: TransitionWithMarkup | undefined = def ?? undefined;
  if (!activeDef) {
    try {
      activeDef = getTransitionDefinition(transitionType) as unknown as TransitionWithMarkup;
    } catch {
      activeDef = resolveTransitionDefinition(transitionType);
    }
  }
  const transitionId = activeDef?.id ?? "stinger_swipe";

  if (transitionId === "cut" || transitionDuration <= 0) {
    return "";
  }

  const fromColor = colors?.fromColor ?? "#F59E0B";
  const toColor = colors?.toColor ?? "#EF4444";
  const inkColor = colors?.inkColor ?? "#FFFFFF";

  const instAttr = instanceId ? ` data-transition-instance="${instanceId}"` : "";
  const styleAttr = `style="--trans-start:${transitionStart.toFixed(3)}s;--trans-dur:${transitionDuration.toFixed(3)}s;--trans-from-color:${fromColor};--trans-to-color:${toColor};"`;

  if (typeof activeDef?.renderMarkup === "function") {
    const canvas = MASCOT_CANVAS_SIZES[aspectRatio] ?? { width: 1920, height: 1080 };
    const markup = activeDef.renderMarkup({
      instanceId: instanceId ?? "intro",
      placement: "intro",
      fps: { numerator: 30, denominator: 1 },
      startFrame: Math.round(transitionStart * 30),
      boundaryFrame: Math.round((transitionStart + transitionDuration) * 30),
      availableEndFrameExclusive: Math.round((transitionStart + transitionDuration) * 30),
      width: canvas.width,
      height: canvas.height,
      fromColor,
      toColor,
      inkColor,
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
