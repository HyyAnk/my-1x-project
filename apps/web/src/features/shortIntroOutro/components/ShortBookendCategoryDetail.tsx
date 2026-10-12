import { ArrowLeft } from "@phosphor-icons/react";
import type { QuizShortBookendCategorySummary, QuizShortBookendPair } from "@studio/shared";
import type { ShortBookendBusyAction, ShortBookendPairActions } from "../types/shortIntroOutro.types";
import { ShortBookendPairCard } from "./ShortBookendPairCard";
import { ShortBookendUploadCard } from "./ShortBookendUploadCard";

type Props = ShortBookendPairActions & {
  category: QuizShortBookendCategorySummary;
  pairs: QuizShortBookendPair[];
  channelId: string;
  busyAction: ShortBookendBusyAction;
  onBack: () => void;
  onUploaded: () => Promise<void>;
};

/** One built-in style: the upload card followed by every Short pair in that style. */
export function ShortBookendCategoryDetail({ category, pairs, channelId, busyAction, onBack, onUploaded, ...actions }: Props) {
  return (
    <>
      <div className="intro-outro-tab-header">
        <div className="intro-outro-category-heading">
          <button type="button" className="icon-button" onClick={onBack} aria-label="Back to styles">
            <ArrowLeft size={18} />
          </button>
          <div className="intro-outro-title-group">
            <h2>{category.name}</h2>
            <p className="short-bookend-subtitle">
              Quiz Shorts using this style draw one of these pairs at random. The quiz title is drawn inside the dashed area.
            </p>
          </div>
        </div>
      </div>
      <div className="short-bookend-grid">
        <ShortBookendUploadCard
          key={`${channelId}:${category.style_preset_id}`}
          channelId={channelId}
          stylePresetId={category.style_preset_id}
          onUploaded={onUploaded}
        />
        {pairs.map((pair) => (
          <ShortBookendPairCard
            key={pair.pair_id}
            pair={pair}
            channelId={channelId}
            deleting={busyAction === `delete:${pair.pair_id}`}
            savingCanvas={busyAction === `canvas:${pair.pair_id}`}
            {...actions}
          />
        ))}
      </div>
    </>
  );
}
