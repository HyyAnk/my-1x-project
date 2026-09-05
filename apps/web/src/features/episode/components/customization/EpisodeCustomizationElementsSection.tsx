import type {
  Channel,
  Episode,
  QuizAnswerCardStyle,
  QuizBackgroundStyle,
  QuizQuestionBoxStyle,
  QuizQuestionCounterStyle,
  QuizThinkingBarStyle,
} from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import type { EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";
import { QuestionBoxDropdown } from "./QuestionBoxDropdown";
import { AnswerCardDropdown } from "./AnswerCardDropdown";
import { CounterBadgeDropdown } from "./CounterBadgeDropdown";
import { ThinkingBarDropdown } from "./ThinkingBarDropdown";
import { BackgroundDropdown } from "./BackgroundDropdown";
import type { EpisodeCustomizationDropdownName } from "./useEpisodeCustomizationDropdown";

export interface EpisodeCustomizationElementsSectionProps {
  channel: Channel;
  episode: Episode;
  isPipelineRunning: boolean;
  isSaving: (key: string) => boolean;
  openDropdown: EpisodeCustomizationDropdownName;
  toggleDropdown: (name: Exclude<EpisodeCustomizationDropdownName, null>) => void;
  closeDropdown: () => void;
  onSaveQuestionBoxStyle: (style: QuizQuestionBoxStyle) => void;
  onSaveAnswerCardStyle: (style: QuizAnswerCardStyle) => void;
  onSaveCounterStyle: (style: QuizQuestionCounterStyle) => void;
  onSaveThinkingBarStyle: (style: QuizThinkingBarStyle) => void;
  onSaveBackgroundStyle: (style: QuizBackgroundStyle) => void;
  onPreview: (candidate: EpisodePreviewCandidate | null) => void;
}

export function EpisodeCustomizationElementsSection({
  channel,
  episode,
  isPipelineRunning,
  isSaving,
  openDropdown,
  toggleDropdown,
  closeDropdown,
  onSaveQuestionBoxStyle,
  onSaveAnswerCardStyle,
  onSaveCounterStyle,
  onSaveThinkingBarStyle,
  onSaveBackgroundStyle,
  onPreview,
}: EpisodeCustomizationElementsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="customization-section">
      <div className="customization-section-header">
        <span className="customization-section-title">{t("episodeCustomization.groupElements")}</span>
      </div>
      <div className="customization-controls-row customization-elements-grid">
        <QuestionBoxDropdown
          channel={channel}
          episode={episode}
          disabled={isPipelineRunning}
          saving={isSaving("question-box-style")}
          isOpen={openDropdown === "questionBox"}
          onToggle={() => toggleDropdown("questionBox")}
          onSelectStyle={(style) => {
            onSaveQuestionBoxStyle(style);
            closeDropdown();
          }}
          onPreview={onPreview}
        />
        <AnswerCardDropdown
          channel={channel}
          episode={episode}
          disabled={isPipelineRunning}
          saving={isSaving("answer-card-style")}
          isOpen={openDropdown === "answerCard"}
          onToggle={() => toggleDropdown("answerCard")}
          onSelectStyle={(style) => {
            onSaveAnswerCardStyle(style);
            closeDropdown();
          }}
          onPreview={onPreview}
        />
        <CounterBadgeDropdown
          channel={channel}
          episode={episode}
          disabled={isPipelineRunning}
          saving={isSaving("counter-style")}
          isOpen={openDropdown === "counterBadge"}
          onToggle={() => toggleDropdown("counterBadge")}
          onSelectStyle={(style) => {
            onSaveCounterStyle(style);
            closeDropdown();
          }}
          onPreview={onPreview}
        />
        <ThinkingBarDropdown
          channel={channel}
          episode={episode}
          disabled={isPipelineRunning}
          saving={isSaving("thinking-bar-style")}
          isOpen={openDropdown === "thinkingBar"}
          onToggle={() => toggleDropdown("thinkingBar")}
          onSelectStyle={(style) => {
            onSaveThinkingBarStyle(style);
            closeDropdown();
          }}
          onPreview={onPreview}
        />
        <BackgroundDropdown
          channel={channel}
          episode={episode}
          disabled={isPipelineRunning}
          saving={isSaving("background-style")}
          isOpen={openDropdown === "background"}
          onToggle={() => toggleDropdown("background")}
          onSelectStyle={(style) => {
            onSaveBackgroundStyle(style);
            closeDropdown();
          }}
          onPreview={onPreview}
        />
      </div>
    </div>
  );
}
