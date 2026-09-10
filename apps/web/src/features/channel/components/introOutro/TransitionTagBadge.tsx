import React from "react";

export interface TransitionTagBadgeProps {
  tag?: string;
  className?: string;
}

function resolveTagStyle(tag?: string): { variantClass: string; label: string } {
  if (!tag) {
    return { variantClass: "tag-standard", label: "Standard" };
  }
  const normalized = tag.toLowerCase().trim();
  if (normalized.includes("recommend")) {
    return { variantClass: "tag-recommended", label: tag };
  }
  if (normalized.includes("cinema")) {
    return { variantClass: "tag-cinematic", label: tag };
  }
  if (normalized.includes("minimal")) {
    return { variantClass: "tag-minimal", label: tag };
  }
  if (normalized.includes("playful")) {
    return { variantClass: "tag-playful", label: tag };
  }
  if (normalized.includes("artistic")) {
    return { variantClass: "tag-artistic", label: tag };
  }
  if (normalized.includes("energy") || normalized.includes("fast")) {
    return { variantClass: "tag-energy", label: tag };
  }
  return { variantClass: "tag-standard", label: tag };
}

export const TransitionTagBadge: React.FC<TransitionTagBadgeProps> = ({ tag, className = "" }) => {
  if (!tag) return null;
  const { variantClass, label } = resolveTagStyle(tag);

  return <span className={`transition-tag-badge ${variantClass} ${className}`.trim()}>{label}</span>;
};
