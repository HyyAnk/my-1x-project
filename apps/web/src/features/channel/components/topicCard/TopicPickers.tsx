import {
  QUIZ_IMAGE_STYLE_LABELS,
  QUIZ_MIN_QUESTION_COUNT,
  QUIZ_SHORT_MIN_QUESTION_COUNT,
  type QuizImageStyle,
  type TopicCandidate,
} from "@studio/shared";
import { formatDurationHint, formatQuizShortDurationHint } from "./topicCardHelpers";
import { getTopicArchetypeLabel } from "./topicKindPresentation";

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

type QuestionCountPickerProps = Pick<
  TopicPickersProps,
  "topic" | "questionCount" | "setQuestionCount" | "maxAllowedQuestions" | "isQuestionCountValid" | "disabled" | "canConfirm"
> & { minQuestionCount: number; hint: string };

function QuestionCountPicker({
  topic,
  questionCount,
  setQuestionCount,
  maxAllowedQuestions,
  minQuestionCount,
  isQuestionCountValid,
  disabled,
  canConfirm,
  hint,
}: QuestionCountPickerProps) {
  const inputId = `topic-question-count-${topic.topic_id}`;
  return (
    <div className="topic-question-picker">
      <label htmlFor={inputId}>Questions</label>
      <input
        id={inputId}
        type="number"
        min={minQuestionCount}
        max={maxAllowedQuestions}
        step={1}
        inputMode="numeric"
        value={questionCount}
        aria-label={`Question count for ${topic.title}`}
        aria-invalid={!isQuestionCountValid}
        disabled={disabled || !canConfirm}
        onChange={(event) => setQuestionCount(Number(event.target.value))}
      />
      <span aria-live="polite">{hint}</span>
    </div>
  );
}

export function TopicPickers(props: TopicPickersProps) {
  const { topic, questionCount, maxAllowedQuestions, isQuestionCountValid, disabled, canConfirm, selectedStyle, setSelectedStyle } = props;

  if (topic.content_kind === "short_reel") {
    return (
      <div className="topic-pickers-row topic-pickers-short-reel">
        <div className="topic-short-reel-info">
          <span>Question Bank</span>
          <strong>1 Question ({getTopicArchetypeLabel(topic.archetype)})</strong>
        </div>
      </div>
    );
  }

  if (topic.content_kind === "quiz_short") {
    return (
      <div className="topic-pickers-row topic-pickers-quiz-short">
        <QuestionCountPicker
          {...props}
          minQuestionCount={QUIZ_SHORT_MIN_QUESTION_COUNT}
          hint={formatQuizShortDurationHint(questionCount, isQuestionCountValid, maxAllowedQuestions)}
        />
        <div className="topic-short-reel-info">
          <span>Portrait 9:16</span>
          <strong>{getTopicArchetypeLabel(topic.archetype)}</strong>
        </div>
      </div>
    );
  }

  const styleSelectId = `topic-style-select-${topic.topic_id}`;

  return (
    <div className="topic-pickers-row">
      <QuestionCountPicker
        {...props}
        minQuestionCount={QUIZ_MIN_QUESTION_COUNT}
        hint={formatDurationHint(questionCount, isQuestionCountValid, maxAllowedQuestions)}
      />
      <div className="topic-style-picker">
        <label htmlFor={styleSelectId}>Visual Style</label>
        <select
          id={styleSelectId}
          value={selectedStyle}
          disabled={disabled || !canConfirm}
          onChange={(event) => setSelectedStyle(event.target.value as QuizImageStyle | "mixed")}
        >
          <option value="mixed">🎲 Mixed (Random)</option>
          {props.availableStyles.map((style) => (
            <option key={style} value={style}>
              {QUIZ_IMAGE_STYLE_LABELS[style]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
