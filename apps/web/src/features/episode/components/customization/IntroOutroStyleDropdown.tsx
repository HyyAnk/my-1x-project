import { useEffect, useState } from "react";
import { Check } from "@phosphor-icons/react";
import type { Channel, Episode, IntroOutroStyle } from "@studio/shared";
import { api } from "../../../../api";
import { CustomizationPill } from "./CustomizationPill";
import { CustomizationPopover } from "./CustomizationPopover";

export interface IntroOutroStyleDropdownProps {
  channel: Channel;
  episode: Episode;
  disabled?: boolean;
  saving?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  introOutroStyleId?: string | null;
  onSaveIntroOutroStyle?: (styleId: string | null) => void;
}

export function IntroOutroStyleDropdown({
  channel,
  episode,
  disabled = false,
  saving = false,
  isOpen,
  onToggle,
  introOutroStyleId,
  onSaveIntroOutroStyle,
}: IntroOutroStyleDropdownProps) {
  const [styles, setStyles] = useState<IntroOutroStyle[]>([]);
  const effectiveStyleId = introOutroStyleId !== undefined ? introOutroStyleId : episode.quiz_config?.intro_outro_style_id;

  useEffect(() => {
    let cancelled = false;
    if (!channel?.channel_id) return;
    void api
      .listIntroOutroStyles(channel.channel_id)
      .then((res) => {
        if (!cancelled && res?.styles) setStyles(res.styles);
      })
      .catch(() => {
        // Graceful fallback for test environments or network failure
      });
    return () => {
      cancelled = true;
    };
  }, [channel?.channel_id]);

  const defaultStyle = styles.find((s) => s.style_id === channel?.default_intro_outro_style_id);
  const selectedStyle = styles.find((s) => s.style_id === effectiveStyleId);

  let displayValue: string;
  if (effectiveStyleId === "none") {
    displayValue = "None (Skip Intro)";
  } else if (selectedStyle) {
    displayValue = selectedStyle.name;
  } else if (effectiveStyleId) {
    displayValue = defaultStyle ? `${defaultStyle.name} (Default)` : "Default";
  } else if (defaultStyle) {
    displayValue = `${defaultStyle.name} (Default)`;
  } else {
    displayValue = "Default";
  }

  const handleSelectStyle = (styleId: string | null) => {
    if (onSaveIntroOutroStyle) {
      onSaveIntroOutroStyle(styleId);
    } else if (channel?.channel_id && episode?.episode_id) {
      void api
        .updateEpisode(channel.channel_id, episode.episode_id, {
          intro_outro_style_id: styleId,
        })
        .catch(() => {
          // Graceful fallback
        });
    }
  };

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label="Intro / Outro"
        value={displayValue}
        isOpen={isOpen}
        disabled={disabled}
        saving={saving}
        onToggle={onToggle}
      />

      {isOpen && !disabled ? (
        <CustomizationPopover title="Intro / Outro Style">
          {/* Default Option */}
          <label className={`style-option-row ${!effectiveStyleId ? "is-checked" : ""}`} onClick={() => handleSelectStyle(null)}>
            <input type="radio" name="intro_outro_choice" checked={!effectiveStyleId} onChange={() => handleSelectStyle(null)} />
            <span className="style-option-label">{defaultStyle ? `${defaultStyle.name} (Channel Default)` : "Channel Default"}</span>
            {!effectiveStyleId ? <Check size={14} weight="bold" className="style-option-check" /> : null}
          </label>

          {/* List of uploaded styles */}
          {styles.map((style) => {
            const isChecked = effectiveStyleId === style.style_id;
            return (
              <label
                key={style.style_id}
                className={`style-option-row ${isChecked ? "is-checked" : ""}`}
                onClick={() => handleSelectStyle(style.style_id)}
              >
                <input type="radio" name="intro_outro_choice" checked={isChecked} onChange={() => handleSelectStyle(style.style_id)} />
                <span className="style-option-label" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                  <span>{style.name}</span>
                  <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>
                    {style.intro.duration_seconds.toFixed(1)}s / {style.outro.duration_seconds.toFixed(1)}s
                  </span>
                </span>
                {isChecked ? <Check size={14} weight="bold" className="style-option-check" /> : null}
              </label>
            );
          })}

          {/* None / Skip option */}
          <label
            className={`style-option-row ${effectiveStyleId === "none" ? "is-checked" : ""}`}
            onClick={() => handleSelectStyle("none")}
          >
            <input
              type="radio"
              name="intro_outro_choice"
              checked={effectiveStyleId === "none"}
              onChange={() => handleSelectStyle("none")}
            />
            <span className="style-option-label">None (Direct to Quiz)</span>
            {effectiveStyleId === "none" ? <Check size={14} weight="bold" className="style-option-check" /> : null}
          </label>
        </CustomizationPopover>
      ) : null}
    </div>
  );
}
