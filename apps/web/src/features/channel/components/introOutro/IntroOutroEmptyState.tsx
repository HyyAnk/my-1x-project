import { FilmSlate, Plus } from "@phosphor-icons/react";

export interface IntroOutroEmptyStateProps {
  onAddStyle: () => void;
  categoryName?: string;
}

export function IntroOutroEmptyState({ onAddStyle, categoryName }: IntroOutroEmptyStateProps) {
  return (
    <div className="intro-outro-empty-container">
      <div className="intro-outro-empty-icon-glow">
        <FilmSlate size={34} weight="duotone" />
      </div>

      <h3 className="intro-outro-empty-title">No pairs yet</h3>
      {categoryName ? <p className="intro-outro-empty-desc">Upload the first pair for {categoryName}</p> : null}

      <button type="button" className="intro-outro-add-btn" onClick={onAddStyle}>
        <Plus size={16} weight="bold" />
        <span>Upload Pair</span>
      </button>
    </div>
  );
}
