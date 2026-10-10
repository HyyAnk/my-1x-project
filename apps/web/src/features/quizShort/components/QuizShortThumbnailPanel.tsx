import { ImageSquare } from "@phosphor-icons/react";
import type { useQuizShortThumbnail } from "../hooks/useQuizShortThumbnail";
import { ThumbnailControlsDeck } from "../../episode/components/ThumbnailControlsDeck";

export type QuizShortThumbnailPanelProps = {
  thumbnail: ReturnType<typeof useQuizShortThumbnail>;
  title: string;
};

/** One 9:16 cover with the shared controls deck; Quiz Shorts have no ratio or history picker. */
export function QuizShortThumbnailPanel({ thumbnail, title }: QuizShortThumbnailPanelProps) {
  return (
    <section className="quiz-short-thumbnail-panel" aria-label="Cover thumbnail" data-testid="quiz-short-thumbnail-panel">
      <div className="quiz-short-thumbnail-stage">
        {thumbnail.imageUrl ? (
          <img src={thumbnail.imageUrl} alt={`Cover thumbnail for ${title}`} className="quiz-short-thumbnail-image" />
        ) : (
          <div className="quiz-short-thumbnail-placeholder" data-testid="quiz-short-thumbnail-placeholder">
            <ImageSquare size={32} weight="duotone" />
            <span>{thumbnail.loading ? "Loading cover..." : "No cover yet. Generate a 9:16 cover from question one."}</span>
          </div>
        )}
      </div>
      <ThumbnailControlsDeck
        selectedLayout={thumbnail.selectedLayout}
        setSelectedLayout={thumbnail.setSelectedLayout}
        selectedBadge={thumbnail.selectedBadge}
        setSelectedBadge={thumbnail.setSelectedBadge}
        customHook={thumbnail.customHook}
        setCustomHook={thumbnail.setCustomHook}
        manifest={thumbnail.manifest}
        hasAnyThumbnail={thumbnail.hasThumbnail}
        generating={thumbnail.generating}
        loading={thumbnail.loading}
        onGenerateThumbnail={() => void thumbnail.generate()}
        onResetDefaults={thumbnail.resetDefaults}
      />
    </section>
  );
}
