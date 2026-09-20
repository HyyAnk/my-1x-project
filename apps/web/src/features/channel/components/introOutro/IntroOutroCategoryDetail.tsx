import { ArrowLeft, Plus } from "@phosphor-icons/react";
import type { IntroOutroStyle } from "@studio/shared";
import type { IntroOutroCategorySummary } from "../../../../api/introOutroApi";
import { IntroOutroEmptyState } from "./IntroOutroEmptyState";
import { IntroOutroStyleCard } from "./IntroOutroStyleCard";
import type { IntroOutroPreviewClip } from "./IntroOutroPreviewModal";

type Props = {
  category: IntroOutroCategorySummary;
  styles: IntroOutroStyle[];
  channelId: string;
  busyAction: string | null;
  onBack: () => void;
  onUpload: () => void;
  onPreview: (clip: IntroOutroPreviewClip) => void;
  onDelete: (styleId: string, name: string) => void;
  onAssignCategory: (styleId: string, stylePresetId: string) => void;
};

export function IntroOutroCategoryDetail({
  category,
  styles,
  channelId,
  busyAction,
  onBack,
  onUpload,
  onPreview,
  onDelete,
  onAssignCategory,
}: Props) {
  const isUncategorized = category.style_preset_id === "uncategorized";
  return (
    <>
      <div className="intro-outro-tab-header">
        <div className="intro-outro-category-heading">
          <button type="button" className="icon-button" onClick={onBack} aria-label="Back to categories">
            <ArrowLeft size={18} />
          </button>
          <div className="intro-outro-title-group">
            <h2>{category.name}</h2>
            <p>{category.ready_count} ready pairs</p>
          </div>
        </div>
        {!isUncategorized ? (
          <button type="button" className="intro-outro-add-btn" onClick={onUpload}>
            <Plus size={16} weight="bold" />
            <span>Upload Pair</span>
          </button>
        ) : null}
      </div>

      {styles.length === 0 ? (
        <IntroOutroEmptyState onAddStyle={onUpload} categoryName={category.name} />
      ) : (
        <div className="intro-outro-pair-grid">
          {styles.map((style) => (
            <IntroOutroStyleCard
              key={style.style_id}
              style={style}
              channelId={channelId}
              isDeleting={busyAction === `delete_${style.style_id}`}
              isAssigning={busyAction === `assign_${style.style_id}`}
              onPreviewClip={onPreview}
              onDelete={onDelete}
              onAssignCategory={isUncategorized ? onAssignCategory : undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}
