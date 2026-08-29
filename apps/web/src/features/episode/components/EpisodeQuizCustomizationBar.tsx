import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "@phosphor-icons/react";
import type {
  Channel,
  Episode,
  QuizAnswerCardStyle,
  QuizImageStyle,
  QuizPaletteId,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
  Task,
  VisualPresetItem,
} from "@studio/shared";
import { PresetPickerDropdown } from "./customization/PresetPickerDropdown";
import { QuestionCountDropdown } from "./customization/QuestionCountDropdown";
import { ArtStyleDropdown } from "./customization/ArtStyleDropdown";
import { QuestionBoxDropdown } from "./customization/QuestionBoxDropdown";
import { AnswerCardDropdown } from "./customization/AnswerCardDropdown";
import { CounterBadgeDropdown } from "./customization/CounterBadgeDropdown";
import { ThinkingBarDropdown } from "./customization/ThinkingBarDropdown";
import { PaletteDropdown } from "./customization/PaletteDropdown";

export type EpisodeCustomizationDropdownName =
  | "preset"
  | "questions"
  | "visualStyle"
  | "thinkingBar"
  | "questionBox"
  | "answerCard"
  | "counterBadge"
  | "palette"
  | null;

type Props = {
  channel: Channel;
  episode: Episode;
  activeEpisodeTask: Task | null;
  busy: string | null;
  questionCountDraft: number;
  setQuestionCountDraft: (count: number) => void;
  onSaveQuestionCount: () => void;
  onSaveVisualStyle: (style: QuizImageStyle | "mixed") => void;
  onSaveThinkingBarStyle: (style: QuizThinkingBarStyle) => void;
  onSaveQuestionBoxStyle: (style: QuizQuestionBoxStyle) => void;
  onSaveAnswerCardStyle: (style: QuizAnswerCardStyle) => void;
  onSaveCounterStyle: (style: QuizQuestionCounterStyle) => void;
  onSavePaletteId: (palette: QuizPaletteId) => void;
  onApplyStylePreset: (preset: VisualPresetItem) => void;
};

export function EpisodeQuizCustomizationBar({
  channel,
  episode,
  activeEpisodeTask,
  busy,
  questionCountDraft,
  setQuestionCountDraft,
  onSaveQuestionCount,
  onSaveVisualStyle,
  onSaveThinkingBarStyle,
  onSaveQuestionBoxStyle,
  onSaveAnswerCardStyle,
  onSaveCounterStyle,
  onSavePaletteId,
  onApplyStylePreset,
}: Props) {
  const [openDropdown, setOpenDropdown] = useState<EpisodeCustomizationDropdownName>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isControlsDisabled = Boolean(activeEpisodeTask) || busy !== null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const toggleDropdown = (name: EpisodeCustomizationDropdownName) => {
    if (isControlsDisabled) return;
    setOpenDropdown((prev) => (prev === name ? null : name));
  };

  return (
    <section className="episode-customization-bar" ref={containerRef}>
      <div className="customization-bar-header">
        <div className="customization-bar-title">
          <SlidersHorizontal size={16} weight="bold" />
          <span>Production Customization</span>
        </div>
        <small className="customization-bar-hint">1-Click Style Presets or customize cards, timer, badges & colors</small>
      </div>

      <div className="customization-button-group" style={{ flexWrap: "wrap", gap: "8px" }}>
        {/* 1. Style Preset (1-Click) */}
        <PresetPickerDropdown
          episode={episode}
          disabled={isControlsDisabled}
          isOpen={openDropdown === "preset"}
          onToggle={() => toggleDropdown("preset")}
          onSelectPreset={(preset) => {
            onApplyStylePreset(preset);
            setOpenDropdown(null);
          }}
        />

        {/* 2. Question Count */}
        <QuestionCountDropdown
          disabled={isControlsDisabled}
          isOpen={openDropdown === "questions"}
          onToggle={() => toggleDropdown("questions")}
          questionCountDraft={questionCountDraft}
          setQuestionCountDraft={setQuestionCountDraft}
          onSaveQuestionCount={onSaveQuestionCount}
        />

        {/* 3. Art Style */}
        <ArtStyleDropdown
          channel={channel}
          episode={episode}
          disabled={isControlsDisabled}
          isOpen={openDropdown === "visualStyle"}
          onToggle={() => toggleDropdown("visualStyle")}
          onSelectStyle={(style) => {
            onSaveVisualStyle(style);
            setOpenDropdown(null);
          }}
        />

        {/* 4. Question Card / Box */}
        <QuestionBoxDropdown
          channel={channel}
          episode={episode}
          disabled={isControlsDisabled}
          isOpen={openDropdown === "questionBox"}
          onToggle={() => toggleDropdown("questionBox")}
          onSelectStyle={(style) => {
            onSaveQuestionBoxStyle(style);
            setOpenDropdown(null);
          }}
        />

        {/* 5. Answer Cards */}
        <AnswerCardDropdown
          channel={channel}
          episode={episode}
          disabled={isControlsDisabled}
          isOpen={openDropdown === "answerCard"}
          onToggle={() => toggleDropdown("answerCard")}
          onSelectStyle={(style) => {
            onSaveAnswerCardStyle(style);
            setOpenDropdown(null);
          }}
        />

        {/* 6. Counter Badge */}
        <CounterBadgeDropdown
          channel={channel}
          episode={episode}
          disabled={isControlsDisabled}
          isOpen={openDropdown === "counterBadge"}
          onToggle={() => toggleDropdown("counterBadge")}
          onSelectStyle={(style) => {
            onSaveCounterStyle(style);
            setOpenDropdown(null);
          }}
        />

        {/* 7. Thinking Bar */}
        <ThinkingBarDropdown
          channel={channel}
          episode={episode}
          disabled={isControlsDisabled}
          isOpen={openDropdown === "thinkingBar"}
          onToggle={() => toggleDropdown("thinkingBar")}
          onSelectStyle={(style) => {
            onSaveThinkingBarStyle(style);
            setOpenDropdown(null);
          }}
        />

        {/* 8. Color Palette */}
        <PaletteDropdown
          channel={channel}
          episode={episode}
          disabled={isControlsDisabled}
          isOpen={openDropdown === "palette"}
          onToggle={() => toggleDropdown("palette")}
          onSelectPalette={(palette) => {
            onSavePaletteId(palette);
            setOpenDropdown(null);
          }}
        />
      </div>
    </section>
  );
}
