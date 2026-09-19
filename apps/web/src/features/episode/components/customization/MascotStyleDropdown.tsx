import { useEffect, useMemo, useState } from "react";
import { Check } from "@phosphor-icons/react";
import type { Channel, Episode, MascotProfile, MascotStyle } from "@studio/shared";
import { api } from "../../../../api";
import { useTranslation } from "../../../../i18n";
import {
  computeDisplayValue,
  createFallbackCoreStyle,
  resolveStyleThumbnail,
} from "../../utils/mascotDropdownHelpers";
import { CustomizationPill } from "./CustomizationPill";
import { CustomizationPopover } from "./CustomizationPopover";
import { StyleOptionRow } from "./StyleOptionRow";
import { StyleThumbnail } from "./StyleThumbnail";

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
  const [fetchedMascot, setFetchedMascot] = useState<MascotProfile | null>(null);

  useEffect(() => {
    const mascotId = channel.mascot_id;
    if (!mascotId || mascotId === "none") return;
    let cancelled = false;
    api
      .mascot(mascotId)
      .then((res) => {
        if (!cancelled && res?.mascot) {
          setFetchedMascot(res.mascot);
          if (availableMascotStyles === undefined && res.mascot.styles) setFetchedStyles(res.mascot.styles);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [availableMascotStyles, channel.mascot_id]);

  const styles = availableMascotStyles ?? fetchedStyles;
  const hasNoMascot = !channel.mascot_id || channel.mascot_id === "none";
  const isMascotDisabled = channel.mascot_config?.enabled === false;
  const isControlDisabled = Boolean(disabled || hasNoMascot || isMascotDisabled);

  const currentStyleId = mascotStyleId !== undefined ? mascotStyleId : (episode.quiz_config?.mascot_style_id ?? null);
  const displayValue = computeDisplayValue(hasNoMascot, isMascotDisabled, currentStyleId, styles);
  const customStyles = styles.filter((s) => s.id !== "core");

  const coreStyle = useMemo(() => {
    const fromList = styles.find((s) => s.id === "core");
    if (fromList) return fromList;
    if (fetchedMascot) {
      return createFallbackCoreStyle(fetchedMascot.master_image_url, fetchedMascot.created_at, fetchedMascot.updated_at);
    }
    return null;
  }, [styles, fetchedMascot]);

  const isCoreSelected = !currentStyleId || currentStyleId === "core" || currentStyleId === "default";
  const coreThumbnail = resolveStyleThumbnail(coreStyle, true, Boolean(channel.mascot_id), fetchedMascot?.master_image_url);

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
          <label className={`style-option-row ${isCoreSelected ? "is-checked" : ""}`} onClick={() => onSaveMascotStyle?.(null)}>
            <input type="radio" name="mascot_style_choice" checked={isCoreSelected} onChange={() => onSaveMascotStyle?.(null)} />
            <StyleThumbnail thumbUrl={coreThumbnail} altText="Core Style" />
            <span className="style-option-label">Core Style (Default)</span>
            {isCoreSelected ? <Check size={14} weight="bold" className="style-option-check" /> : null}
          </label>
          {customStyles.map((style) => {
            const isChecked = currentStyleId === style.id;
            const thumbUrl = resolveStyleThumbnail(style, false, Boolean(channel.mascot_id));
            return (
              <label
                key={style.id}
                className={`style-option-row ${isChecked ? "is-checked" : ""}`}
                onClick={() => onSaveMascotStyle?.(style.id)}
              >
                <input type="radio" name="mascot_style_choice" checked={isChecked} onChange={() => onSaveMascotStyle?.(style.id)} />
                <StyleThumbnail thumbUrl={thumbUrl} altText={style.name} />
                <span className="style-option-label">{style.name}</span>
                {isChecked ? <Check size={14} weight="bold" className="style-option-check" /> : null}
              </label>
            );
          })}
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
