import type React from "react";
import { useRef } from "react";
import { CaretDown, CircleNotch } from "@phosphor-icons/react";
import { QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import type { EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";
import { useQuestionCountInput } from "../../hooks/useQuestionCountInput";
import { CustomizationPopover } from "./CustomizationPopover";

const QUESTION_PRESETS = [4, 6, 8, 10, 12, 15, 20];
const QUESTION_COUNT_INPUT_ID = "episode-question-count-input";

type Props = {
  disabled: boolean;
  saving: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose?: () => void;
  questionCountDraft: number;
  setQuestionCountDraft: (count: number) => void;
  onSaveQuestionCount: (count: number) => void;
  onPreview?: (candidate: EpisodePreviewCandidate | null) => void;
};

export function QuestionCountDropdown({
  disabled,
  saving,
  isOpen,
  onToggle,
  onClose,
  questionCountDraft,
  setQuestionCountDraft,
  onSaveQuestionCount,
  onPreview,
}: Props) {
  const { t } = useTranslation();
  const skipCommitOnBlur = useRef(false);
  const countInput = useQuestionCountInput({
    committedCount: questionCountDraft,
    onCommit: (count) => {
      setQuestionCountDraft(count);
      onSaveQuestionCount(count);
    },
  });

  const handleSelectPresetCount = (count: number) => {
    countInput.commitCount(count);
    if (onClose) onClose();
    else onToggle();
  };

  const handleBlur = () => {
    if (skipCommitOnBlur.current) {
      skipCommitOnBlur.current = false;
      return;
    }
    countInput.commitInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      skipCommitOnBlur.current = true;
      countInput.revertInput();
      e.currentTarget.blur();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      countInput.step(e.key === "ArrowUp" ? 1 : -1);
    }
  };

  const isAtMin = questionCountDraft <= QUIZ_MIN_QUESTION_COUNT;
  const isAtMax = questionCountDraft >= QUIZ_MAX_QUESTION_COUNT;

  return (
    <div className="customization-dropdown-item customization-stepper-control">
      <div className={`customization-stepper-wrapper ${isOpen ? "is-active" : ""} ${saving ? "is-saving" : ""}`}>
        <button
          type="button"
          className="stepper-step-btn stepper-step-dec"
          onClick={() => countInput.step(-1)}
          disabled={disabled || saving || isAtMin}
          aria-label={t("episodeCustomization.decrementQuestions")}
          title={t("episodeCustomization.decrementQuestions")}
        >
          −
        </button>
        <label className="stepper-count-field" htmlFor={QUESTION_COUNT_INPUT_ID}>
          <span className="pill-label">{t("episodeCustomization.pillQuestions")}</span>
          <input
            id={QUESTION_COUNT_INPUT_ID}
            type="text"
            inputMode="numeric"
            className="stepper-count-input"
            value={countInput.inputValue}
            onChange={(e) => countInput.changeInput(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoComplete="off"
            aria-label={t("episodeCustomization.pillQuestions")}
            title={t("episodeCustomization.questionCountInputHint", {
              min: QUIZ_MIN_QUESTION_COUNT,
              max: QUIZ_MAX_QUESTION_COUNT,
            })}
          />
        </label>
        <button
          type="button"
          className="stepper-presets-btn"
          onClick={onToggle}
          disabled={disabled || saving}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={t("episodeCustomization.showQuestionPresets")}
          title={t("episodeCustomization.showQuestionPresets")}
        >
          {saving ? <CircleNotch className="pill-spinner spin" size={13} /> : <CaretDown size={12} className="pill-caret" />}
        </button>
        <button
          type="button"
          className="stepper-step-btn stepper-step-inc"
          onClick={() => countInput.step(1)}
          disabled={disabled || saving || isAtMax}
          aria-label={t("episodeCustomization.incrementQuestions")}
          title={t("episodeCustomization.incrementQuestions")}
        >
          +
        </button>
      </div>

      {isOpen ? (
        <CustomizationPopover title={t("episodeCustomization.pillQuestions")}>
          <div className="preset-count-grid">
            {QUESTION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`preset-count-btn ${questionCountDraft === preset ? "is-active" : ""}`}
                onMouseEnter={() => onPreview?.({ override: { totalQuestions: preset }, label: String(preset) })}
                onClick={() => handleSelectPresetCount(preset)}
              >
                <span>{preset}</span>
              </button>
            ))}
          </div>
        </CustomizationPopover>
      ) : null}
    </div>
  );
}
