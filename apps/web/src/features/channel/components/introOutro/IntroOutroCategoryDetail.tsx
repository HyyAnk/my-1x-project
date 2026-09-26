import { ArrowLeft } from "@phosphor-icons/react";
import type { IntroOutroStyle } from "@studio/shared";
import type { IntroOutroCategorySummary } from "../../../../api/introOutroApi";
import { NewPairCard } from "../../pairWorkspace/NewPairCard";
import { IntroOutroStyleCard } from "./IntroOutroStyleCard";
import type { IntroOutroPreviewClip } from "./IntroOutroPreviewModal";

type Props = {
  category: IntroOutroCategorySummary;
  styles: IntroOutroStyle[];
  channelId: string;
  busyAction: string | null;
  onBack: () => void;
  onUploaded: () => Promise<void>;
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
  onUploaded,
  onPreview,
  onDelete,
  onAssignCategory,
}: Props) {
  const isUncategorized = category.style_preset_id === "uncategorized";
  return (
    <>
      <div className="intro-outro-tab-header">
        <div className="intro-outro-category-heading">
          <button type="button" className="icon-button" onClick={onBack} aria-label="Back to styles">
            <ArrowLeft size={18} />
          </button>
          <div className="intro-outro-title-group">
            <h2>{category.name}</h2>
          </div>
        </div>
      </div>
      <div className="intro-outro-pair-grid">
        {!isUncategorized ? (
          <NewPairCard
            key={`${channelId}:${category.style_preset_id}`}
            channelId={channelId}
            stylePresetId={category.style_preset_id}
            onUploaded={onUploaded}
          />
        ) : null}
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
    </>
  );
}
