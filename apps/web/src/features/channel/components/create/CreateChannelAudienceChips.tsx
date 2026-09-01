import React from "react";
import { useTranslation } from "../../../../i18n";
import type { AudiencePreset } from "./types";

const AUDIENCE_PRESETS: AudiencePreset[] = [
  {
    id: "kids",
    labelVi: "Trẻ em & Gia đình",
    labelEn: "Kids & Family",
    value: "Children and families",
    icon: "👶",
  },
  {
    id: "genz",
    labelVi: "Gen Z & Giới trẻ",
    labelEn: "Gen Z & Teens",
    value: "Gen Z and young adults",
    icon: "⚡",
  },
  {
    id: "trivia",
    labelVi: "Đố vui & Tri thức",
    labelEn: "Trivia & Quiz",
    value: "Trivia and quiz enthusiasts",
    icon: "🧠",
  },
  {
    id: "general",
    labelVi: "Đại chúng",
    labelEn: "General",
    value: "General audience of all ages",
    icon: "🌍",
  },
];

export interface CreateChannelAudienceChipsProps {
  selectedAudience: string;
  onSelectAudience: (value: string) => void;
  disabled?: boolean;
}

export function CreateChannelAudienceChips({
  selectedAudience,
  onSelectAudience,
  disabled = false,
}: CreateChannelAudienceChipsProps) {
  const { language } = useTranslation();

  return (
    <div className="channel-preset-chips-row" role="group" aria-label="Audience Presets">
      {AUDIENCE_PRESETS.map((preset) => {
        const isSelected = selectedAudience.toLowerCase().includes(preset.value.toLowerCase()) ||
          selectedAudience.toLowerCase().includes(preset.id);
        const label = language === "vi" ? preset.labelVi : preset.labelEn;

        return (
          <button
            key={preset.id}
            type="button"
            className={`channel-preset-chip ${isSelected ? "is-selected" : ""}`}
            onClick={() => onSelectAudience(preset.value)}
            disabled={disabled}
            title={label}
          >
            <span className="preset-chip-icon">{preset.icon}</span>
            <span className="preset-chip-text">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
