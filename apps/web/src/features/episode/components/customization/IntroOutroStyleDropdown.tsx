import { useState } from "react";
import {
  BUILT_IN_PRESETS,
  resolveBuiltInPresetCategoryId,
  type Channel,
  type Episode,
  type IntroOutroSelection,
} from "@studio/shared";
import { useIntroOutroStyleCatalog } from "../../hooks/useIntroOutroStyleCatalog";
import {
  buildBuiltInStyleSubtitle,
  buildIntroOutroDisplayValue,
  buildMotionTemplateSummary,
  sortActiveIntroOutroStyles,
} from "../../utils/introOutroStyleHelpers";
import { CustomizationPill } from "./CustomizationPill";
import { CustomizationPopover } from "./CustomizationPopover";
import { StyleOptionRow } from "./StyleOptionRow";
import { IntroOutroPairOptionRow } from "./IntroOutroPairOptionRow";
import { IntroOutroStatusMessages } from "./IntroOutroStatusMessages";
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
  const { styles, categories, loadFailed } = useIntroOutroStyleCatalog(channel.channel_id, isOpen);
  const [isMotionSelectorOpen, setIsMotionSelectorOpen] = useState(false);
  const selection = resolveSelection(episode);
  const categoryId = resolveBuiltInPresetCategoryId(episode.quiz_config);
  const category = BUILT_IN_PRESETS.find((preset) => preset.id === categoryId) ?? BUILT_IN_PRESETS[0];
  const readyInCategory = categories.find((item) => item.style_preset_id === category.id)?.ready_count ?? 0;
  const selectedStyle = selection.mode === "specific_pair" ? styles.find((style) => style.style_id === selection.style_id) : undefined;
  const snapshot = episode.quiz_config?.intro_outro_snapshot;
  const pinnedPair = snapshot?.pair_id ? styles.find((style) => style.style_id === snapshot.pair_id) : undefined;

  const motionSelection = selection.mode === "motion_template" ? selection : null;
  const motionSummary = buildMotionTemplateSummary(selection);
  const displayValue = buildIntroOutroDisplayValue(selection, motionSummary, selectedStyle?.name, category.name);

  const defaultStyle = styles.find((s) => s.style_id === channel.default_intro_outro_style_id);
  const hasUncategorizedDefaultFallback = Boolean(
    readyInCategory === 0 && defaultStyle && !defaultStyle.style_preset_id && defaultStyle.status === "active",
  );

  const sortedStyles = sortActiveIntroOutroStyles(styles, category.id, channel.default_intro_outro_style_id);

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
            subtitle={buildBuiltInStyleSubtitle(
              readyInCategory,
              category.name,
              hasUncategorizedDefaultFallback ? defaultStyle?.name : undefined,
            )}
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
          <IntroOutroStatusMessages
            isBuiltInSelected={selection.mode === "style_builtin"}
            snapshot={snapshot}
            pinnedPairName={pinnedPair?.name}
            showNoReadyPairs={!snapshot && categories.length > 0 && readyInCategory === 0 && !hasUncategorizedDefaultFallback}
            categoryName={category.name}
          />

          {sortedStyles.map((style) => (
            <IntroOutroPairOptionRow
              key={style.style_id}
              channelId={channel.channel_id}
              style={style}
              isDefault={style.style_id === channel.default_intro_outro_style_id}
              matchesPreset={style.style_preset_id === category.id}
              checked={selection.mode === "specific_pair" && selection.style_id === style.style_id}
              onSelect={() => onSaveIntroOutroSelection({ mode: "specific_pair", style_id: style.style_id })}
            />
          ))}

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
          initialIntroTemplateId={motionSelection?.intro_template_id}
          initialOutroTemplateId={motionSelection?.outro_template_id}
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

