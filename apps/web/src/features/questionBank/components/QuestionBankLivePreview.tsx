import { useState } from "react";
import { ArrowsClockwise, DeviceMobile, Eye, EyeSlash, GameController, Info, Monitor, Sparkle, VideoCamera } from "@phosphor-icons/react";
import type { BankQuestionWithCooldown } from "../types/questionBankUi.types";
import { useTranslation } from "../../../i18n";

export interface QuestionBankLivePreviewProps {
  question: BankQuestionWithCooldown | null;
  aspect: "16:9" | "9:16";
  buildingVideo?: boolean;
  transcreating?: boolean;
  onToggleAspect: () => void;
  onQuickBuildVideo?: (q: BankQuestionWithCooldown, aspect: "16:9" | "9:16") => void;
  onTranscreateQuestion?: (questionId: string, targetLanguage: string) => Promise<unknown>;
}

export function QuestionBankLivePreview({
  question,
  aspect,
  buildingVideo,
  transcreating,
  onToggleAspect,
  onQuickBuildVideo,
  onTranscreateQuestion,
}: QuestionBankLivePreviewProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"arcade" | "details">("arcade");
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>("original");

  if (!question) {
    return (
      <div className="qb-preview-empty">
        <div className="qb-preview-empty-icon">
          <Sparkle size={36} weight="fill" />
        </div>
        <p className="qb-preview-empty-title">No Question Selected</p>
        <p className="qb-preview-empty-text">{t("questionBank.preview.emptyPrompt")}</p>
      </div>
    );
  }

  const isShorts = aspect === "9:16";
  const availableLangs = Object.keys(question.translations || {}).filter((l) => l !== (question.language || "en"));
  const activeTranslation = selectedLang !== "original" ? question.translations?.[selectedLang] : null;

  const currentQuestionText = activeTranslation ? activeTranslation.question : question.question;
  const currentChoices = activeTranslation
    ? activeTranslation.choices.map((c) => {
        const orig = question.choices?.find((oc) => oc.id === c.id);
        return { id: c.id, text: c.text, is_correct: orig?.is_correct ?? false };
      })
    : question.choices || [];
  const currentExplanation = activeTranslation ? activeTranslation.explanation : question.explanation;
  const currentFunFact = activeTranslation ? activeTranslation.fun_fact : question.fun_fact;

  return (
    <div className="qb-preview-card">
      {/* 1. Pinned Sticky Controls & Primary Action Header */}
      <div className="qb-preview-top-sticky">
        <div className="qb-preview-header-bar">
          <div className="qb-preview-title-block">
            <span className="qb-preview-tag">{t("questionBank.preview.liveTag")}</span>
            <span className="qb-preview-arch">{question.archetype_id}</span>
          </div>

          <div className="qb-preview-controls">
            <button
              type="button"
              className="qb-preview-toggle-btn"
              onClick={onToggleAspect}
              title={isShorts ? t("questionBank.preview.aspectLandscape") : t("questionBank.preview.aspectShorts")}
            >
              {isShorts ? <Monitor size={14} /> : <DeviceMobile size={14} />}
              <span>{aspect}</span>
            </button>

            <button
              type="button"
              className={`qb-preview-toggle-btn ${showAnswer ? "is-active" : ""}`}
              onClick={() => setShowAnswer((prev) => !prev)}
              title={showAnswer ? t("questionBank.preview.hideAnswer") : t("questionBank.preview.showAnswer")}
            >
              {showAnswer ? <EyeSlash size={14} /> : <Eye size={14} />}
              <span>{showAnswer ? t("questionBank.preview.hideAnswer") : t("questionBank.preview.showAnswer")}</span>
            </button>
          </div>
        </div>

        {/* Permanent Sticky 1-Click Build Video Button */}
        {onQuickBuildVideo && (
          <button
            type="button"
            className="qb-btn qb-btn-primary qb-quick-build-btn"
            disabled={buildingVideo}
            onClick={() => onQuickBuildVideo(question, aspect)}
          >
            <VideoCamera size={16} weight="fill" />
            <span>{buildingVideo ? t("questionBank.preview.quickBuilding") : t("questionBank.preview.quickBuildBtn")}</span>
          </button>
        )}
      </div>

      {/* 2. Dual-Tab Switcher */}
      <div className="qb-inspector-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "arcade"}
          className={`qb-inspector-tab-btn ${activeTab === "arcade" ? "is-active" : ""}`}
          onClick={() => setActiveTab("arcade")}
        >
          <GameController size={15} />
          <span>{t("questionBank.preview.tabs.arcade")}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "details"}
          className={`qb-inspector-tab-btn ${activeTab === "details" ? "is-active" : ""}`}
          onClick={() => setActiveTab("details")}
        >
          <Info size={15} />
          <span>{t("questionBank.preview.tabs.details")}</span>
        </button>
      </div>

      {/* 3. Scrollable Tab Content */}
      <div className="qb-preview-scroll-body">
        {/* Universal Multilingual Switcher Bar - Available across both tabs */}
        <div className="qb-preview-lang-bar">
          <div className="qb-lang-tabs">
            <button
              type="button"
              className={`qb-lang-tab-btn ${selectedLang === "original" ? "is-active" : ""}`}
              onClick={() => setSelectedLang("original")}
            >
              {t("questionBank.preview.originalEn")}
            </button>

            {availableLangs.map((langCode) => (
              <button
                key={langCode}
                type="button"
                className={`qb-lang-tab-btn ${selectedLang === langCode ? "is-active" : ""}`}
                onClick={() => setSelectedLang(langCode)}
              >
                <span>{langCode.toUpperCase()}</span>
                <span className="qb-tab-dot is-cached" />
              </button>
            ))}
          </div>

          {selectedLang !== "original" && onTranscreateQuestion && (
            <button
              type="button"
              className="qb-btn-retranscreate"
              disabled={transcreating}
              onClick={() => onTranscreateQuestion(question.id, selectedLang)}
              title={t("questionBank.preview.retranslateTitle")}
            >
              <ArrowsClockwise size={13} className={transcreating ? "qb-spin" : ""} />
              <span>{transcreating ? t("questionBank.preview.translating") : t("questionBank.preview.retranslateBtn")}</span>
            </button>
          )}
        </div>

        {activeTab === "arcade" ? (
          <>
            {/* Candy Arcade Canvas Mockup */}
            <div className={`qb-mockup-frame ${isShorts ? "is-vertical" : "is-horizontal"}`}>
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
                  {currentChoices.map((c) => {
                    const isCorrect = c.id === question.correct_choice_id;
                    const highlight = showAnswer && isCorrect;

                    return (
                      <div key={c.id} className={`qb-mockup-choice ${highlight ? "is-correct" : ""}`}>
                        <span className="qb-mockup-choice-id">{c.id}</span>
                        <span className="qb-mockup-choice-text">{c.text}</span>
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
        ) : (
          <>
            {/* Explanation & Facts */}
            <div className="qb-preview-info-box">
              <div className="qb-info-row">
                <strong>{t("questionBank.preview.explanation")}</strong>
                <p>{currentExplanation || t("questionBank.preview.noExplanation")}</p>
              </div>
              {currentFunFact && (
                <div className="qb-info-row qb-info-funfact">
                  <strong>{t("questionBank.preview.funFact")}</strong>
                  <p>{currentFunFact}</p>
                </div>
              )}
            </div>

            {/* Question Spec Metadata Grid */}
            <div className="qb-metadata-grid">
              <div className="qb-metadata-item">
                <span className="qb-metadata-label">Archetype</span>
                <span className="qb-metadata-val">{question.archetype_id}</span>
              </div>
              <div className="qb-metadata-item">
                <span className="qb-metadata-label">Domain</span>
                <span className="qb-metadata-val">{question.domain_id.replaceAll("_", " ")}</span>
              </div>
              <div className="qb-metadata-item">
                <span className="qb-metadata-label">Thinking Time</span>
                <span className="qb-metadata-val">{question.thinking_seconds ?? 4}s</span>
              </div>
              <div className="qb-metadata-item">
                <span className="qb-metadata-label">Audience / Age</span>
                <span className="qb-metadata-val">{question.age_band || "family"}</span>
              </div>
            </div>

            {/* Visual Spec Image Prompt */}
            {question.visual_spec?.prompt && (
              <div className="qb-preview-info-box">
                <strong>Visual Prompt (English):</strong>
                <p>{question.visual_spec.prompt}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
