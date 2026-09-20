import { ArrowRight, FolderOpen } from "@phosphor-icons/react";
import type { IntroOutroCategorySummary } from "../../../../api/introOutroApi";

type Props = {
  categories: IntroOutroCategorySummary[];
  onOpenCategory: (stylePresetId: string) => void;
};

export function IntroOutroCategoryGrid({ categories, onOpenCategory }: Props) {
  return (
    <div className="intro-outro-category-grid" aria-label="Intro and Outro categories">
      {categories.map((category) => (
        <button
          key={category.style_preset_id}
          type="button"
          className="intro-outro-category-card"
          onClick={() => onOpenCategory(category.style_preset_id)}
        >
          <span className="intro-outro-category-icon" aria-hidden="true">
            {category.icon || <FolderOpen size={22} weight="duotone" />}
          </span>
          <span className="intro-outro-category-copy">
            <strong>{category.name}</strong>
            <span>{category.ready_count} ready</span>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
