import { CheckCircle, ClockCountdown } from "@phosphor-icons/react";
import type { BankQuestionWithCooldown } from "@studio/shared";

export interface CreateShortReelQuestionCardProps {
  question: BankQuestionWithCooldown;
  isSelected: boolean;
  onSelect: (questionId: string) => void;
}

function formatArchetypeLabel(archetypeId: string): string {
  switch (archetypeId) {
    case "versus_faceoff":
      return "Versus Faceoff";
    case "deep_trivia":
      return "Deep Trivia";
    case "visual_spotting":
      return "Visual Spotting";
    case "verdict_true_false":
    case "verdict_fact_myth":
      return "True or False";
    case "fact_chain":
      return "Fact Chain";
    case "odd_one_out":
      return "Odd One Out";
    default:
      return archetypeId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function CreateShortReelQuestionCard({ question, isSelected, onSelect }: CreateShortReelQuestionCardProps) {
  const isCooldown = question.channel_cooldown?.is_cooldown;

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      className={`short-reel-question-card ${isSelected ? "is-selected" : ""} ${isCooldown ? "is-cooldown" : ""}`}
      onClick={() => onSelect(question.id)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onSelect(question.id);
        }
      }}
      data-testid={`question-card-${question.id}`}
    >
      <div className="short-reel-question-select-indicator">
        <div className={`radio-dot ${isSelected ? "is-checked" : ""}`}>{isSelected ? <CheckCircle size={18} weight="fill" /> : null}</div>
      </div>

      <div className="short-reel-question-content">
        <div className="short-reel-question-meta">
          <span className="archetype-badge">{formatArchetypeLabel(question.archetype_id)}</span>
          {question.domain_id ? <span className="domain-badge">{question.domain_id}</span> : null}
          {isCooldown ? (
            <span className="cooldown-badge" title="Question is in channel cooldown">
              <ClockCountdown size={13} />
              <span>Cooldown ({question.channel_cooldown?.days_remaining ?? 0}d)</span>
            </span>
          ) : null}
        </div>

        <p className="short-reel-question-text">{question.question}</p>

        <div className="short-reel-choice-pills">
          {question.choices.map((choice) => (
            <span key={choice.id} className={`choice-pill ${choice.id === question.correct_choice_id ? "is-correct" : ""}`}>
              <span className="choice-pill-id">{choice.id.toUpperCase()}:</span>
              <span className="choice-pill-text">{choice.text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
