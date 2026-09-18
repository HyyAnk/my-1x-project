import { QUIZ_IMAGE_STYLE_LABELS, QUIZ_MIN_QUESTION_COUNT, type QuizImageStyle, type TopicCandidate } from "@studio/shared";
import { formatDurationHint } from "./topicCardHelpers";

export interface TopicPickersProps {
  topic: TopicCandidate;
  questionCount: number;
  setQuestionCount: (count: number) => void;
  maxAllowedQuestions: number;
  isQuestionCountValid: boolean;
  disabled: boolean;
  canConfirm: boolean;
  selectedStyle: QuizImageStyle | "mixed";
  setSelectedStyle: (style: QuizImageStyle | "mixed") => void;
  availableStyles: readonly QuizImageStyle[];
}

export function TopicPickers({
  topic,
  questionCount,
  setQuestionCount,
  maxAllowedQuestions,
  isQuestionCountValid,
  disabled,
  canConfirm,
  selectedStyle,
  setSelectedStyle,
  availableStyles,
}: TopicPickersProps) {
  if (topic.content_kind === "short_reel") {
    return (
      <div className="topic-pickers-row topic-pickers-short-reel">
        <div className="topic-short-reel-info">
          <span>Question Bank</span>
          <strong>1 Question ({topic.archetype})</strong>
        </div>
      </div>
    );
  }

  const inputId = `topic-question-count-${topic.topic_id}`;
  const styleSelectId = `topic-style-select-${topic.topic_id}`;

  return (
    <div className="topic-pickers-row">
      <div className="topic-question-picker">
        <label htmlFor={inputId}>Questions</label>
        <input
          id={inputId}
          type="number"
          min={QUIZ_MIN_QUESTION_COUNT}
          max={maxAllowedQuestions}
          step={1}
          inputMode="numeric"
          value={questionCount}
          aria-label={`Question count for ${topic.title}`}
          aria-invalid={!isQuestionCountValid}
          disabled={disabled || !canConfirm}
          onChange={(event) => setQuestionCount(Number(event.target.value))}
        />
        <span aria-live="polite">{formatDurationHint(questionCount, isQuestionCountValid, maxAllowedQuestions)}</span>
      </div>
      <div className="topic-style-picker">
        <label htmlFor={styleSelectId}>Visual Style</label>
        <select
          id={styleSelectId}
          value={selectedStyle}
          disabled={disabled || !canConfirm}
          onChange={(event) => setSelectedStyle(event.target.value as QuizImageStyle | "mixed")}
        >
          <option value="mixed">🎲 Mixed (Random)</option>
          {availableStyles.map((style) => (
            <option key={style} value={style}>
              {QUIZ_IMAGE_STYLE_LABELS[style]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
