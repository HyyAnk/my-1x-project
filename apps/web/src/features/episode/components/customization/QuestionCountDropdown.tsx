import { CaretDown, Check, Hash } from "@phosphor-icons/react";
import { QUIZ_MAX_QUESTION_COUNT, QUIZ_MIN_QUESTION_COUNT } from "@studio/shared";

const QUESTION_PRESETS = [4, 6, 8, 10, 12, 15, 20];

type Props = {
  disabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  questionCountDraft: number;
  setQuestionCountDraft: (count: number) => void;
  onSaveQuestionCount: () => void;
};

export function QuestionCountDropdown({
  disabled,
  isOpen,
  onToggle,
  questionCountDraft,
  setQuestionCountDraft,
  onSaveQuestionCount,
}: Props) {
  const handleSelectPresetCount = (count: number) => {
    setQuestionCountDraft(count);
    setTimeout(() => {
      onSaveQuestionCount();
      onToggle();
    }, 50);
  };

  return (
    <div className="customization-dropdown-item">
      <button
        type="button"
        className={`customization-pill-btn ${isOpen ? "is-active" : ""}`}
        disabled={disabled}
        onClick={onToggle}
        title="Configure number of questions in this episode"
      >
        <div className="pill-btn-icon-wrap icon-hash">
          <Hash size={14} weight="bold" />
        </div>
        <div className="pill-btn-text">
          <span className="pill-label">Questions</span>
          <strong className="pill-value">{questionCountDraft} Questions</strong>
        </div>
        <CaretDown size={12} className="pill-caret" />
      </button>

      {isOpen ? (
        <div className="visual-styles-popover customization-popover-sm">
          <div className="popover-header">
            <strong>🔢 Question Count</strong>
            <small>Select a quick preset or type custom number</small>
          </div>
          <div className="preset-count-grid">
            {QUESTION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`preset-count-btn ${questionCountDraft === preset ? "is-active" : ""}`}
                onClick={() => handleSelectPresetCount(preset)}
              >
                <span>{preset}</span>
                {questionCountDraft === preset ? <Check size={12} weight="bold" /> : null}
              </button>
            ))}
          </div>
          <div className="custom-count-input-row">
            <span>Custom:</span>
            <input
              type="number"
              min={QUIZ_MIN_QUESTION_COUNT}
              max={QUIZ_MAX_QUESTION_COUNT}
              value={questionCountDraft}
              onChange={(e) => setQuestionCountDraft(Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSaveQuestionCount();
                  onToggle();
                }
              }}
              className="custom-count-input"
            />
            <button
              type="button"
              className="primary-button compact"
              onClick={() => {
                onSaveQuestionCount();
                onToggle();
              }}
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
