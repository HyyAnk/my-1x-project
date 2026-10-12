import { useState } from "react";
import type { Channel } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { IntroOutroCategoryGrid } from "../../channel/components/introOutro/IntroOutroCategoryGrid";
import { useShortBookendLibrary } from "../hooks/useShortBookendLibrary";
import type { ShortBookendPreview } from "../types/shortIntroOutro.types";
import { ShortBookendCategoryDetail } from "./ShortBookendCategoryDetail";
import { ShortBookendPreviewModal } from "./ShortBookendPreviewModal";
import "../shortIntroOutro.css";

export type ShortIntroOutroTabProps = {
  channel: Channel;
  onNotice: (notice: NonNullable<Notice>) => void;
};

/** Channel tab for portrait Quiz Short intro/outro pairs, grouped by built-in style. */
export function ShortIntroOutroTab({ channel, onNotice }: ShortIntroOutroTabProps) {
  const library = useShortBookendLibrary(channel.channel_id, onNotice);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ShortBookendPreview | null>(null);
  const category = library.categories.find((item) => item.style_preset_id === selectedCategoryId) ?? null;

  return (
    <section className="channel-tab-panel intro-outro-tab short-intro-outro-tab">
      {category ? (
        <ShortBookendCategoryDetail
          category={category}
          pairs={library.pairs.filter((pair) => pair.style_preset_id === category.style_preset_id)}
          channelId={channel.channel_id}
          busyAction={library.busyAction}
          onBack={() => setSelectedCategoryId(null)}
          onUploaded={library.refresh}
          onPreview={setPreview}
          onDelete={(pair) => void library.deletePair(pair)}
          onSaveTitleCanvas={library.saveTitleCanvas}
        />
      ) : (
        <>
          <div className="intro-outro-tab-header">
            <div className="intro-outro-title-group">
              <h2>Short Intro & Outro</h2>
              <p className="short-bookend-subtitle">Portrait 1080×1920 pairs for Quiz Shorts, picked by each Short's style.</p>
            </div>
          </div>
          {library.loading && library.categories.length === 0 ? (
            <div className="intro-outro-loading">Loading styles...</div>
          ) : (
            <IntroOutroCategoryGrid categories={library.categories} onOpenCategory={setSelectedCategoryId} />
          )}
        </>
      )}
      <ShortBookendPreviewModal channelId={channel.channel_id} preview={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
