import React from "react";
import type { Episode, MascotRenderAspectRatio } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import { CustomizationPill } from "./CustomizationPill";
import { CustomizationPopover } from "./CustomizationPopover";
import { StyleOptionRow } from "./StyleOptionRow";

type Props = {
  episode: Episode;
  disabled: boolean;
  saving: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectRatio: (ratio: MascotRenderAspectRatio) => void;
};

const ASPECT_RATIO_OPTIONS: Array<{
  id: MascotRenderAspectRatio;
  label: string;
  sublabel: string;
}> = [
  { id: "16:9", label: "16:9 Landscape", sublabel: "YouTube Video Standard (1920x1080)" },
  { id: "9:16", label: "9:16 Portrait", sublabel: "Shorts / TikTok Cover (1080x1920)" },
];

const RATIO_LABELS: Record<MascotRenderAspectRatio, string> = {
  "16:9": "16:9 Landscape",
  "9:16": "9:16 Shorts",
};

export function AspectRatioDropdown({ episode, disabled, saving, isOpen, onToggle, onSelectRatio }: Props) {
  const { t } = useTranslation();
  const currentRatio: MascotRenderAspectRatio = episode.quiz_config?.render_aspect_ratio || "16:9";

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={t("episodeCustomization.pillAspectRatio")}
        value={RATIO_LABELS[currentRatio] || "16:9 Landscape"}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen ? (
        <CustomizationPopover title="Video Aspect Ratio">
          {ASPECT_RATIO_OPTIONS.map((opt) => (
            <StyleOptionRow
              key={opt.id}
              name="render_aspect_ratio_choice"
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
