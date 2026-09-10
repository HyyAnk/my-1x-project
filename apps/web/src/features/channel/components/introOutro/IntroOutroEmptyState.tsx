import { FilmSlate, Plus, Sparkle, VideoCamera, Waves } from "@phosphor-icons/react";

export interface IntroOutroEmptyStateProps {
  onAddStyle: () => void;
}

export function IntroOutroEmptyState({ onAddStyle }: IntroOutroEmptyStateProps) {
  return (
    <div className="intro-outro-empty-container">
      <div className="intro-outro-empty-icon-glow">
        <FilmSlate size={34} weight="duotone" />
      </div>

      <h3 className="intro-outro-empty-title">Elevate Videos with Custom Intro & Outro</h3>
      <p className="intro-outro-empty-desc">
        Pair 1080p video openings featuring your channel mascot and branded outro calls-to-action. Every generated episode will
        automatically stitch these sequences with seamless stinger wipes.
      </p>

      <div className="intro-outro-feature-pills">
        <span className="intro-outro-feature-pill">
          <VideoCamera size={13} weight="fill" />
          <span>1080p FHD (1920x1080)</span>
        </span>
        <span className="intro-outro-feature-pill">
          <Sparkle size={13} weight="fill" />
          <span>Stinger & Crossfade Wipes</span>
        </span>
        <span className="intro-outro-feature-pill">
          <Waves size={13} weight="fill" />
          <span>Audio Sync & Preservation</span>
        </span>
      </div>

      <button type="button" className="intro-outro-add-btn" onClick={onAddStyle}>
        <Plus size={16} weight="bold" />
        <span>Add First Style Pair</span>
      </button>
    </div>
  );
}
