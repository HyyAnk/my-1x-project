import React from "react";
import { getTransition } from "@studio/shared";
import type { TransitionThemeColors } from "../types/transitionPreview.types";

export interface RenderOverlayOptions {
  transitionType: string;
  durationSeconds: number;
  progress: number;
  currentTime: number;
  isPlaying: boolean;
  themeColors?: TransitionThemeColors;
}

/**
 * Resolves the CSS class from shared registry or standard naming.
 */
export function resolveTransitionCssClass(transitionType: string): string {
  const def = getTransition(transitionType);
  if (def?.cssClass) return def.cssClass;

  if (transitionType === "cut") return "transition-cut";
  if (transitionType === "crossfade") return "transition-crossfade";
  if (transitionType === "stinger" || transitionType === "stinger_swipe") {
    return "transition-stinger";
  }
  if (transitionType === "swipe") return "transition-swipe";
  if (transitionType.startsWith("transition-")) return transitionType;

  return `transition-${transitionType}`;
}

/**
 * Builds CSS variable mapping for transition styling.
 */
export function buildTransitionCssVariables(
  durationSeconds: number,
  themeColors?: TransitionThemeColors,
): React.CSSProperties & Record<`--${string}`, string | number> {
  const fromColor = themeColors?.from ?? "#F59E0B";
  const toColor = themeColors?.to ?? "#EF4444";

  return {
    "--trans-dur": `${Math.max(0.01, durationSeconds)}s`,
    "--trans-start": "0s",
    "--clip-start": "0s",
    "--trans-from-color": fromColor,
    "--trans-to-color": toColor,
    "--from": fromColor,
    "--to": toColor,
  };
}

/**
 * Renders the overlay DOM elements based on transition type and playback progress.
 */
export function renderTransitionOverlay({
  transitionType,
  durationSeconds,
  progress,
  currentTime,
  isPlaying,
  themeColors,
}: RenderOverlayOptions): React.ReactNode {
  const cssClass = resolveTransitionCssClass(transitionType);

  if (cssClass === "transition-cut" || durationSeconds <= 0) {
    return null;
  }

  const containerStyle = {
    ...buildTransitionCssVariables(durationSeconds, themeColors),
    animationPlayState: isPlaying ? "running" : "paused",
    animationDelay: `-${currentTime}s`,
  };

  const childAnimStyle: React.CSSProperties = {
    animationPlayState: isPlaying ? "running" : "paused",
    animationDelay: `-${currentTime}s`,
  };

  if (cssClass === "transition-crossfade") {
    return (
      <div
        className="intro-transition transition-crossfade"
        style={{
          ...containerStyle,
          opacity: !isPlaying ? (progress <= 0.5 ? progress * 2 : (1 - progress) * 2) : undefined,
        }}
        data-testid="transition-overlay-crossfade"
      />
    );
  }

  if (cssClass === "transition-stinger") {
    return (
      <div className="intro-transition transition-stinger" style={containerStyle} data-testid="transition-overlay-stinger">
        <div
          className="stinger-slash slash-a"
          style={{
            ...childAnimStyle,
            transform: !isPlaying ? `skewX(-25deg) translateX(${-150 + progress * 300}%)` : undefined,
          }}
        />
        <div
          className="stinger-slash slash-b"
          style={{
            ...childAnimStyle,
            animationDelay: `-${Math.max(0, currentTime - 0.08)}s`,
            transform: !isPlaying
              ? `skewX(-25deg) translateX(${-150 + Math.max(0, progress - 0.08 / Math.max(0.01, durationSeconds)) * 300}%)`
              : undefined,
          }}
        />
        <div
          className="stinger-flash"
          style={{
            ...childAnimStyle,
            opacity: !isPlaying ? (progress >= 0.42 && progress <= 0.58 ? 0.9 * (1 - Math.abs(progress - 0.5) / 0.08) : 0) : undefined,
          }}
        />
      </div>
    );
  }

  if (cssClass === "transition-swipe") {
    return (
      <div className="intro-transition transition-swipe" style={containerStyle} data-testid="transition-overlay-swipe">
        <div
          className="swipe-curtain"
          style={{
            ...childAnimStyle,
            transform: !isPlaying ? `translateX(${-100 + progress * 100}%)` : undefined,
          }}
        />
      </div>
    );
  }

  if (cssClass === "transition-bubble_splash") {
    return (
      <div className="candy-transition transition-bubble_splash" style={containerStyle} data-testid="transition-overlay-bubble_splash">
        <div className="splash-bed" style={childAnimStyle} />
        <i className="splash-bubble splash-bubble-a" style={childAnimStyle} />
        <i className="splash-bubble splash-bubble-b" style={childAnimStyle} />
        <i className="splash-bubble splash-bubble-c" style={childAnimStyle} />
        <i className="splash-bubble splash-bubble-d" style={childAnimStyle} />
        <i className="splash-bubble splash-bubble-e" style={childAnimStyle} />
        <i className="splash-bubble splash-bubble-f" style={childAnimStyle} />
        <div className="splash-brand" style={childAnimStyle}>
          ✦
        </div>
        <div className="splash-particles">
          <i>✦</i>
          <i>&bull;</i>
          <i>✦</i>
          <i>&bull;</i>
        </div>
        <div className="splash-release" style={childAnimStyle} />
      </div>
    );
  }

  if (cssClass === "transition-brush_wave" || cssClass === "transition-lightning_brush") {
    const isLightning = cssClass.includes("lightning");
    return (
      <div className={`candy-transition ${cssClass}`} style={containerStyle} data-testid={`transition-overlay-${cssClass}`}>
        <div
          className="brush brush-one"
          style={{
            ...childAnimStyle,
            transform: !isPlaying ? `translateX(${-115 + progress * 230}%) rotate(-8deg)` : undefined,
          }}
        />
        <div
          className="brush brush-two"
          style={{
            ...childAnimStyle,
            transform: !isPlaying ? `translateX(${-115 + progress * 230}%) rotate(8deg) scale(.82)` : undefined,
          }}
        />
        <div className="transition-mark">{isLightning ? "⚡" : "✦"}</div>
      </div>
    );
  }

  return <div className={`intro-transition ${cssClass}`} style={containerStyle} data-testid="transition-overlay-generic" />;
}
