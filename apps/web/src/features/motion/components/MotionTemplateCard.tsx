import type { MotionTemplateDefinition } from "@studio/shared";
import { MotionCategoryBadge } from "./MotionCategoryBadge";

interface MotionTemplateCardProps {
  template: MotionTemplateDefinition;
  isSelected: boolean;
  isPreviewing: boolean;
  onSelect: (template: MotionTemplateDefinition) => void;
  onPreview: (template: MotionTemplateDefinition) => void;
}

export function MotionTemplateCard({
  template,
  isSelected,
  isPreviewing,
  onSelect,
  onPreview,
}: MotionTemplateCardProps) {
  return (
    <div className={`motion-template-card ${isSelected ? "is-selected" : ""} ${isPreviewing ? "is-previewing" : ""}`}>
      <div className="motion-card-top">
        <div className="motion-card-badges">
          <MotionCategoryBadge category={template.category} />
          <span className="motion-placement-tag">
            {template.placement === "intro" ? "Intro" : "Outro"} · {template.defaultDurationSeconds.toFixed(1)}s
          </span>
        </div>
      </div>

      <div className="motion-card-body">
        <h4 className="motion-card-title">{template.name}</h4>
        <p className="motion-card-desc">{template.description}</p>
        <div className="motion-card-tags">
          <span className="motion-mini-tag">
            ⏱ {template.minDurationSeconds}s – {template.maxDurationSeconds}s
          </span>
        </div>
      </div>


      <div className="motion-card-actions">
        <button
          type="button"
          className={`motion-btn motion-btn-sm ${isPreviewing ? "motion-btn-active" : "motion-btn-secondary"}`}
          onClick={() => onPreview(template)}
          aria-label={`Preview ${template.name}`}
        >
          {isPreviewing ? "👁 In Preview" : "Preview"}
        </button>
        <button
          type="button"
          className={`motion-btn motion-btn-sm ${isSelected ? "motion-btn-primary" : "motion-btn-secondary"}`}
          onClick={() => onSelect(template)}
          aria-label={`Select ${template.name}`}
        >
          {isSelected ? "✓ Selected" : "Select"}
        </button>
      </div>
    </div>
  );
}
