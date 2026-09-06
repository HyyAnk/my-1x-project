import { useEffect, useState } from "react";
import { Check } from "@phosphor-icons/react";
import type { Channel, Episode, MascotStyle } from "@studio/shared";
import { api } from "../../../../api";
import { useTranslation } from "../../../../i18n";
import { CustomizationPill } from "./CustomizationPill";
import { CustomizationPopover } from "./CustomizationPopover";
import { StyleOptionRow } from "./StyleOptionRow";

export type MascotStyleDropdownProps = {
  channel: Channel;
  episode: Episode;
  disabled?: boolean;
  saving?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  mascotStyleId?: string | null;
  onSaveMascotStyle?: (styleId: string | null) => void;
  availableMascotStyles?: MascotStyle[];
};

export function MascotStyleDropdown({
  channel,
  episode,
  disabled = false,
  saving = false,
  isOpen,
  onToggle,
  mascotStyleId,
  onSaveMascotStyle,
  availableMascotStyles,
}: MascotStyleDropdownProps) {
  const { t } = useTranslation();
  const translatedLabel = t("episodeCustomization.pillMascotStyle");
  const label = translatedLabel === "episodeCustomization.pillMascotStyle" ? "Mascot Style" : translatedLabel;
  const [fetchedStyles, setFetchedStyles] = useState<MascotStyle[]>([]);

  useEffect(() => {
    if (availableMascotStyles !== undefined) return;
    const mascotId = channel.mascot_id;
    if (!mascotId || mascotId === "none") return;

    let cancelled = false;
    api
      .mascot(mascotId)
      .then((res) => {
        if (!cancelled && res?.mascot?.styles) {
          setFetchedStyles(res.mascot.styles);
        }
      })
      .catch(() => {
        // Graceful fallback if mascot fetch fails
      });

    return () => {
      cancelled = true;
    };
  }, [availableMascotStyles, channel.mascot_id]);

  const styles = availableMascotStyles ?? fetchedStyles;
  const hasNoMascot = !channel.mascot_id || channel.mascot_id === "none";
  const isMascotDisabled = channel.mascot_config?.enabled === false;
  const isControlDisabled = Boolean(disabled || hasNoMascot || isMascotDisabled);

  const currentStyleId =
    mascotStyleId !== undefined
      ? mascotStyleId
      : (episode.quiz_config?.mascot_style_id ?? null);

  let displayValue = "Core Style (Default)";
  if (hasNoMascot) {
    displayValue = "No Mascot";
  } else if (isMascotDisabled) {
    displayValue = "Disabled";
  } else if (currentStyleId === "cycle" || currentStyleId === "all") {
    displayValue = "Cycle All Styles";
  } else if (currentStyleId && currentStyleId !== "core" && currentStyleId !== "default") {
    const matched = styles.find((s) => s.id === currentStyleId);
    if (matched) {
      displayValue = matched.is_default ? `${matched.name} (Default)` : matched.name;
    } else {
      displayValue = currentStyleId;
    }
  } else {
    const defaultStyle = styles.find((s) => s.is_default);
    if (defaultStyle && defaultStyle.id !== "core") {
      displayValue = `${defaultStyle.name} (Default)`;
    } else {
      displayValue = "Core Style (Default)";
    }
  }

  const customStyles = styles.filter((s) => s.id !== "core");

  return (
    <div className="customization-dropdown-item">
      <CustomizationPill
        label={label}
        value={displayValue}
        isOpen={isOpen}
        disabled={isControlDisabled}
        saving={saving}
        onToggle={onToggle}
      />
      {isOpen && !isControlDisabled ? (
        <CustomizationPopover title={label}>
          <StyleOptionRow
            name="mascot_style_choice"
            label="Core Style (Default)"
            checked={!currentStyleId || currentStyleId === "core" || currentStyleId === "default"}
            onSelect={() => onSaveMascotStyle?.(null)}
          />
          {customStyles.map((style) => (
            <label
              key={style.id}
              className={`style-option-row ${currentStyleId === style.id ? "is-checked" : ""}`}
              onClick={() => onSaveMascotStyle?.(style.id)}
            >
              <input
                type="radio"
                name="mascot_style_choice"
                checked={currentStyleId === style.id}
                onChange={() => onSaveMascotStyle?.(style.id)}
              />
              <span className="style-option-label">
                {style.name}
                {style.keyword ? (
                  <span
                    className="mascot-style-keyword-badge"
                    style={{
                      marginLeft: 8,
                      fontSize: "0.75rem",
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: "rgba(255, 255, 255, 0.12)",
                      color: "inherit",
                    }}
                  >
                    {style.keyword}
                  </span>
                ) : null}
              </span>
              {currentStyleId === style.id ? (
                <Check size={14} weight="bold" className="style-option-check" />
              ) : null}
            </label>
          ))}
          <StyleOptionRow
            name="mascot_style_choice"
            label="Cycle All Styles"
            checked={currentStyleId === "cycle" || currentStyleId === "all"}
            onSelect={() => onSaveMascotStyle?.("cycle")}
          />
        </CustomizationPopover>
      ) : null}
    </div>
  );
}
