import { useEffect, useMemo, useState } from "react";
import { Check } from "@phosphor-icons/react";
import {
  getMascotStyleReadiness,
  type Channel,
  type Episode,
  type MascotProfile,
  type MascotStyle,
} from "@studio/shared";
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
          if (availableMascotStyles === undefined && res.mascot.styles) {
            setFetchedStyles(res.mascot.styles);
          }
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

  const coreStyle: MascotStyle | null = useMemo(() => {
    const fromList = styles.find((s) => s.id === "core");
    if (fromList) return fromList;
    if (fetchedMascot) {
      return {
        id: "core",
        name: "Core Style",
        keyword: "",
        anchor_image_url: fetchedMascot.master_image_url || null,
        is_default: true,
        states: {
          thinking: [],
          celebrate: [],
        },
        created_at: fetchedMascot.created_at || "",
        updated_at: fetchedMascot.updated_at || "",
      };
    }
    return null;
  }, [styles, fetchedMascot]);

  const getStyleThumbnail = (style: MascotStyle | null, isCore = false): string | null => {
    if (style?.anchor_image_url?.trim()) {
      return style.anchor_image_url.trim();
    }
    if (isCore && channel.mascot_id) {
      return fetchedMascot?.master_image_url?.trim() || null;
    }
    return null;
  };

  const getStyleReadinessLabel = (style: MascotStyle | null): string | null => {
    if (!style) return null;
    const readiness = getMascotStyleReadiness(style);
    if (readiness === "fully_expressive") {
      const thinkingCount = (style.states?.thinking || []).filter((v) => Boolean(v.image_url?.trim())).length;
      const celebrateCount = (style.states?.celebrate || []).filter((v) => Boolean(v.image_url?.trim())).length;
      const total = thinkingCount + celebrateCount;
      return `${total} Poses`;
    }
    if (readiness === "concept_locked") {
      const thinkingCount = (style.states?.thinking || []).filter((v) => Boolean(v.image_url?.trim())).length;
      const celebrateCount = (style.states?.celebrate || []).filter((v) => Boolean(v.image_url?.trim())).length;
      const total = thinkingCount + celebrateCount;
      return total > 0 ? `${total} Poses` : "Concept Locked";
    }
    return null;
  };

  const renderThumbnail = (thumbUrl: string | null, altText: string) => {
    if (!thumbUrl) return null;
    return (
      <span className="style-option-leading">
        <img
          src={thumbUrl}
          alt={altText}
          className="style-option-thumb mascot-style-thumb"
          style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }}
        />
      </span>
    );
  };

  const renderReadinessChip = (style: MascotStyle | null) => {
    const readinessText = getStyleReadinessLabel(style);
    if (!readinessText || !style) return null;
    const readiness = getMascotStyleReadiness(style);
    const isFully = readiness === "fully_expressive";

    return (
      <span
        className={`mascot-style-readiness-chip ${isFully ? "is-fully-expressive" : "is-concept-locked"}`}
        style={{
          marginLeft: 8,
          fontSize: "0.72rem",
          padding: "1px 6px",
          borderRadius: 4,
          background: isFully ? "rgba(34, 197, 94, 0.15)" : "rgba(59, 130, 246, 0.15)",
          color: isFully ? "#4ade80" : "#60a5fa",
          border: isFully ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(59, 130, 246, 0.3)",
          fontWeight: 600,
        }}
      >
        {readinessText}
      </span>
    );
  };

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
          {/* Core Style Option */}
          <label
            className={`style-option-row ${!currentStyleId || currentStyleId === "core" || currentStyleId === "default" ? "is-checked" : ""}`}
            onClick={() => onSaveMascotStyle?.(null)}
          >
            <input
              type="radio"
              name="mascot_style_choice"
              checked={!currentStyleId || currentStyleId === "core" || currentStyleId === "default"}
              onChange={() => onSaveMascotStyle?.(null)}
            />
            {renderThumbnail(getStyleThumbnail(coreStyle, true), "Core Style")}
            <span className="style-option-label">
              Core Style (Default)
              {renderReadinessChip(coreStyle)}
            </span>
            {!currentStyleId || currentStyleId === "core" || currentStyleId === "default" ? (
              <Check size={14} weight="bold" className="style-option-check" />
            ) : null}
          </label>
          {customStyles.map((style) => {
            const isChecked = currentStyleId === style.id;
            return (
              <label
                key={style.id}
                className={`style-option-row ${isChecked ? "is-checked" : ""}`}
                onClick={() => onSaveMascotStyle?.(style.id)}
              >
                <input
                  type="radio"
                  name="mascot_style_choice"
                  checked={isChecked}
                  onChange={() => onSaveMascotStyle?.(style.id)}
                />
                {renderThumbnail(getStyleThumbnail(style, false), style.name)}
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
                  {renderReadinessChip(style)}
                </span>
                {isChecked ? (
                  <Check size={14} weight="bold" className="style-option-check" />
                ) : null}
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
