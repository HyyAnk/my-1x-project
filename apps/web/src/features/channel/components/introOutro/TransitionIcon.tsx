import React from "react";
import { Drop, FilmStrip, Lightning, PaintBrush, Play, Sparkle, type IconWeight } from "@phosphor-icons/react";

export interface TransitionIconProps {
  iconName?: string;
  transitionId?: string;
  size?: number;
  weight?: IconWeight;
  className?: string;
}

export const TransitionIcon: React.FC<TransitionIconProps> = ({ iconName, transitionId, size = 18, weight = "fill", className = "" }) => {
  const normalizedKey = (iconName || transitionId || "").toLowerCase();

  if (normalizedKey.includes("lightning") || normalizedKey.includes("stinger")) {
    return <Lightning size={size} weight={weight} className={className} />;
  }
  if (normalizedKey.includes("crossfade") || normalizedKey.includes("sparkle")) {
    return <Sparkle size={size} weight={weight} className={className} />;
  }
  if (normalizedKey.includes("cut") || normalizedKey.includes("play")) {
    return <Play size={size} weight={weight} className={className} />;
  }
  if (normalizedKey.includes("bubble") || normalizedKey.includes("drop")) {
    return <Drop size={size} weight={weight} className={className} />;
  }
  if (normalizedKey.includes("brush") || normalizedKey.includes("paint")) {
    return <PaintBrush size={size} weight={weight} className={className} />;
  }

  return <FilmStrip size={size} weight={weight} className={className} />;
};
