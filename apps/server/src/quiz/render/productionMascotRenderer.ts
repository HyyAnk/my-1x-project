import {
  adaptMascotV1ToV2,
  resolveMascotStyle,
  type ChannelMascotConfig,
  type MascotActionType,
  type MascotProfile,
  type MascotStyle,
} from "@studio/shared";
import { renderMascotHtmlFromBundle } from "./mascotHtmlRenderer.js";
import {
  resolveProductionMascotMarkers,
  type ProductionMascotRenderOptions as BaseProductionMascotRenderOptions,
  type ProductionMascotTimelineEvent,
} from "./productionMascotTimeline.js";

export type ProductionMascotRenderOptions = BaseProductionMascotRenderOptions & {
  styleId?: string | null;
};

export type { ProductionMascotTimelineEvent };

/**
 * Resolves the active MascotStyle for a question or scene.
 * If styleId is "cycle" or "all", cycles through available styles based on questionIndex.
 */
export function resolveMascotQuestionStyle(
  mascot: MascotProfile,
  styleId?: string | null,
  questionIndex = 0,
): MascotStyle {
  if (mascot.styles && mascot.styles.length > 0) {
    if (styleId === "cycle" || styleId === "all") {
      return mascot.styles[questionIndex % mascot.styles.length];
    }
  }
  return resolveMascotStyle(mascot, styleId);
}

/**
 * Checks whether the mascot has a dedicated, non-empty asset for the given action.
 */
function hasDedicatedAction(mascot: MascotProfile, action: MascotActionType): boolean {
  const legacyAction = mascot.actions?.[action];
  const bundleAction = mascot.render_bundle?.assets?.actions?.[action];
  return Boolean(
    legacyAction?.sprite_url?.trim() ||
      legacyAction?.preview_url?.trim() ||
      bundleAction?.image_url?.trim(),
  );
}

/**
 * Adapts a MascotProfile for a specific question clip by deterministically rotating
 * thinking and celebrate variants according to questionIndex.
 */
export function adaptMascotForQuestion(
  mascot: MascotProfile | null | undefined,
  styleId?: string | null,
  questionIndex = 0,
): MascotProfile | null | undefined {
  if (!mascot) return mascot;

  const style = resolveMascotQuestionStyle(mascot, styleId, questionIndex);
  const thinkingVariants = (style.states?.thinking ?? []).filter((v) => Boolean(v.image_url?.trim()));
  const celebrateVariants = (style.states?.celebrate ?? []).filter((v) => Boolean(v.image_url?.trim()));

  const thinkingVariant = thinkingVariants.length > 0 ? thinkingVariants[questionIndex % thinkingVariants.length] : null;
  const celebrateVariant = celebrateVariants.length > 0 ? celebrateVariants[questionIndex % celebrateVariants.length] : null;

  const existingThinking = mascot.actions?.thinking;
  const existingCelebrate = mascot.actions?.celebrate;
  const newActions = { ...mascot.actions };

  if (thinkingVariant) {
    newActions.thinking = {
      action: "thinking",
      sprite_url: thinkingVariant.image_url,
      preview_url: thinkingVariant.image_url,
      frames_count: existingThinking?.frames_count ?? 1,
      fps: existingThinking?.fps ?? 8,
      loop: existingThinking?.loop ?? true,
      frame_width: existingThinking?.frame_width ?? 512,
      frame_height: existingThinking?.frame_height ?? 512,
      offset_x: existingThinking?.offset_x ?? 0,
      offset_y: existingThinking?.offset_y ?? 0,
      motion_preset: thinkingVariant.motion_preset ?? existingThinking?.motion_preset ?? "sway",
      motion_speed: thinkingVariant.motion_speed ?? existingThinking?.motion_speed ?? 1.0,
      motion_intensity: thinkingVariant.motion_intensity ?? existingThinking?.motion_intensity ?? "normal",
    };
  } else if (style.anchor_image_url?.trim()) {
    const anchorUrl = style.anchor_image_url.trim();
    newActions.thinking = {
      action: "thinking",
      sprite_url: anchorUrl,
      preview_url: anchorUrl,
      frames_count: existingThinking?.frames_count ?? 1,
      fps: existingThinking?.fps ?? 8,
      loop: existingThinking?.loop ?? true,
      frame_width: existingThinking?.frame_width ?? 512,
      frame_height: existingThinking?.frame_height ?? 512,
      offset_x: existingThinking?.offset_x ?? 0,
      offset_y: existingThinking?.offset_y ?? 0,
      motion_preset: "sway",
      motion_speed: 1.0,
      motion_intensity: "normal",
    };
  }

  if (celebrateVariant) {
    newActions.celebrate = {
      action: "celebrate",
      sprite_url: celebrateVariant.image_url,
      preview_url: celebrateVariant.image_url,
      frames_count: existingCelebrate?.frames_count ?? 1,
      fps: existingCelebrate?.fps ?? 8,
      loop: existingCelebrate?.loop ?? true,
      frame_width: existingCelebrate?.frame_width ?? 512,
      frame_height: existingCelebrate?.frame_height ?? 512,
      offset_x: existingCelebrate?.offset_x ?? 0,
      offset_y: existingCelebrate?.offset_y ?? 0,
      motion_preset: celebrateVariant.motion_preset ?? existingCelebrate?.motion_preset ?? "jump",
      motion_speed: celebrateVariant.motion_speed ?? existingCelebrate?.motion_speed ?? 1.0,
      motion_intensity: celebrateVariant.motion_intensity ?? existingCelebrate?.motion_intensity ?? "normal",
    };
  } else if (style.anchor_image_url?.trim()) {
    const anchorUrl = style.anchor_image_url.trim();
    newActions.celebrate = {
      action: "celebrate",
      sprite_url: anchorUrl,
      preview_url: anchorUrl,
      frames_count: existingCelebrate?.frames_count ?? 1,
      fps: existingCelebrate?.fps ?? 8,
      loop: existingCelebrate?.loop ?? true,
      frame_width: existingCelebrate?.frame_width ?? 512,
      frame_height: existingCelebrate?.frame_height ?? 512,
      offset_x: existingCelebrate?.offset_x ?? 0,
      offset_y: existingCelebrate?.offset_y ?? 0,
      motion_preset: "jump",
      motion_speed: 1.0,
      motion_intensity: "normal",
    };
  }

  let adaptedRenderBundle = mascot.render_bundle;
  if (mascot.render_bundle) {
    const actionsCopy = { ...(mascot.render_bundle.assets?.actions ?? {}) };
    if (thinkingVariant) {
      actionsCopy.thinking = {
        version: 2,
        action: "thinking",
        image_url: thinkingVariant.image_url,
        motion: {
          preset: thinkingVariant.motion_preset ?? actionsCopy.thinking?.motion?.preset ?? "sway",
          speed: thinkingVariant.motion_speed ?? actionsCopy.thinking?.motion?.speed ?? 1.0,
          intensity: thinkingVariant.motion_intensity ?? actionsCopy.thinking?.motion?.intensity ?? "normal",
        },
        registration: actionsCopy.thinking?.registration ?? {
          source_width: 512,
          source_height: 512,
          content_bounds: { x: 0, y: 0, width: 512, height: 512 },
          pivot: { x: 256, y: 512 },
          offset_x: 0,
          offset_y: 0,
        },
      };
    } else if (style.anchor_image_url?.trim()) {
      actionsCopy.thinking = {
        version: 2,
        action: "thinking",
        image_url: style.anchor_image_url.trim(),
        motion: {
          preset: "sway",
          speed: 1.0,
          intensity: "normal",
        },
        registration: actionsCopy.thinking?.registration ?? {
          source_width: 512,
          source_height: 512,
          content_bounds: { x: 0, y: 0, width: 512, height: 512 },
          pivot: { x: 256, y: 512 },
          offset_x: 0,
          offset_y: 0,
        },
      };
    }

    if (celebrateVariant) {
      actionsCopy.celebrate = {
        version: 2,
        action: "celebrate",
        image_url: celebrateVariant.image_url,
        motion: {
          preset: celebrateVariant.motion_preset ?? actionsCopy.celebrate?.motion?.preset ?? "jump",
          speed: celebrateVariant.motion_speed ?? actionsCopy.celebrate?.motion?.speed ?? 1.0,
          intensity: celebrateVariant.motion_intensity ?? actionsCopy.celebrate?.motion?.intensity ?? "normal",
        },
        registration: actionsCopy.celebrate?.registration ?? {
          source_width: 512,
          source_height: 512,
          content_bounds: { x: 0, y: 0, width: 512, height: 512 },
          pivot: { x: 256, y: 512 },
          offset_x: 0,
          offset_y: 0,
        },
      };
    } else if (style.anchor_image_url?.trim()) {
      actionsCopy.celebrate = {
        version: 2,
        action: "celebrate",
        image_url: style.anchor_image_url.trim(),
        motion: {
          preset: "jump",
          speed: 1.0,
          intensity: "normal",
        },
        registration: actionsCopy.celebrate?.registration ?? {
          source_width: 512,
          source_height: 512,
          content_bounds: { x: 0, y: 0, width: 512, height: 512 },
          pivot: { x: 256, y: 512 },
          offset_x: 0,
          offset_y: 0,
        },
      };
    }

    adaptedRenderBundle = {
      ...mascot.render_bundle,
      assets: {
        ...mascot.render_bundle.assets,
        actions: actionsCopy,
      },
    };
  }

  return {
    ...mascot,
    active_style_id: style.id,
    actions: newActions,
    render_bundle: adaptedRenderBundle,
  };
}

/**
 * Graceful Fallback for Intro, Outro, and Question clips:
 * - If the mascot lacks a dedicated wave action, intro clip uses the active style's celebrate[0] (or thinking[0] or style anchor or master concept).
 * - If the mascot lacks a dedicated outro action, outro clip uses the active style's celebrate[1] (or celebrate[0] or style anchor or master concept).
 * - If the mascot lacks thinking or celebrate in a question clip, falls back to active style's first variant or style anchor.
 */
export function adaptMascotForPhase(
  mascot: MascotProfile | null | undefined,
  phase: "intro" | "question" | "outro",
  styleId?: string | null,
): MascotProfile | null | undefined {
  if (!mascot) return mascot;

  const style = resolveMascotStyle(mascot, styleId ?? mascot.active_style_id);
  const celebrateVariants = (style.states?.celebrate ?? []).filter((v) => Boolean(v.image_url?.trim()));
  const thinkingVariants = (style.states?.thinking ?? []).filter((v) => Boolean(v.image_url?.trim()));

  const newActions = { ...mascot.actions };
  let adaptedRenderBundle = mascot.render_bundle;

  if (phase === "intro") {
    if (!hasDedicatedAction(mascot, "wave")) {
      const fallbackVariant = celebrateVariants[0] ?? thinkingVariants[0];
      const fallbackUrl = fallbackVariant?.image_url ?? style.anchor_image_url?.trim() ?? mascot.master_image_url?.trim() ?? "";
      if (fallbackUrl) {
        newActions.wave = {
          action: "wave",
          sprite_url: fallbackUrl,
          preview_url: fallbackUrl,
          frames_count: 1,
          fps: 8,
          loop: true,
          frame_width: 512,
          frame_height: 512,
          offset_x: 0,
          offset_y: 0,
          motion_preset: fallbackVariant?.motion_preset ?? "wave",
          motion_speed: fallbackVariant?.motion_speed ?? 1.0,
          motion_intensity: fallbackVariant?.motion_intensity ?? "normal",
        };
        if (adaptedRenderBundle) {
          adaptedRenderBundle = {
            ...adaptedRenderBundle,
            assets: {
              ...adaptedRenderBundle.assets,
              actions: {
                ...adaptedRenderBundle.assets.actions,
                wave: {
                  version: 2,
                  action: "wave",
                  image_url: fallbackUrl,
                  motion: {
                    preset: fallbackVariant?.motion_preset ?? "wave",
                    speed: fallbackVariant?.motion_speed ?? 1.0,
                    intensity: fallbackVariant?.motion_intensity ?? "normal",
                  },
                  registration: {
                    source_width: 512,
                    source_height: 512,
                    content_bounds: { x: 0, y: 0, width: 512, height: 512 },
                    pivot: { x: 256, y: 512 },
                    offset_x: 0,
                    offset_y: 0,
                  },
                },
              },
            },
          };
        }
      }
    }
  } else if (phase === "outro") {
    if (!hasDedicatedAction(mascot, "outro")) {
      const fallbackVariant = (celebrateVariants.length > 1 ? celebrateVariants[1] : celebrateVariants[0]) ?? thinkingVariants[0];
      const fallbackUrl = fallbackVariant?.image_url ?? style.anchor_image_url?.trim() ?? mascot.master_image_url?.trim() ?? "";
      if (fallbackUrl) {
        newActions.outro = {
          action: "outro",
          sprite_url: fallbackUrl,
          preview_url: fallbackUrl,
          frames_count: 1,
          fps: 8,
          loop: true,
          frame_width: 512,
          frame_height: 512,
          offset_x: 0,
          offset_y: 0,
          motion_preset: fallbackVariant?.motion_preset ?? "wave",
          motion_speed: fallbackVariant?.motion_speed ?? 1.0,
          motion_intensity: fallbackVariant?.motion_intensity ?? "normal",
        };
        if (adaptedRenderBundle) {
          adaptedRenderBundle = {
            ...adaptedRenderBundle,
            assets: {
              ...adaptedRenderBundle.assets,
              actions: {
                ...adaptedRenderBundle.assets.actions,
                outro: {
                  version: 2,
                  action: "outro",
                  image_url: fallbackUrl,
                  motion: {
                    preset: fallbackVariant?.motion_preset ?? "wave",
                    speed: fallbackVariant?.motion_speed ?? 1.0,
                    intensity: fallbackVariant?.motion_intensity ?? "normal",
                  },
                  registration: {
                    source_width: 512,
                    source_height: 512,
                    content_bounds: { x: 0, y: 0, width: 512, height: 512 },
                    pivot: { x: 256, y: 512 },
                    offset_x: 0,
                    offset_y: 0,
                  },
                },
              },
            },
          };
        }
      }
    }
  } else if (phase === "question") {
    if (!hasDedicatedAction(mascot, "thinking")) {
      const fallbackVariant = thinkingVariants[0];
      const fallbackUrl = fallbackVariant?.image_url ?? style.anchor_image_url?.trim() ?? "";
      if (fallbackUrl) {
        newActions.thinking = {
          action: "thinking",
          sprite_url: fallbackUrl,
          preview_url: fallbackUrl,
          frames_count: 1,
          fps: 8,
          loop: true,
          frame_width: 512,
          frame_height: 512,
          offset_x: 0,
          offset_y: 0,
          motion_preset: fallbackVariant?.motion_preset ?? "sway",
          motion_speed: fallbackVariant?.motion_speed ?? 1.0,
          motion_intensity: fallbackVariant?.motion_intensity ?? "normal",
        };
        if (adaptedRenderBundle) {
          adaptedRenderBundle = {
            ...adaptedRenderBundle,
            assets: {
              ...adaptedRenderBundle.assets,
              actions: {
                ...adaptedRenderBundle.assets.actions,
                thinking: {
                  version: 2,
                  action: "thinking",
                  image_url: fallbackUrl,
                  motion: {
                    preset: fallbackVariant?.motion_preset ?? "sway",
                    speed: fallbackVariant?.motion_speed ?? 1.0,
                    intensity: fallbackVariant?.motion_intensity ?? "normal",
                  },
                  registration: {
                    source_width: 512,
                    source_height: 512,
                    content_bounds: { x: 0, y: 0, width: 512, height: 512 },
                    pivot: { x: 256, y: 512 },
                    offset_x: 0,
                    offset_y: 0,
                  },
                },
              },
            },
          };
        }
      }
    }
    if (!hasDedicatedAction(mascot, "celebrate")) {
      const fallbackVariant = celebrateVariants[0];
      const fallbackUrl = fallbackVariant?.image_url ?? style.anchor_image_url?.trim() ?? "";
      if (fallbackUrl) {
        newActions.celebrate = {
          action: "celebrate",
          sprite_url: fallbackUrl,
          preview_url: fallbackUrl,
          frames_count: 1,
          fps: 8,
          loop: true,
          frame_width: 512,
          frame_height: 512,
          offset_x: 0,
          offset_y: 0,
          motion_preset: fallbackVariant?.motion_preset ?? "jump",
          motion_speed: fallbackVariant?.motion_speed ?? 1.0,
          motion_intensity: fallbackVariant?.motion_intensity ?? "normal",
        };
        if (adaptedRenderBundle) {
          adaptedRenderBundle = {
            ...adaptedRenderBundle,
            assets: {
              ...adaptedRenderBundle.assets,
              actions: {
                ...adaptedRenderBundle.assets.actions,
                celebrate: {
                  version: 2,
                  action: "celebrate",
                  image_url: fallbackUrl,
                  motion: {
                    preset: fallbackVariant?.motion_preset ?? "jump",
                    speed: fallbackVariant?.motion_speed ?? 1.0,
                    intensity: fallbackVariant?.motion_intensity ?? "normal",
                  },
                  registration: {
                    source_width: 512,
                    source_height: 512,
                    content_bounds: { x: 0, y: 0, width: 512, height: 512 },
                    pivot: { x: 256, y: 512 },
                    offset_x: 0,
                    offset_y: 0,
                  },
                },
              },
            },
          };
        }
      }
    }
  }

  return {
    ...mascot,
    active_style_id: style.id,
    actions: newActions,
    render_bundle: adaptedRenderBundle,
  };
}

/** Production adapter for the canonical Mascot Render Contract V2 HTML layer. */
export function renderProductionMascotHtmlLayer(
  mascot: MascotProfile | null | undefined,
  config: ChannelMascotConfig | null | undefined,
  options: ProductionMascotRenderOptions,
): string {
  const effectiveMascot = adaptMascotForPhase(mascot, options.phase, options.styleId);
  const bundle = adaptMascotV1ToV2(effectiveMascot, config);
  if (!bundle) return "";

  const clipStart = finiteNonNegative(options.clipStartSeconds);
  const clipDuration = Math.max(0.04, finiteNonNegative(options.clipDurationSeconds));
  const markers = resolveProductionMascotMarkers(options, clipStart, clipDuration);
  const states = markers.map((marker, index) => ({
    phase: marker.phase,
    atSeconds: Math.max(0, marker.atSeconds),
    durationSeconds: Math.max(0.04, (markers[index + 1]?.atSeconds ?? clipStart + clipDuration) - marker.atSeconds),
    timelineTimeSeconds: marker.atSeconds,
    actionOverride: marker.actionOverride,
    revealOutcome: marker.revealOutcome,
    playing: true,
  }));

  return renderMascotHtmlFromBundle({
    bundle,
    aspectRatio: options.aspectRatio ?? "16:9",
    states,
    phaseClass: options.phase === "intro" ? "mascot-intro" : options.phase === "outro" ? "mascot-outro" : "mascot-stage",
    sourceMapper: options.sourceMapper,
    extraClass: options.extraClass,
  });
}

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
