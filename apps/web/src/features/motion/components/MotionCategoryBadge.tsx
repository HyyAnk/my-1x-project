import type { MotionTemplateCategory } from "@studio/shared";

interface MotionCategoryBadgeProps {
  category: MotionTemplateCategory;
}

const CATEGORY_META: Record<MotionTemplateCategory, { label: string; icon: string; className: string }> = {
  kinetic: { label: "Kinetic", icon: "⚡", className: "badge-kinetic" },
  cyber: { label: "Cyberpunk", icon: "👾", className: "badge-cyber" },
  minimal: { label: "Minimal", icon: "✨", className: "badge-minimal" },
  gamified: { label: "Gamified", icon: "🎮", className: "badge-gamified" },
};

export function MotionCategoryBadge({ category }: MotionCategoryBadgeProps) {
  const meta = CATEGORY_META[category] ?? { label: category, icon: "🎬", className: "badge-default" };

  return (
    <span className={`motion-category-badge ${meta.className}`}>
      <span className="badge-icon" aria-hidden="true">
        {meta.icon}
      </span>
      <span>{meta.label}</span>
    </span>
  );
}
