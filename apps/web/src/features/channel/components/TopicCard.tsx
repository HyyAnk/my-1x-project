import { useState } from "react";
import { CircleNotch, Play } from "@phosphor-icons/react";
import {
  ALL_QUIZ_IMAGE_STYLES,
  QUIZ_IMAGE_STYLE_LABELS,
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_QUESTION_COUNT,
  QUIZ_SECONDS_PER_QUESTION,
  type QuizImageStyle,
  type TopicCandidate,
} from "@studio/shared";
import { TopicLayoutPreviewButton } from "./TopicLayoutPreviewButton";

export function TopicCard({
  topic,
  channelStyles = ALL_QUIZ_IMAGE_STYLES,
  onConfirm,
  busy,
  disabled,
}: {
  topic: TopicCandidate;
  channelStyles?: QuizImageStyle[];
  onConfirm: (questionCount: number, visualStyle: QuizImageStyle | "mixed") => void;
  busy: boolean;
  disabled: boolean;
}) {
  const [questionCount, setQuestionCount] = useState(topic.question_count);
  const [selectedStyle, setSelectedStyle] = useState<QuizImageStyle | "mixed">(topic.visual_style ?? "mixed");
  const isQuestionCountValid =
    Number.isInteger(questionCount) && questionCount >= QUIZ_MIN_QUESTION_COUNT && questionCount <= QUIZ_MAX_QUESTION_COUNT;
  const estimatedDurationMinutes = Math.max(3, Math.round((questionCount * QUIZ_SECONDS_PER_QUESTION) / 60));
  const inputId = `topic-question-count-${topic.topic_id}`;
  const styleSelectId = `topic-style-select-${topic.topic_id}`;
  const availableStyles = channelStyles && channelStyles.length > 0 ? channelStyles : ALL_QUIZ_IMAGE_STYLES;

  return (
    <article className="topic-card">
      <div className="topic-card-top-bar">
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="topic-number">Topic candidate</div>
          {topic.theme_hint ? (
            <span className="topic-theme-badge" title={`Suggested by topic: ${topic.theme_hint}`}>
              🎯 {topic.theme_hint}
            </span>
          ) : null}
        </div>
        <TopicLayoutPreviewButton
          quizFormat={topic.quiz_format}
          archetype={topic.archetype}
          layoutId={topic.suggested_layout}
        />
      </div>
      <h3>{topic.title}</h3>
      <p className="topic-premise">{topic.premise}</p>
      <div className="topic-detail">
        <span>Why it fits</span>
        <p>{topic.why_it_fits}</p>
      </div>
      <div className="topic-detail">
        <span>Hook</span>
        <p>{topic.hook}</p>
      </div>
      <div className="topic-pickers-row">
        <div className="topic-question-picker">
          <label htmlFor={inputId}>Questions</label>
          <input
            id={inputId}
            type="number"
            min={QUIZ_MIN_QUESTION_COUNT}
            max={QUIZ_MAX_QUESTION_COUNT}
            step={1}
            inputMode="numeric"
            value={questionCount}
            aria-label={`Question count for ${topic.title}`}
            aria-invalid={!isQuestionCountValid}
            disabled={disabled}
            onChange={(event) => setQuestionCount(Number(event.target.value))}
          />
          <span aria-live="polite">
            {isQuestionCountValid
              ? `About ${estimatedDurationMinutes} min`
              : `Choose ${QUIZ_MIN_QUESTION_COUNT}-${QUIZ_MAX_QUESTION_COUNT}`}
          </span>
        </div>
        <div className="topic-style-picker">
          <label htmlFor={styleSelectId}>Visual Style</label>
          <select
            id={styleSelectId}
            value={selectedStyle}
            disabled={disabled}
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
      <div className="topic-footer">
        <span>{topic.estimated_potential}</span>
        <button
          className="text-button"
          disabled={disabled || !isQuestionCountValid}
          onClick={() => onConfirm(questionCount, selectedStyle)}
        >
          {busy ? <CircleNotch className="spin" size={15} /> : <Play size={14} />}
          {busy ? "Creating…" : "Use this topic"}
        </button>
      </div>
    </article>
  );
}
