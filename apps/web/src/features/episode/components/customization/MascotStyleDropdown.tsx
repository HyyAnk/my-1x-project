import { useEffect, useMemo, useState } from "react";
import { Check } from "@phosphor-icons/react";
import {
  BUILT_IN_PRESETS,
  DEFAULT_BUILT_IN_PRESET_ID,
  resolveBuiltInPresetCategoryId,
  type Channel,
  type Episode,
  type MascotProfile,
  type MascotStyle,
  type MascotStyleSelection,
} from "@studio/shared";
import { api } from "../../../../api";
import { useTranslation } from "../../../../i18n";
import { createFallbackCoreStyle, resolveStyleThumbnail } from "../../utils/mascotDropdownHelpers";
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
  mascotStyleSelection?: MascotStyleSelection;
  onSaveMascotStyleSelection?: (selection: MascotStyleSelection) => void;
  availableMascotStyles?: MascotStyle[];
};

function resolveSelection(episode: Episode, override?: MascotStyleSelection): MascotStyleSelection {
  if (override) return override;
  const legacyStyleId = episode.quiz_config?.mascot_style_id;
  if (legacyStyleId === "cycle" || legacyStyleId === "all") return { mode: "cycle" };
  if (legacyStyleId) return { mode: "specific_style", style_id: legacyStyleId === "default" ? "core" : legacyStyleId };
  return episode.quiz_config?.mascot_style_selection ?? { mode: "style_builtin" };
}

export function MascotStyleDropdown({
  channel,
  episode,
  disabled = false,
  saving = false,
  isOpen,
  onToggle,
  mascotStyleSelection,
  onSaveMascotStyleSelection,
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
    void api
      .mascot(mascotId)
      .then((response) => {
        if (cancelled || !response?.mascot) return;
        setFetchedMascot(response.mascot);
        if (availableMascotStyles === undefined) setFetchedStyles(response.mascot.styles ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [availableMascotStyles, channel.mascot_id]);

  const styles = availableMascotStyles ?? fetchedStyles;
  const hasNoMascot = !channel.mascot_id || channel.mascot_id === "none";
  const isMascotDisabled = channel.mascot_config?.enabled === false;
  const isControlDisabled = Boolean(disabled || hasNoMascot || isMascotDisabled);
  const selection = resolveSelection(episode, mascotStyleSelection);
  const presetId = resolveBuiltInPresetCategoryId(episode.quiz_config);
  const preset = BUILT_IN_PRESETS.find((candidate) => candidate.id === presetId) ?? BUILT_IN_PRESETS[0];

  const coreStyle = useMemo(() => {
    const fromList = styles.find((style) => style.id === "core");
    if (fromList) return fromList;
    if (!fetchedMascot) return null;
    return createFallbackCoreStyle(fetchedMascot.master_image_url, fetchedMascot.created_at, fetchedMascot.updated_at);
  }, [fetchedMascot, styles]);

  const builtInStyle =
    styles.find((style) => style.built_in_preset_id === preset.id) ?? (preset.id === DEFAULT_BUILT_IN_PRESET_ID ? coreStyle : null);
  const builtInLabel = `Built-in Style · ${builtInStyle?.name ?? preset.name}`;
  const specificStyle = selection.mode === "specific_style" ? styles.find((style) => style.id === selection.style_id) : undefined;
  const displayValue = hasNoMascot
    ? "No Mascot"
    : isMascotDisabled
      ? "Disabled"
      : selection.mode === "cycle"
        ? "Cycle Styles"
        : selection.mode === "specific_style"
          ? (specificStyle?.name ?? "Specific Style")
          : builtInLabel;
  const builtInThumbnail = resolveStyleThumbnail(
    builtInStyle,
    builtInStyle?.id === "core",
    Boolean(channel.mascot_id),
    fetchedMascot?.master_image_url,
  );

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
          <label className={`style-option-row ${selection.mode === "style_builtin" ? "is-checked" : ""}`}>
            <input
              type="radio"
              name="mascot_style_choice"
              checked={selection.mode === "style_builtin"}
              onChange={() => onSaveMascotStyleSelection?.({ mode: "style_builtin" })}
            />
            <StyleThumbnail thumbUrl={builtInThumbnail} altText={`Built-in ${builtInStyle?.name ?? preset.name}`} />
            <span className="style-option-label">{builtInLabel}</span>
            {selection.mode === "style_builtin" ? <Check size={14} weight="bold" className="style-option-check" /> : null}
          </label>

          {styles.map((style) => {
            const isChecked = selection.mode === "specific_style" && selection.style_id === style.id;
            const thumbnail = resolveStyleThumbnail(
              style,
              style.id === "core",
              Boolean(channel.mascot_id),
              fetchedMascot?.master_image_url,
            );
            return (
              <label key={style.id} className={`style-option-row ${isChecked ? "is-checked" : ""}`}>
                <input
                  type="radio"
                  name="mascot_style_choice"
                  checked={isChecked}
                  onChange={() => onSaveMascotStyleSelection?.({ mode: "specific_style", style_id: style.id })}
                />
                <StyleThumbnail thumbUrl={thumbnail} altText={`Specific ${style.name}`} />
                <span className="style-option-label">Specific · {style.name}</span>
                {isChecked ? <Check size={14} weight="bold" className="style-option-check" /> : null}
              </label>
            );
          })}

          <StyleOptionRow
            name="mascot_style_choice"
            label="Cycle Styles"
            checked={selection.mode === "cycle"}
            onSelect={() => onSaveMascotStyleSelection?.({ mode: "cycle" })}
          />
        </CustomizationPopover>
      ) : null}
    </div>
  );
}
