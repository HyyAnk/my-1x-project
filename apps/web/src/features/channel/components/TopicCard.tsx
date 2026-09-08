import { useState } from "react";
import { CircleNotch, Lightning } from "@phosphor-icons/react";
import {
  ALL_QUIZ_IMAGE_STYLES,
  QUIZ_IMAGE_STYLE_LABELS,
  QUIZ_MAX_QUESTION_COUNT,
  QUIZ_MIN_QUESTION_COUNT,
  QUIZ_SECONDS_PER_QUESTION,
  type QuizImageStyle,
  type TopicAvailability,
  type TopicCandidate,
} from "@studio/shared";
import { TopicLayoutPreviewButton } from "./TopicLayoutPreviewButton";

function formatDomain(domainId: string): string {
  return domainId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function TopicTopBar({
  topic,
  availability,
  canConfirm,
  sourceCapacity,
}: {
  topic: TopicCandidate;
  availability?: TopicAvailability;
  canConfirm: boolean;
  sourceCapacity: number;
}) {
  const isShortReel = topic.content_kind === "short_reel";
  return (
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
        {availability ? (
          <span
            className="badge"
            style={{
              fontSize: "11px",
              padding: "1px 6px",
              borderRadius: "4px",
              backgroundColor: canConfirm ? "#059669" : "#dc2626",
              color: "#fff",
              fontWeight: 600,
            }}
            title={availability.recovery_action}
          >
            {canConfirm
              ? `${sourceCapacity} Ready`
              : availability.reason_code === "UNBOUND_LEGACY_TOPIC"
                ? "Legacy Unbound"
                : "Unavailable"}
          </span>
        ) : null}
      </div>
      {topic.content_kind === "episode" ? (
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
  );
}

function TopicPickers({
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
}: {
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
}) {
  if (topic.content_kind === "short_reel") {
    return (
      <div className="topic-pickers-row" style={{ alignItems: "center" }}>
        <div style={{ fontSize: "13px", color: "#aaa" }}>
          <span>Question Bank: </span>
          <strong style={{ color: "#fff" }}>1 Question ({topic.archetype})</strong>
        </div>
      </div>
    );
  }

  const inputId = `topic-question-count-${topic.topic_id}`;
  const styleSelectId = `topic-style-select-${topic.topic_id}`;
  const estimatedDurationMinutes = Math.max(3, Math.round((questionCount * QUIZ_SECONDS_PER_QUESTION) / 60));

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
        <span aria-live="polite">
          {isQuestionCountValid ? `About ${estimatedDurationMinutes} min` : `Choose ${QUIZ_MIN_QUESTION_COUNT}-${maxAllowedQuestions}`}
        </span>
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

function TopicAvailabilityNotice({ availability }: { availability: TopicAvailability }) {
  if (availability.can_confirm) return null;
  return (
    <div
      className="topic-availability-notice"
      role="alert"
      style={{
        padding: "8px 12px",
        borderRadius: "6px",
        backgroundColor: "rgba(220, 38, 38, 0.1)",
        border: "1px solid rgba(220, 38, 38, 0.3)",
        fontSize: "12px",
        color: "#fca5a5",
        marginBottom: "12px",
      }}
    >
      <strong style={{ display: "block", marginBottom: "2px" }}>{availability.reason_code.replace(/_/g, " ")}</strong>
      <span>{availability.recovery_action}</span>
    </div>
  );
}

function TopicFooter({
  topic,
  busy,
  disabled,
  isQuestionCountValid,
  canConfirm,
  sourceCapacity,
  recoveryAction,
  questionCount,
  selectedStyle,
  onConfirm,
}: {
  topic: TopicCandidate;
  busy: boolean;
  disabled: boolean;
  isQuestionCountValid: boolean;
  canConfirm: boolean;
  sourceCapacity: number;
  recoveryAction?: string;
  questionCount: number;
  selectedStyle: QuizImageStyle | "mixed";
  onConfirm: (questionCount: number, visualStyle: QuizImageStyle | "mixed") => void;
}) {
  const isShortReel = topic.content_kind === "short_reel";
  return (
    <div className="topic-footer">
      <span>{topic.estimated_potential}</span>
      <button
        className="primary-button topic-build-btn"
        disabled={disabled || !isQuestionCountValid || !canConfirm}
        title={
          !canConfirm ? recoveryAction : !isQuestionCountValid ? `Question count must not exceed capacity (${sourceCapacity})` : undefined
        }
        onClick={() => onConfirm(isShortReel ? 1 : questionCount, selectedStyle)}
      >
        {busy ? <CircleNotch className="spin" size={15} /> : <Lightning size={14} weight="fill" />}
        {busy ? (isShortReel ? "Creating Short-Reel…" : "Building Video…") : isShortReel ? "Create Short-Reel" : "Build Video (1-Click)"}
      </button>
    </div>
  );
}

export function TopicCard({
  topic,
  channelStyles = ALL_QUIZ_IMAGE_STYLES,
  availability,
  onConfirm,
  busy,
  disabled,
}: {
  topic: TopicCandidate;
  channelStyles?: QuizImageStyle[];
  availability?: TopicAvailability;
  onConfirm: (questionCount: number, visualStyle: QuizImageStyle | "mixed") => void;
  busy: boolean;
  disabled: boolean;
}) {
  const isShortReel = topic.content_kind === "short_reel";
  const canConfirm = availability ? availability.can_confirm : true;
  const isBound = Array.isArray(topic.source_bindings) && topic.source_bindings.length > 0;
  const sourceCapacity = availability?.source_capacity ?? (isBound ? topic.source_bindings!.length : QUIZ_MAX_QUESTION_COUNT);
  const maxAllowedQuestions = isShortReel
    ? 1
    : isBound || availability
      ? Math.min(QUIZ_MAX_QUESTION_COUNT, Math.max(QUIZ_MIN_QUESTION_COUNT, sourceCapacity))
      : QUIZ_MAX_QUESTION_COUNT;

  const [questionCount, setQuestionCount] = useState(isShortReel ? 1 : Math.min(topic.question_count, maxAllowedQuestions));
  const [selectedStyle, setSelectedStyle] = useState<QuizImageStyle | "mixed">(
    topic.content_kind === "episode" && topic.visual_style ? topic.visual_style : "mixed",
  );
  const isQuestionCountValid = isShortReel
    ? true
    : Number.isInteger(questionCount) &&
      questionCount >= QUIZ_MIN_QUESTION_COUNT &&
      questionCount <= maxAllowedQuestions &&
      (!availability || questionCount <= sourceCapacity);
  const availableStyles = channelStyles && channelStyles.length > 0 ? channelStyles : ALL_QUIZ_IMAGE_STYLES;

  return (
    <article className={`topic-card ${isShortReel ? "topic-card-short-reel" : ""}`}>
      <TopicTopBar topic={topic} availability={availability} canConfirm={canConfirm} sourceCapacity={sourceCapacity} />
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
      <TopicPickers
        topic={topic}
        questionCount={questionCount}
        setQuestionCount={setQuestionCount}
        maxAllowedQuestions={maxAllowedQuestions}
        isQuestionCountValid={isQuestionCountValid}
        disabled={disabled}
        canConfirm={canConfirm}
        selectedStyle={selectedStyle}
        setSelectedStyle={setSelectedStyle}
        availableStyles={availableStyles}
      />
      {availability ? <TopicAvailabilityNotice availability={availability} /> : null}
      <TopicFooter
        topic={topic}
        busy={busy}
        disabled={disabled}
        isQuestionCountValid={isQuestionCountValid}
        canConfirm={canConfirm}
        sourceCapacity={sourceCapacity}
        recoveryAction={availability?.recovery_action}
        questionCount={questionCount}
        selectedStyle={selectedStyle}
        onConfirm={onConfirm}
      />
    </article>
  );
}
