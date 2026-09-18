import { Eye, EyeSlash, VideoCamera } from "@phosphor-icons/react";
import type { BankQuestionWithCooldown } from "../../types/questionBankUi.types";
import { useTranslation } from "../../../../i18n";

export interface PreviewStickyHeaderProps {
  question: BankQuestionWithCooldown;
  showAnswer: boolean;
  onToggleAnswer: () => void;
  buildingVideo?: boolean;
  onQuickBuildVideo?: (question: BankQuestionWithCooldown) => void;
}

export function PreviewStickyHeader({ question, showAnswer, onToggleAnswer, buildingVideo, onQuickBuildVideo }: PreviewStickyHeaderProps) {
  const { t } = useTranslation();
  const answerLabel = showAnswer ? t("questionBank.preview.hideAnswer") : t("questionBank.preview.showAnswer");

  return (
    <div className="qb-preview-top-sticky">
      <div className="qb-preview-header-bar">
        <div className="qb-preview-title-block">
          <span className="qb-preview-tag">{t("questionBank.preview.liveTag")}</span>
          <span className="qb-preview-arch">{question.archetype_id}</span>
        </div>

        <div className="qb-preview-controls">
          <button
            type="button"
            className={`qb-preview-toggle-btn ${showAnswer ? "is-active" : ""}`}
            onClick={onToggleAnswer}
            title={answerLabel}
          >
            {showAnswer ? <EyeSlash size={14} /> : <Eye size={14} />}
            <span>{answerLabel}</span>
          </button>
        </div>
      </div>

      {onQuickBuildVideo && (
        <button
          type="button"
          className="qb-btn qb-btn-primary qb-quick-build-btn"
          disabled={buildingVideo}
          onClick={() => onQuickBuildVideo(question)}
        >
          <VideoCamera size={16} weight="fill" />
          <span>{buildingVideo ? t("questionBank.preview.quickBuilding") : t("questionBank.preview.quickBuildBtn")}</span>
        </button>
      )}
    </div>
  );
}
