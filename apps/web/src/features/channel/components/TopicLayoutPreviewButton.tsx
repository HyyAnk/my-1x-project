import { useState } from "react";
import { Eye } from "@phosphor-icons/react";
import { resolveLayoutMeta } from "../constants/layoutPreviewCatalog";
import { LayoutWireframeModal } from "./LayoutWireframeModal";

export type TopicLayoutPreviewButtonProps = {
  quizFormat: string;
  archetype?: string;
  layoutId?: string;
  aspectRatio?: "16:9" | "9:16";
};

export function TopicLayoutPreviewButton({ quizFormat, archetype, layoutId, aspectRatio }: TopicLayoutPreviewButtonProps) {
  const [showPreview, setShowPreview] = useState(false);
  const { id, meta: layoutInfo } = resolveLayoutMeta(quizFormat, archetype, layoutId, aspectRatio);

  return (
    <div
      className="topic-layout-trigger-wrap"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
      onFocus={() => setShowPreview(true)}
      onBlur={() => setShowPreview(false)}
    >
      <button
        type="button"
        className={`topic-layout-badge-btn ${layoutInfo.btnClass}`}
        aria-label={`Layout: ${layoutInfo.name}`}
        onClick={(e) => {
          e.preventDefault();
          setShowPreview((prev) => !prev);
        }}
      >
        <span className="topic-layout-badge-icon">{layoutInfo.icon}</span>
        <span className="topic-layout-badge-text">{layoutInfo.name}</span>
        <Eye size={12} className="topic-layout-eye" />
      </button>

      {showPreview ? <LayoutWireframeModal layoutId={id} layoutInfo={layoutInfo} /> : null}
    </div>
  );
}
