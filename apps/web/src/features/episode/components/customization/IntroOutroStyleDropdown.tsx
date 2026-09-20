import { useEffect, useState } from "react";
import {
  BUILT_IN_PRESETS,
  resolveBuiltInPresetCategoryId,
  type Channel,
  type Episode,
  type IntroOutroSelection,
  type IntroOutroStyle,
} from "@studio/shared";
import { api } from "../../../../api";
import type { IntroOutroCategorySummary } from "../../../../api/introOutroApi";
import { CustomizationPill } from "./CustomizationPill";
import { CustomizationPopover } from "./CustomizationPopover";
import { StyleOptionRow } from "./StyleOptionRow";

export interface IntroOutroStyleDropdownProps {
  channel: Channel;
  episode: Episode;
  disabled?: boolean;
  saving?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSaveIntroOutroSelection: (selection: IntroOutroSelection) => void;
}

function resolveSelection(episode: Episode): IntroOutroSelection {
  const legacyStyleId = episode.quiz_config?.intro_outro_style_id;
  if (legacyStyleId === "none") return { mode: "none" };
  if (legacyStyleId) return { mode: "specific_pair", style_id: legacyStyleId };
  return episode.quiz_config?.intro_outro_selection ?? { mode: "style_builtin" };
}

export function IntroOutroStyleDropdown({
  channel,
  episode,
  disabled = false,
  saving = false,
  isOpen,
  onToggle,
  onSaveIntroOutroSelection,
}: IntroOutroStyleDropdownProps) {
  const [styles, setStyles] = useState<IntroOutroStyle[]>([]);
  const [categories, setCategories] = useState<IntroOutroCategorySummary[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const selection = resolveSelection(episode);
  const categoryId = resolveBuiltInPresetCategoryId(episode.quiz_config);
  const category = BUILT_IN_PRESETS.find((preset) => preset.id === categoryId) ?? BUILT_IN_PRESETS[0];
  const readyInCategory = categories.find((item) => item.style_preset_id === category.id)?.ready_count ?? 0;
  const selectedStyle = selection.mode === "specific_pair" ? styles.find((style) => style.style_id === selection.style_id) : undefined;

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    void Promise.all([api.listIntroOutroStyles(channel.channel_id), api.listIntroOutroCategories(channel.channel_id)])
      .then(([styleResponse, categoryResponse]) => {
        if (!cancelled) {
          setStyles(styleResponse.styles);
          setCategories(categoryResponse.categories);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [channel.channel_id]);

  const displayValue =
    selection.mode === "none"
      ? "None"
      : selection.mode === "specific_pair"
        ? (selectedStyle?.name ?? "Specific Pair")
        : `Built-in Style · ${category.name}`;

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
        <CustomizationPopover title="Intro / Outro">
          <StyleOptionRow
            name="intro_outro_choice"
            label={`Built-in Style · ${category.name}`}
            checked={selection.mode === "style_builtin"}
            onSelect={() => onSaveIntroOutroSelection({ mode: "style_builtin" })}
          />
          {categories.length > 0 && readyInCategory === 0 ? (
            <div className="style-option-message" role="status">
              No ready pairs in {category.name}
            </div>
          ) : null}

          {styles
            .filter((style) => style.status === "active")
            .map((style) => (
              <StyleOptionRow
                key={style.style_id}
                name="intro_outro_choice"
                label={style.name}
                checked={selection.mode === "specific_pair" && selection.style_id === style.style_id}
                onSelect={() => onSaveIntroOutroSelection({ mode: "specific_pair", style_id: style.style_id })}
              />
            ))}

          <StyleOptionRow
            name="intro_outro_choice"
            label="None"
            checked={selection.mode === "none"}
            onSelect={() => onSaveIntroOutroSelection({ mode: "none" })}
          />
          {loadFailed ? <div className="style-option-message is-error">Could not load specific pairs</div> : null}
        </CustomizationPopover>
      ) : null}
    </div>
  );
}
