import { useState } from "react";
import { CircleNotch, Lightning } from "@phosphor-icons/react";
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

function formatDomain(domainId: string): string {
  return domainId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  const isShortReel = topic.content_kind === "short_reel";
  const [questionCount, setQuestionCount] = useState(topic.question_count);
  const [selectedStyle, setSelectedStyle] = useState<QuizImageStyle | "mixed">(
    !isShortReel && topic.visual_style ? topic.visual_style : "mixed",
  );
  const isQuestionCountValid = isShortReel
    ? true
    : Number.isInteger(questionCount) && questionCount >= QUIZ_MIN_QUESTION_COUNT && questionCount <= QUIZ_MAX_QUESTION_COUNT;
  const estimatedDurationMinutes = Math.max(3, Math.round((questionCount * QUIZ_SECONDS_PER_QUESTION) / 60));
  const inputId = `topic-question-count-${topic.topic_id}`;
  const styleSelectId = `topic-style-select-${topic.topic_id}`;
  const availableStyles = channelStyles && channelStyles.length > 0 ? channelStyles : ALL_QUIZ_IMAGE_STYLES;

  return (
    <article className={`topic-card ${isShortReel ? "topic-card-short-reel" : ""}`}>
      <div className="topic-card-top-bar">
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="topic-number">{isShortReel ? "Short-Reel" : "Episode"} candidate</div>
          <span
            className="badge"
            style={{
              fontSize: "11px",
              padding: "1px 6px",
              borderRadius: "4px",
              backgroundColor: isShortReel ? "#8b5cf6" : "#0284c7",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {isShortReel ? "9:16 Vertical" : "16:9 Landscape"}
          </span>
          <span
            className="badge"
            style={{
              fontSize: "11px",
              padding: "1px 6px",
              borderRadius: "4px",
              backgroundColor: topic.origin === "keyword" ? "#f59e0b" : "#475569",
              color: "#fff",
            }}
          >
            {topic.origin === "keyword" ? "Keyword-directed" : "Discovery"}
          </span>
          {topic.domain_id ? (
            <span className="topic-domain-badge" title={`Domain: ${formatDomain(topic.domain_id)}`}>
              🏛️ {formatDomain(topic.domain_id)}
            </span>
          ) : null}
          {topic.theme_hint ? (
            <span className="topic-theme-badge" title={`Suggested by topic: ${topic.theme_hint}`}>
              🎯 {topic.theme_hint}
            </span>
          ) : null}
        </div>
        {!isShortReel ? (
          <TopicLayoutPreviewButton quizFormat={topic.quiz_format} archetype={topic.archetype} layoutId={topic.suggested_layout} />
        ) : (
          <span
            style={{
              fontSize: "12px",
              color: "#aaa",
              border: "1px solid #444",
              borderRadius: "4px",
              padding: "2px 8px",
            }}
          >
            {topic.archetype === "versus_faceoff" ? "Versus Face-off" : "Deep Trivia"}
          </span>
        )}
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
      {!isShortReel ? (
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
      ) : (
        <div className="topic-pickers-row" style={{ alignItems: "center" }}>
          <div style={{ fontSize: "13px", color: "#aaa" }}>
            <span>Question Bank: </span>
            <strong style={{ color: "#fff" }}>1 Question ({topic.archetype})</strong>
          </div>
        </div>
      )}
      <div className="topic-footer">
        <span>{topic.estimated_potential}</span>
        <button
          className="primary-button topic-build-btn"
          disabled={disabled || !isQuestionCountValid}
          onClick={() => onConfirm(isShortReel ? 1 : questionCount, selectedStyle)}
        >
          {busy ? <CircleNotch className="spin" size={15} /> : <Lightning size={14} weight="fill" />}
          {busy ? (isShortReel ? "Creating Short-Reel…" : "Building Video…") : isShortReel ? "Create Short-Reel" : "Build Video (1-Click)"}
        </button>
      </div>
    </article>
  );
}
