import React from "react";
import type { Episode, ThumbnailRatioMode } from "@studio/shared";
import { CustomizationPill } from "./CustomizationPill";
import { CustomizationPopover } from "./CustomizationPopover";
import { StyleOptionRow } from "./StyleOptionRow";

type Props = {
  episode: Episode;
  disabled: boolean;
  saving: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectRatio: (ratio: ThumbnailRatioMode) => void;
};

const THUMBNAIL_RATIO_OPTIONS: Array<{
  id: ThumbnailRatioMode;
  label: string;
  sublabel: string;
}> = [
  { id: "auto", label: "Auto (Match Video)", sublabel: "Detects 16:9 Video or 9:16 Shorts" },
  { id: "16:9", label: "16:9 Landscape", sublabel: "YouTube Video Standard (1280x720)" },
  { id: "9:16", label: "9:16 Portrait", sublabel: "Shorts / TikTok Cover (1080x1920)" },
  { id: "both", label: "Both (16:9 & 9:16)", sublabel: "Generate dual aspect ratios" },
];

const RATIO_LABELS: Record<ThumbnailRatioMode, string> = {
  auto: "Auto (Video)",
  "16:9": "16:9 Video",
  "9:16": "9:16 Shorts",
  both: "Both (Dual)",
};

export function ThumbnailRatioDropdown({ episode, disabled, saving, isOpen, onToggle, onSelectRatio }: Props) {
  const currentRatio = episode.quiz_config?.thumbnail_aspect_ratio || "auto";

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label="Thumbnail"
        value={RATIO_LABELS[currentRatio] || "Auto (Video)"}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title="Thumbnail Mode">
          {THUMBNAIL_RATIO_OPTIONS.map((opt) => (
            <StyleOptionRow
              key={opt.id}
              name="thumbnail_ratio_choice"
              label={opt.label}
              checked={currentRatio === opt.id}
              onSelect={() => onSelectRatio(opt.id)}
            />
          ))}
        </CustomizationPopover>
      ) : null}
    </div>
  );
}
