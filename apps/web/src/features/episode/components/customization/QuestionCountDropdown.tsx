import { useEffect, useRef, useState } from "react";
import { QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT } from "@studio/shared";
import { useTranslation } from "../../../../i18n";
import type { EpisodePreviewCandidate } from "../../hooks/useEpisodeStylePreview";
import { CustomizationPill } from "./CustomizationPill";
import { CustomizationPopover } from "./CustomizationPopover";

const QUESTION_PRESETS = [4, 6, 8, 10, 12, 15, 20];

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
  const [inputValue, setInputValue] = useState<string>(String(questionCountDraft));
  const prevIsOpen = useRef(isOpen);

  const closeDropdown = () => {
    if (onClose) {
      onClose();
    } else {
      onToggle();
    }
  };

  useEffect(() => {
    setInputValue(String(questionCountDraft));
  }, [questionCountDraft]);

  useEffect(() => {
    if (prevIsOpen.current && !isOpen) {
      const parsed = parseInt(inputValue, 10);
      if (Number.isFinite(parsed)) {
        const count = Math.max(
          QUIZ_MIN_QUESTION_COUNT,
          Math.min(QUIZ_MAX_QUESTION_COUNT, parsed),
        );
        if (count !== questionCountDraft) {
          setQuestionCountDraft(count);
          onSaveQuestionCount(count);
        }
      }
    } else if (!prevIsOpen.current && isOpen) {
      setInputValue(String(questionCountDraft));
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, inputValue, questionCountDraft, onSaveQuestionCount, setQuestionCountDraft]);

  const handleSelectPresetCount = (count: number) => {
    setQuestionCountDraft(count);
    setInputValue(String(count));
    onSaveQuestionCount(count);
    closeDropdown();
  };

  const handleStep = (delta: number) => {
    const current = Number(questionCountDraft) || QUIZ_MIN_QUESTION_COUNT;
    const next = Math.max(QUIZ_MIN_QUESTION_COUNT, Math.min(QUIZ_MAX_QUESTION_COUNT, current + delta));
    if (next !== current) {
      setQuestionCountDraft(next);
      setInputValue(String(next));
      onSaveQuestionCount(next);
    }
  };

  const handleCustomSubmit = (shouldClose = true) => {
    const parsed = parseInt(inputValue, 10);
    const count = Number.isFinite(parsed)
      ? Math.max(
          QUIZ_MIN_QUESTION_COUNT,
          Math.min(QUIZ_MAX_QUESTION_COUNT, parsed),
        )
      : questionCountDraft;
    setInputValue(String(count));
    setQuestionCountDraft(count);
    onSaveQuestionCount(count);
    if (shouldClose) {
      closeDropdown();
    }
  };

  const isAtMin = questionCountDraft <= QUIZ_MIN_QUESTION_COUNT;
  const isAtMax = questionCountDraft >= QUIZ_MAX_QUESTION_COUNT;

  return (
    <div className="customization-dropdown-item customization-stepper-control">
      <div className="customization-stepper-wrapper">
        <button
          type="button"
          className="stepper-step-btn stepper-step-dec"
          onClick={() => handleStep(-1)}
          disabled={disabled || saving || isAtMin}
          aria-label={t("episodeCustomization.decrementQuestions")}
          title={t("episodeCustomization.decrementQuestions")}
        >
          −
        </button>
        <CustomizationPill
          label={t("episodeCustomization.pillQuestions")}
          value={t("episodeCustomization.valueQuestionCount", { count: questionCountDraft })}
          isOpen={isOpen}
          disabled={disabled}
          saving={saving}
          onToggle={onToggle}
        />
        <button
          type="button"
          className="stepper-step-btn stepper-step-inc"
          onClick={() => handleStep(1)}
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
          <div className="custom-count-input-row">
            <span>{t("episodeCustomization.customCountLabel")}</span>
            <input
              type="number"
              min={QUIZ_MIN_QUESTION_COUNT}
              max={QUIZ_MAX_QUESTION_COUNT}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={() => handleCustomSubmit(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCustomSubmit(true);
              }}
              className="custom-count-input"
            />
            <button
              type="button"
              className="primary-button compact custom-count-apply-btn"
              onClick={() => handleCustomSubmit(true)}
            >
              {t("episodeCustomization.applyCount")}
            </button>
          </div>
        </CustomizationPopover>
      ) : null}
    </div>
  );
}
