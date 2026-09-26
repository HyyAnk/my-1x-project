import { useState } from "react";
import type { Channel } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { useChannelIntroOutro } from "../hooks/useChannelIntroOutro";
import { IntroOutroCategoryDetail } from "./introOutro/IntroOutroCategoryDetail";
import { IntroOutroCategoryGrid } from "./introOutro/IntroOutroCategoryGrid";
import { IntroOutroPreviewModal, type IntroOutroPreviewClip } from "./introOutro/IntroOutroPreviewModal";

export interface ChannelIntroOutroTabProps {
  channel: Channel;
  onNotice: (notice: NonNullable<Notice>) => void;
  onChannelUpdate?: (updated: Channel) => void;
}

export function ChannelIntroOutroTab({ channel, onNotice, onChannelUpdate }: ChannelIntroOutroTabProps) {
  const { styles, categories, loading, busyAction, refreshStyles, handleDeleteStyle, handleAssignStyle } = useChannelIntroOutro({
    channel,
    onNotice,
    onChannelUpdate,
  });
  const [previewClip, setPreviewClip] = useState<IntroOutroPreviewClip | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const selectedCategory = categories.find((category) => category.style_preset_id === selectedCategoryId) ?? null;
  const categoryStyles = selectedCategory
    ? styles.filter((style) =>
        selectedCategory.style_preset_id === "uncategorized"
          ? !style.style_preset_id
          : style.style_preset_id === selectedCategory.style_preset_id,
      )
    : [];
  return (
    <section className="channel-tab-panel intro-outro-tab" style={{ padding: "24px 0" }}>
      {selectedCategory ? (
        <IntroOutroCategoryDetail
          category={selectedCategory}
          styles={categoryStyles}
          channelId={channel.channel_id}
          busyAction={busyAction}
          onBack={() => setSelectedCategoryId(null)}
          onUploaded={() => refreshStyles(true)}
          onPreview={setPreviewClip}
          onDelete={(id, name) => void handleDeleteStyle(id, name)}
          onAssignCategory={(styleId, stylePresetId) => void handleAssignStyle(styleId, stylePresetId)}
        />
      ) : (
        <>
          <div className="intro-outro-tab-header">
            <div className="intro-outro-title-group">
              <h2>Intro & Outro</h2>
            </div>
          </div>
          {loading && categories.length === 0 ? (
            <div className="intro-outro-loading">Loading styles...</div>
          ) : (
            <IntroOutroCategoryGrid categories={categories} onOpenCategory={setSelectedCategoryId} />
          )}
        </>
      )}
      <IntroOutroPreviewModal channelId={channel.channel_id} previewClip={previewClip} onClose={() => setPreviewClip(null)} />
    </section>
  );
}
