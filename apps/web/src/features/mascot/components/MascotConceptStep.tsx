import { ArrowRight, Check, CircleNotch, FloppyDisk, MagicWand, X } from "@phosphor-icons/react";
import type { MascotProfile, QuizImageStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { PROMPT_TEMPLATES, QUICK_PROMPT_TAGS } from "../constants";
import { MascotIdentityForm } from "./MascotIdentityForm";
import { MascotPromptStudio } from "./MascotPromptStudio";
import { MascotConceptPreviewCard } from "./MascotConceptPreviewCard";

export interface MascotConceptStepProps {
  genName: string;
  setGenName: (name: string) => void;
  genDescription: string;
  setGenDescription: (desc: string) => void;
  genStyle: QuizImageStyle;
  setGenStyle: (style: QuizImageStyle) => void;
  genColor: string;
  setGenColor: (color: string) => void;
  genPrompt: string;
  setGenPrompt: (prompt: string) => void;
  editingMascot: MascotProfile | null;
  busyAction: string | null;
  generationElapsed: number;
  itemProgress: number;
  currentStageMessage: string;
  showNotesAccordion: boolean;
  setShowNotesAccordion: React.Dispatch<React.SetStateAction<boolean>>;
  promptCopied: boolean;
  lightboxImage: string | null;
  setLightboxImage: (img: string | null) => void;
  isPromptModalOpen: boolean;
  setIsPromptModalOpen: (open: boolean) => void;
  savingIdentity?: boolean;
  onInjectTag: (tag: string) => void;
  onApplyTemplate: (tpl: (typeof PROMPT_TEMPLATES)[0]) => void;
  onCopyPrompt: () => void;
  onGenerateConcept: () => void;
  onSaveIdentity?: () => void;
  onRemoveBackground: (target: "master" | "all") => void;
  onNextStep: () => void;
}

export function MascotConceptStep({
  genName,
  setGenName,
  genDescription,
  setGenDescription,
  genStyle,
  setGenStyle,
  genColor,
  setGenColor,
  genPrompt,
  setGenPrompt,
  editingMascot,
  busyAction,
  generationElapsed,
  itemProgress,
  currentStageMessage,
  showNotesAccordion,
  setShowNotesAccordion,
  promptCopied,
  lightboxImage,
  setLightboxImage,
  isPromptModalOpen,
  setIsPromptModalOpen,
  savingIdentity = false,
  onInjectTag,
  onApplyTemplate,
  onCopyPrompt,
  onGenerateConcept,
  onSaveIdentity,
  onRemoveBackground,
  onNextStep,
}: MascotConceptStepProps) {
  const { t } = useTranslation();

  return (
    <div className="wizard-step-content step-identity-grid">
      {/* Left Column: Form & Hero Prompt Studio */}
      <div className="wizard-form-col">
        <div className="wizard-card step-identity-card">
          <div className="wizard-card-header-flex" style={{ marginBottom: "16px" }}>
            <div>
              <h3>{t("mascots.conceptTitle")}</h3>
            </div>
          </div>

          <MascotIdentityForm
            genName={genName}
            setGenName={setGenName}
            genColor={genColor}
            setGenColor={setGenColor}
            genStyle={genStyle}
            setGenStyle={setGenStyle}
          />

          <MascotPromptStudio
            genColor={genColor}
            genPrompt={genPrompt}
            setGenPrompt={setGenPrompt}
            genDescription={genDescription}
            setGenDescription={setGenDescription}
            promptCopied={promptCopied}
            showNotesAccordion={showNotesAccordion}
            setShowNotesAccordion={setShowNotesAccordion}
            onCopyPrompt={onCopyPrompt}
            onInjectTag={onInjectTag}
            onApplyTemplate={onApplyTemplate}
            onOpenPromptModal={() => setIsPromptModalOpen(true)}
          />

          {/* Wizard Action CTA Row */}
          <div className="wizard-action-row" style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                className="primary-button ai-magic-btn"
                style={{
                  background: `linear-gradient(135deg, ${genColor} 0%, #0284c7 100%)`,
                  boxShadow: `0 4px 16px ${genColor}35`,
                }}
                disabled={busyAction !== null || savingIdentity || !genName.trim()}
                onClick={onGenerateConcept}
              >
                {busyAction === "concept" ? <CircleNotch className="spin" size={18} /> : <MagicWand size={18} weight="bold" />}
                <span>
                  {busyAction === "concept" ? `${t("mascots.generatingConceptBtn")} (${itemProgress}%)` : t("mascots.generateConceptBtn")}
                </span>
              </button>

              {editingMascot && onSaveIdentity ? (
                <button
                  type="button"
                  className="quiet-button"
                  onClick={onSaveIdentity}
                  disabled={busyAction !== null || savingIdentity || !genName.trim()}
                  title={t("mascots.saveIdentityBtn")}
                >
                  {savingIdentity ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
                  <span>{savingIdentity ? t("mascots.savingIdentityBtn") : t("mascots.saveIdentityBtn")}</span>
                </button>
              ) : null}
            </div>

            <button
              type="button"
              className={`quiet-button ${editingMascot?.master_image_url ? "is-ready-forward" : ""}`}
              onClick={onNextStep}
              disabled={!editingMascot?.master_image_url || busyAction !== null}
            >
              <span>{t("mascots.nextStatesBtn")}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Master Preview Stage Box */}
      <div className="wizard-preview-col">
        <MascotConceptPreviewCard
          editingMascot={editingMascot}
          genColor={genColor}
          genStyle={genStyle}
          busyAction={busyAction}
          itemProgress={itemProgress}
          currentStageMessage={currentStageMessage}
          generationElapsed={generationElapsed}
          onZoomPreview={(url) => setLightboxImage(url)}
          onRemoveBackground={onRemoveBackground}
        />
      </div>

      {/* Fullscreen Prompt Focus Modal */}
      {isPromptModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsPromptModalOpen(false)}>
          <section className="modal prompt-focus-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <h2 style={{ fontSize: "16px", margin: 0 }}>{t("mascots.focusPromptTitle")}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setIsPromptModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="prompt-modal-body" style={{ padding: "16px 20px" }}>
              <div className="quick-tags-bar" style={{ marginBottom: "12px" }}>
                <div className="quick-tags-list">
                  {QUICK_PROMPT_TAGS.map((tag, idx) => (
                    <button key={idx} type="button" className="quick-tag-chip" onClick={() => onInjectTag(tag)}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={12}
                className="prompt-modal-textarea"
                style={{ width: "100%", fontSize: "14px", lineHeight: "1.6" }}
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder={t("mascots.promptPlaceholder")}
                autoFocus
              />
            </div>

            <div className="modal-actions" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="primary-button" onClick={() => setIsPromptModalOpen(false)}>
                <Check size={16} />
                <span>{t("common.saved")}</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {/* Image Lightbox Modal */}
      {lightboxImage ? (
        <div className="modal-backdrop lightbox-backdrop" role="presentation" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lightbox-close-btn" onClick={() => setLightboxImage(null)}>
              <X size={20} />
            </button>
            <img src={lightboxImage} alt="Master Concept Large Preview" className="lightbox-img" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
