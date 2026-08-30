import { useEffect, useRef, useState } from "react";
import { CaretDown, Palette } from "@phosphor-icons/react";
import { ALL_QUIZ_IMAGE_STYLES, QUIZ_IMAGE_STYLE_LABELS, type Channel, type QuizImageStyle } from "@studio/shared";
import { api } from "../../../api";
import type { Notice } from "../../../components/types";

export const QUIZ_IMAGE_STYLE_DESCRIPTIONS: Record<QuizImageStyle, string> = {
  pixar_3d: "Cinematic 3D animation with expressive eyes, soft cinematic studio lighting, and gentle depth.",
  flat_vector: "Clean 2D flat vector cartoon with bold outlines, bright pastel colors, and crisp geometry.",
  kawaii_chibi: "Japanese Chibi Anime with sparkling sweet eyes, soft lines, and subtle twinkling accents.",
  natural_realism: "Authentic cinematic photography with breathtaking natural lighting, photorealistic textures, and realistic depth.",
  plastic_toy: "Glossy Pop Mart vinyl art toy aesthetic with sleek studio reflections and smooth contact shadows.",
};

export function VisualStylesMenu({
  channel,
  onRefresh,
  onNotice,
}: {
  channel: Channel;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialStyles = channel.selected_styles && channel.selected_styles.length > 0 ? channel.selected_styles : ALL_QUIZ_IMAGE_STYLES;
  const [selectedStyles, setSelectedStyles] = useState<QuizImageStyle[]>(initialStyles);
  const [hoveredStyle, setHoveredStyle] = useState<QuizImageStyle>("pixar_3d");

  useEffect(() => {
    if (channel.selected_styles && channel.selected_styles.length > 0) {
      setSelectedStyles(channel.selected_styles);
    } else {
      setSelectedStyles(ALL_QUIZ_IMAGE_STYLES);
    }
  }, [channel.selected_styles]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const toggleStyle = async (style: QuizImageStyle) => {
    let next: QuizImageStyle[];
    if (selectedStyles.includes(style)) {
      if (selectedStyles.length <= 1) {
        onNotice({ tone: "bad", message: "Channel must have at least 1 visual style enabled" });
        return;
      }
      next = selectedStyles.filter((s) => s !== style);
    } else {
      next = [...selectedStyles, style];
    }

    // Optimistic UI update for instant feedback
    setSelectedStyles(next);

    try {
      await api.updateChannel(channel.channel_id, { selected_styles: next });
      await onRefresh();
      onNotice({ tone: "good", message: `Updated: ${next.length} visual styles active` });
    } catch (err) {
      // Revert if request failed
      setSelectedStyles(selectedStyles);
      onNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to update visual styles" });
    }
  };

  const previewStyle = hoveredStyle || selectedStyles[0] || "pixar_3d";

  return (
    <div className="visual-styles-dropdown-wrap" ref={menuRef}>
      <button
        type="button"
        className={`quiet-button compact visual-styles-btn ${open ? "is-active" : ""}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) {
            setHoveredStyle(selectedStyles[0] || "pixar_3d");
          }
        }}
        title="Select visual styles enabled for this channel"
      >
        <Palette size={15} />
        <span>Styles ({selectedStyles.length})</span>
        <CaretDown size={12} />
      </button>
      {open ? (
        <div className="visual-styles-popover visual-styles-popover-wide">
          <div className="visual-styles-content-grid">
            <div className="visual-styles-list-col">
              <div className="popover-header">
                <strong>
                  🎨 Visual Styles ({selectedStyles.length}/{ALL_QUIZ_IMAGE_STYLES.length})
                </strong>
                <small>Hover to preview art style</small>
              </div>
              <div className="popover-list">
                {ALL_QUIZ_IMAGE_STYLES.map((style) => {
                  const isChecked = selectedStyles.includes(style);
                  const isHovered = previewStyle === style;
                  return (
                    <label
                      key={style}
                      className={`style-checkbox-item ${isChecked ? "is-checked" : ""} ${isHovered ? "is-hovered" : ""}`}
                      onMouseEnter={() => setHoveredStyle(style)}
                    >
                      <input type="checkbox" checked={isChecked} onChange={() => void toggleStyle(style)} />
                      <span className="style-label">{QUIZ_IMAGE_STYLE_LABELS[style]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="visual-styles-preview-col">
              <div className="style-preview-card">
                <div className="style-preview-img-wrap">
                  <img
                    src={`/style-previews/${previewStyle}.png`}
                    alt={QUIZ_IMAGE_STYLE_LABELS[previewStyle]}
                    className="style-preview-img"
                  />
                  <span className="style-preview-tag">{QUIZ_IMAGE_STYLE_LABELS[previewStyle]}</span>
                </div>
                <div className="style-preview-desc">
                  <p>{QUIZ_IMAGE_STYLE_DESCRIPTIONS[previewStyle]}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
