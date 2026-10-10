import { BUILT_IN_PRESETS, type Channel, type QuizPaletteId, type QuizShort } from "@studio/shared";
import type { useQuizShortSettings } from "../hooks/useQuizShortSettings";
import { useChannelMascotStyles } from "../hooks/useChannelMascotStyles";
import {
  QUIZ_SHORT_QUESTION_COUNT_OPTIONS,
  buildLayoutPairOptions,
  buildMascotStyleOptions,
  buildPaletteOptions,
  buildPresetOptions,
  decodeLayoutPair,
  decodeMascotSelection,
  encodeLayoutPair,
  encodeMascotSelection,
  resolveCurrentPresetId,
} from "../utils/quizShortSettingsOptions";
import { QuizShortSettingSelect, QuizShortSettingToggle } from "./QuizShortSettingSelect";

export type QuizShortCustomizationBarProps = {
  channel: Channel;
  quizShort: QuizShort;
  settings: ReturnType<typeof useQuizShortSettings>;
  disabled: boolean;
};

const PRESET_OPTIONS = buildPresetOptions();
const PALETTE_OPTIONS = buildPaletteOptions();
const LAYOUT_PAIR_OPTIONS = buildLayoutPairOptions();
const QUESTION_COUNT_OPTIONS = QUIZ_SHORT_QUESTION_COUNT_OPTIONS.map((count) => ({ value: String(count), label: `${count} questions` }));

/** Quiz Short settings limited to what the portrait product supports: no bookends, no aspect ratio. */
export function QuizShortCustomizationBar({ channel, quizShort, settings, disabled }: QuizShortCustomizationBarProps) {
  const mascotStyles = useChannelMascotStyles(channel);
  const config = quizShort.quiz_config;
  const presetValue = resolveCurrentPresetId(quizShort);
  const hasMascot = Boolean(channel.mascot_id && channel.mascot_id !== "none");

  return (
    <section className="episode-customization-bar quiz-short-customization" data-testid="quiz-short-customization-bar">
      <div className="customization-bar-header">
        <h2>Customize Quiz Short</h2>
      </div>
      <div className="quiz-short-settings-grid">
        <QuizShortSettingSelect
          id="quiz-short-preset"
          label="Preset"
          value={presetValue}
          options={presetValue ? PRESET_OPTIONS : [{ value: "", label: "Custom" }, ...PRESET_OPTIONS]}
          disabled={disabled}
          saving={settings.busy === "preset"}
          onChange={(value) => {
            const preset = BUILT_IN_PRESETS.find((item) => item.id === value);
            if (preset) void settings.applyPreset(preset);
          }}
        />
        <QuizShortSettingSelect
          id="quiz-short-palette"
          label="Palette"
          value={config.palette_id ?? "auto"}
          options={PALETTE_OPTIONS}
          disabled={disabled}
          saving={settings.busy === "palette"}
          onChange={(value) => void settings.savePalette(value as QuizPaletteId)}
        />
        <QuizShortSettingSelect
          id="quiz-short-mascot-style"
          label="Mascot style"
          value={encodeMascotSelection(config.mascot_style_selection)}
          options={buildMascotStyleOptions(mascotStyles)}
          disabled={disabled || !hasMascot}
          saving={settings.busy === "mascot-style"}
          onChange={(value) => void settings.saveMascotStyle(decodeMascotSelection(value))}
        />
        <QuizShortSettingSelect
          id="quiz-short-question-count"
          label="Questions"
          value={String(config.question_count)}
          options={QUESTION_COUNT_OPTIONS}
          disabled={disabled}
          saving={settings.busy === "question-count"}
          onChange={(value) => void settings.saveQuestionCount(Number(value))}
        />
        <QuizShortSettingSelect
          id="quiz-short-layout-pair"
          label="Layout pair"
          value={encodeLayoutPair(config.layout_pair)}
          options={LAYOUT_PAIR_OPTIONS}
          disabled={disabled}
          saving={settings.busy === "layout-pair"}
          onChange={(value) => void settings.saveLayoutPair(decodeLayoutPair(value))}
        />
        <QuizShortSettingToggle
          id="quiz-short-outro-cta"
          label="Score CTA outro"
          checked={config.outro_cta_enabled}
          disabled={disabled}
          saving={settings.busy === "outro-cta"}
          onChange={(checked) => void settings.saveOutroCta(checked)}
        />
        <QuizShortSettingToggle
          id="quiz-short-fast-render"
          label="Fast render"
          checked={config.fast_render_mode ?? true}
          disabled={disabled}
          saving={settings.busy === "fast-render"}
          onChange={(checked) => void settings.saveFastRender(checked)}
        />
      </div>
    </section>
  );
}
