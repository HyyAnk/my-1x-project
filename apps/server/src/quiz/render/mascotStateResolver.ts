import type { ChannelMascotConfig, MascotActionType, MascotMotionPreset, MascotProfile } from "@studio/shared";

export type MascotPhase = "intro" | "question" | "outro" | "thinking" | "reveal" | "explain";

export interface ResolvedMascotPose {
  action: MascotActionType | "master";
  url: string;
  frames: number;
  fps: number;
  offX: number;
  offY: number;
  motionPreset: MascotMotionPreset;
  motionSpeed: number;
  motionIntensity: "subtle" | "normal" | "dynamic";
}

const DEFAULT_ACTION_MOTIONS: Record<MascotActionType, MascotMotionPreset> = {
  idle: "breathe",
  wave: "wave",
  thinking: "sway",
  point: "pulse",
  celebrate: "jump",
  oops: "shake",
  outro: "wave",
};

const ACTION_FALLBACK_CHAINS: Record<MascotActionType, MascotActionType[]> = {
  celebrate: ["celebrate", "wave", "thinking", "idle"],
  oops: ["oops", "thinking", "celebrate", "idle"],
  point: ["point", "celebrate", "thinking", "idle"],
  wave: ["wave", "celebrate", "thinking", "idle"],
  thinking: ["thinking", "idle"],
  outro: ["outro", "wave", "celebrate", "idle"],
  idle: ["idle", "thinking", "celebrate"],
};

function escAttr(val: string): string {
  return String(val).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Check if the mascot should be rendered in the specified video phase.
 */
export function shouldRenderMascot(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  phase: MascotPhase,
): boolean {
  if (!mascot || (config && config.enabled === false)) return false;
  if (phase === "intro" && (!config || config.show_in_intro !== true)) return false;
  if (phase === "outro" && (!config || config.show_in_outro !== true)) return false;
  if (
    (phase === "question" || phase === "thinking" || phase === "reveal" || phase === "explain") &&
    config &&
    config.show_in_question === false
  )
    return false;
  return true;
}

/**
 * Resolves a mascot action pose with an automatic fallback hierarchy.
 * If the requested action is missing, it falls back to related actions,
 * and ultimately to the master concept art.
 */
export function resolveMascotPose(mascot: MascotProfile, targetAction: MascotActionType, defaultFps = 8): ResolvedMascotPose {
  const chain = ACTION_FALLBACK_CHAINS[targetAction] || [targetAction, "idle"];

  for (const candidateAction of chain) {
    const actionData = mascot.actions[candidateAction];
    if (actionData && actionData.sprite_url) {
      return {
        action: candidateAction,
        url: actionData.sprite_url,
        frames: actionData.frames_count || 1,
        fps: actionData.fps || defaultFps,
        offX: actionData.offset_x || 0,
        offY: actionData.offset_y || 0,
        motionPreset: actionData.motion_preset || DEFAULT_ACTION_MOTIONS[candidateAction] || "breathe",
        motionSpeed: actionData.motion_speed ?? 1.0,
        motionIntensity: actionData.motion_intensity ?? "normal",
      };
    }
  }

  // Fallback to Master Image
  return {
    action: "master",
    url: mascot.master_image_url || "",
    frames: 1,
    fps: defaultFps,
    offX: 0,
    offY: 0,
    motionPreset: DEFAULT_ACTION_MOTIONS[targetAction] || "breathe",
    motionSpeed: 1.0,
    motionIntensity: "normal",
  };
}

/**
 * Resolves layout and positioning parameters with channel configuration overrides.
 */
export function resolveMascotLayout(config: ChannelMascotConfig | null | undefined) {
  return {
    position: config?.position || "bottom_left",
    scale: config?.scale || 1.0,
    configOffsetX: config?.offset_x || 0,
    configOffsetY: config?.offset_y || 0,
  };
}

/**
 * Extracts all unique asset URLs for a mascot to enable seamless browser/renderer preloading.
 */
export function getMascotPreloadUrls(mascot: MascotProfile | null | undefined): string[] {
  if (!mascot) return [];
  const urls = new Set<string>();
  if (mascot.master_image_url) urls.add(mascot.master_image_url);
  for (const act of Object.values(mascot.actions || {})) {
    if (act?.sprite_url) urls.add(act.sprite_url);
  }
  return Array.from(urls);
}

/**
 * Generates HTML `<link rel="preload">` tags for video composition bundles to eliminate flickering.
 */
export function getMascotPreloadTags(mascot: MascotProfile | null | undefined, sourceMapper?: (url: string) => string): string {
  const urls = getMascotPreloadUrls(mascot);
  if (urls.length === 0) return "";
  return urls
    .map((url) => {
      const src = sourceMapper ? sourceMapper(url) : url;
      return `<link rel="preload" href="${escAttr(src)}" as="image">`;
    })
    .join("\n");
}

/**
 * Universal Mascot Layer Renderer - can be embedded in any video scene template.
 */
export function renderMascotHtmlLayer(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  phase: MascotPhase,
  options: {
    sourceMapper?: (url: string) => string;
    overrideAction?: MascotActionType;
    extraClass?: string;
  } = {},
): string {
  if (!shouldRenderMascot(mascot, config, phase) || !mascot) return "";

  const { position, scale, configOffsetX, configOffsetY } = resolveMascotLayout(config);
  const src = options.sourceMapper || ((u: string) => u);

  if (phase === "intro") {
    const wave = resolveMascotPose(mascot, "wave");
    const offX = wave.offX + configOffsetX;
    const offY = wave.offY + configOffsetY;
    return `<div class="candy-mascot-container mascot-intro anchor-${position} ${options.extraClass || ""}" style="--mascot-scale:${scale};--mascot-frames:${wave.frames};--mascot-fps:${wave.fps};--action-offset-x:${offX}px;--action-offset-y:${offY}px;--sprite-url:url('${escAttr(src(wave.url))}');" data-layout-ignore aria-hidden="true"><div class="candy-mascot-sprite"></div></div>`;
  }

  if (phase === "outro") {
    const outro = resolveMascotPose(mascot, "outro");
    const offX = outro.offX + configOffsetX;
    const offY = outro.offY + configOffsetY;
    return `<div class="candy-mascot-container mascot-outro anchor-${position} ${options.extraClass || ""}" style="--mascot-scale:${scale};--mascot-frames:${outro.frames};--mascot-fps:${outro.fps};--action-offset-x:${offX}px;--action-offset-y:${offY}px;--sprite-url:url('${escAttr(src(outro.url))}');" data-layout-ignore aria-hidden="true"><div class="candy-mascot-sprite"></div></div>`;
  }

  if (options.overrideAction) {
    const pose = resolveMascotPose(mascot, options.overrideAction);
    const poseUrl = pose.url ? src(pose.url) : "";
    const offX = pose.offX + configOffsetX;
    const offY = pose.offY + configOffsetY;
    return `<div class="candy-mascot-container mascot-stage anchor-${position} ${options.extraClass || ""}" style="--mascot-scale:${scale};--mascot-color:${mascot.color_theme || "#06b6d4"};" data-layout-allow-overflow data-layout-ignore aria-hidden="true">
    <div class="mascot-state-layer state-${options.overrideAction}" style="opacity:1;--sprite-url:url('${escAttr(poseUrl)}');--mascot-frames:${pose.frames};--mascot-fps:${pose.fps};--action-offset-x:${offX}px;--action-offset-y:${offY}px;"><div class="candy-mascot-sprite"></div></div>
  </div>`;
  }

  const think = resolveMascotPose(mascot, "thinking");
  const thinkUrl = think.url ? src(think.url) : "";

  const celeb = resolveMascotPose(mascot, "celebrate", 10);
  const celebUrl = celeb.url ? src(celeb.url) : thinkUrl;

  const thinkOffX = think.offX + configOffsetX;
  const thinkOffY = think.offY + configOffsetY;
  const celebOffX = celeb.offX + configOffsetX;
  const celebOffY = celeb.offY + configOffsetY;

  return `<div class="candy-mascot-container mascot-stage anchor-${position} ${options.extraClass || ""}" style="--mascot-scale:${scale};--mascot-color:${mascot.color_theme || "#06b6d4"};" data-layout-allow-overflow data-layout-ignore aria-hidden="true">
    <div class="mascot-state-layer state-thinking" style="--sprite-url:url('${escAttr(thinkUrl)}');--mascot-frames:${think.frames};--mascot-fps:${think.fps};--action-offset-x:${thinkOffX}px;--action-offset-y:${thinkOffY}px;"><div class="candy-mascot-sprite"></div></div>
    <div class="mascot-state-layer state-celebrate" style="--sprite-url:url('${escAttr(celebUrl)}');--mascot-frames:${celeb.frames};--mascot-fps:${celeb.fps};--action-offset-x:${celebOffX}px;--action-offset-y:${celebOffY}px;"><div class="candy-mascot-sprite"></div></div>
  </div>`;
}
