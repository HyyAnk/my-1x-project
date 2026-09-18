import { Sparkle } from "@phosphor-icons/react";
import type { BankQuestionWithCooldown } from "../../types/questionBankUi.types";
import { useTranslation } from "../../../../i18n";

export interface QuestionBankArcadeTabProps {
  question: BankQuestionWithCooldown;
  showAnswer: boolean;
  currentQuestionText?: string;
  currentChoices?: Array<{ id: string; text: string; is_correct?: boolean }>;
  currentExplanation?: string | null;
}

export function QuestionBankArcadeTab({
  question,
  showAnswer,
  currentQuestionText = question.question,
  currentChoices = question.choices || [],
  currentExplanation = question.explanation,
}: QuestionBankArcadeTabProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Candy Arcade Canvas Mockup */}
      <div className="qb-mockup-frame is-horizontal">
        <div className="qb-mockup-screen">
          {/* Header Bar */}
          <div className="qb-mockup-top">
            <span className="qb-mockup-subtopic">{(question.subtopic_id || "").replaceAll("_", " ").toUpperCase()}</span>
            <span className="qb-mockup-timer">⏱️ {question.thinking_seconds ?? 4}s</span>
          </div>

          {/* Question Text */}
          <div className="qb-mockup-q-box">
            <h3 className="qb-mockup-question">{currentQuestionText}</h3>
          </div>

          {/* Simulated Choices */}
          <div className="qb-mockup-choices">
            {currentChoices.map((choice) => {
              const isCorrect = choice.id === question.correct_choice_id;
              const highlight = showAnswer && isCorrect;

              return (
                <div
                  key={choice.id}
                  className={`qb-mockup-choice ${highlight ? "is-correct" : ""}`}
                  data-correct={isCorrect ? "true" : "false"}
                >
                  <span className="qb-mockup-choice-id">{choice.id}</span>
                  <span className="qb-mockup-choice-text">{choice.text}</span>
                  {highlight && <span className="qb-mockup-correct-tag">{t("questionBank.preview.correctBadge")}</span>}
                </div>
              );
            })}
          </div>

          {/* Visual Spec Hint if provided */}
          {question.visual_spec?.prompt && (
            <div className="qb-mockup-visual-hint">
              <Sparkle size={13} weight="fill" />
              <span>
                {t("questionBank.preview.aiPromptHint")} {question.visual_spec.prompt}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Compact Explanation on Arcade tab */}
      {currentExplanation && (
        <div className="qb-preview-info-box">
          <strong>{t("questionBank.preview.explanation")}</strong>
          <p>{currentExplanation}</p>
        </div>
      )}
    </>
  );
}
