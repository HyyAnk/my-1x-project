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
import { MotionTemplateSelector } from "../../../motion/components/MotionTemplateSelector";

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
  const [isMotionSelectorOpen, setIsMotionSelectorOpen] = useState(false);
  const selection = resolveSelection(episode);
  const categoryId = resolveBuiltInPresetCategoryId(episode.quiz_config);
  const category = BUILT_IN_PRESETS.find((preset) => preset.id === categoryId) ?? BUILT_IN_PRESETS[0];
  const readyInCategory = categories.find((item) => item.style_preset_id === category.id)?.ready_count ?? 0;
  const selectedStyle = selection.mode === "specific_pair" ? styles.find((style) => style.style_id === selection.style_id) : undefined;
  const snapshot = episode.quiz_config?.intro_outro_snapshot;
  const pinnedPair = snapshot?.pair_id ? styles.find((style) => style.style_id === snapshot.pair_id) : undefined;

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
  }, [channel.channel_id, isOpen]);

  const motionSummary =
    selection.mode === "motion_template"
      ? [selection.intro_template_id ? `Intro: ${selection.intro_template_id}` : null, selection.outro_template_id ? `Outro: ${selection.outro_template_id}` : null]
          .filter(Boolean)
          .join(" · ") || "Configured"
      : null;

  const displayValue =
    selection.mode === "none"
      ? "None"
      : selection.mode === "motion_template"
        ? `Motion · ${motionSummary}`
        : selection.mode === "specific_pair"
          ? (selectedStyle?.name ?? "Specific Pair")
          : `Built-in Style · ${category.name}`;

  const defaultStyle = styles.find((s) => s.style_id === channel.default_intro_outro_style_id);
  const hasUncategorizedDefaultFallback = Boolean(
    readyInCategory === 0 && defaultStyle && !defaultStyle.style_preset_id && defaultStyle.status === "active",
  );


  const getCategoryInfo = (presetId?: string | null) => {
    if (!presetId) return { name: "Uncategorized", icon: "📦" };
    const found = BUILT_IN_PRESETS.find((p) => p.id === presetId);
    return { name: found?.name ?? "Custom Style", icon: found?.icon ?? "🎬" };
  };

  const sortedStyles = [...styles.filter((style) => style.status === "active")].sort((a, b) => {
    const aMatch = a.style_preset_id === category.id ? 1 : 0;
    const bMatch = b.style_preset_id === category.id ? 1 : 0;
    if (bMatch !== aMatch) return bMatch - aMatch;
    const aDefault = a.style_id === channel.default_intro_outro_style_id ? 1 : 0;
    const bDefault = b.style_id === channel.default_intro_outro_style_id ? 1 : 0;
    if (bDefault !== aDefault) return bDefault - aDefault;
    return a.name.localeCompare(b.name);
  });

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
            leading={<span className="style-option-emoji">{category.icon}</span>}
            subtitle={
              readyInCategory > 0
                ? `${readyInCategory} ready pair${readyInCategory > 1 ? "s" : ""} in ${category.name}`
                : hasUncategorizedDefaultFallback
                  ? `Fallback to channel default (${defaultStyle?.name})`
                  : undefined
            }
            badge={readyInCategory > 0 ? `${readyInCategory} Ready` : undefined}
            checked={selection.mode === "style_builtin"}
            onSelect={() => onSaveIntroOutroSelection({ mode: "style_builtin" })}
          />
          <StyleOptionRow
            name="intro_outro_choice"
            label="Dynamic Motion Template (Opus)"
            leading={<span className="style-option-emoji">⚡</span>}
            subtitle={motionSummary ? `Configured (${motionSummary})` : "Animated HTML/SVG intros & outros"}
            badge="New"
            checked={selection.mode === "motion_template"}
            onSelect={() => setIsMotionSelectorOpen(true)}
          />
          {selection.mode === "style_builtin" && snapshot ? (

            <div className="style-option-message" role="status">
              {snapshot.pair_id ? `Selected pair: ${pinnedPair?.name ?? snapshot.pair_id}` : "No intro/outro for this episode"}
            </div>
          ) : null}
          {!snapshot && categories.length > 0 && readyInCategory === 0 && !hasUncategorizedDefaultFallback ? (
            <div className="style-option-message" role="status">
              No ready pairs in {category.name}
            </div>
          ) : null}

          {sortedStyles.map((style) => {
            const cat = getCategoryInfo(style.style_preset_id);
            const isDefault = style.style_id === channel.default_intro_outro_style_id;
            const matchesPreset = style.style_preset_id === category.id;
            const durationLabel =
              style.intro && style.outro
                ? ` · ${style.intro.duration_seconds.toFixed(0)}s / ${style.outro.duration_seconds.toFixed(0)}s`
                : "";
            return (
              <StyleOptionRow
                key={style.style_id}
                name="intro_outro_choice"
                label={style.name}
                leading={
                  style.intro?.thumbnail_filename ? (
                    <img
                      src={api.getIntroOutroThumbUrl(channel.channel_id, style.style_id, "intro")}
                      className="style-option-thumb"
                      alt={style.name}
                    />
                  ) : (
                    <span className="style-option-emoji">{cat.icon}</span>
                  )
                }
                subtitle={`${cat.name}${durationLabel}`}
                badge={isDefault ? "Default" : matchesPreset ? "Matches Style" : undefined}
                checked={selection.mode === "specific_pair" && selection.style_id === style.style_id}
                onSelect={() => onSaveIntroOutroSelection({ mode: "specific_pair", style_id: style.style_id })}
              />
            );
          })}

          <StyleOptionRow
            name="intro_outro_choice"
            label="None"
            leading={<span className="style-option-emoji">🚫</span>}
            subtitle="No intro or outro clips"
            checked={selection.mode === "none"}
            onSelect={() => onSaveIntroOutroSelection({ mode: "none" })}
          />
          {loadFailed ? <div className="style-option-message is-error">Could not load specific pairs</div> : null}
        </CustomizationPopover>
      ) : null}

      {isMotionSelectorOpen && (
        <MotionTemplateSelector
          isOpen={isMotionSelectorOpen}
          initialIntroTemplateId={selection.mode === "motion_template" ? selection.intro_template_id : undefined}
          initialOutroTemplateId={selection.mode === "motion_template" ? selection.outro_template_id : undefined}
          onClose={() => setIsMotionSelectorOpen(false)}
          onApply={(res) => {
            onSaveIntroOutroSelection({
              mode: "motion_template",
              intro_template_id: res.introTemplateId,
              outro_template_id: res.outroTemplateId,
              intro_options: res.introOptions,
              outro_options: res.outroOptions,
            });
          }}

        />
      )}
    </div>
  );
}

