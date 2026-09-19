import { useState } from "react";
import { ArrowRight, CircleNotch, FloppyDisk, MagicWand, UploadSimple } from "@phosphor-icons/react";
import type { MascotProfile, QuizImageStyle, UploadMascotConceptResponse } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { Notice } from "../../../components/types";
import type { PROMPT_TEMPLATES } from "../constants";
import { MascotIdentityForm } from "./MascotIdentityForm";
import { MascotPromptStudio } from "./MascotPromptStudio";
import { MascotConceptPreviewCard } from "./MascotConceptPreviewCard";
import { MascotConceptUploader } from "./MascotConceptUploader";
import { MascotStyleConceptManager } from "./MascotStyleConceptManager";
import { MascotPromptFocusModal } from "./MascotPromptFocusModal";
import { MascotLightboxModal } from "./MascotLightboxModal";
import type { useMascotStyles } from "../hooks/useMascotStyles";

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
  savingIdentity?: boolean;
  stylesState?: ReturnType<typeof useMascotStyles>;
  lightboxImage: string | null;
  setLightboxImage: (img: string | null) => void;
  isPromptModalOpen: boolean;
  setIsPromptModalOpen: (open: boolean) => void;
  onInjectTag: (tag: string) => void;
  onApplyTemplate: (tpl: (typeof PROMPT_TEMPLATES)[0]) => void;
  onCopyPrompt: () => void;
  onGenerateConcept: () => void;
  onSaveIdentity?: () => void;
  onRemoveBackground: (target: "master" | "all") => void;
  onNextStep: () => void;
  onConceptUploaded?: (response: UploadMascotConceptResponse) => void;
  setEditingMascot?: (mascot: MascotProfile | null) => void;
  onNotice?: (notice: Notice) => void;
  onMascotsChanged?: () => Promise<void>;
}

export function MascotConceptStep(props: MascotConceptStepProps) {
  const {
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
    stylesState,
    onInjectTag,
    onApplyTemplate,
    onCopyPrompt,
    onGenerateConcept,
    onSaveIdentity,
    onRemoveBackground,
    onNextStep,
    onConceptUploaded,
    setEditingMascot,
    onNotice,
    onMascotsChanged,
  } = props;
  const { t } = useTranslation();

  const [conceptMode, setConceptMode] = useState<"ai_prompt" | "upload_concept">(
    editingMascot?.concept_origin === "user_uploaded" ? "upload_concept" : "ai_prompt",
  );

  const hasMasterReady = Boolean(editingMascot?.master_image_url || editingMascot?.master_raw_image_url);

  const handleUploadSuccess = (response: UploadMascotConceptResponse) => {
    if (onConceptUploaded) {
      onConceptUploaded(response);
    } else if (setEditingMascot) {
      setEditingMascot(response.mascot);
    }
    if (response.mascot.name) {
      setGenName(response.mascot.name);
    }
    if (response.mascot.color_theme) {
      setGenColor(response.mascot.color_theme);
    }
    if (response.mascot.visual_style) {
      setGenStyle(response.mascot.visual_style);
    }
  };

  return (
    <div className="wizard-step-content mascot-concept-step-content">
      {/* TIER 1: CHARACTER CORE DNA & MASTER PREVIEW STAGE */}
      <div className="concept-tier-identity-grid">
        <div className="wizard-form-col">
          <div className="wizard-card step-identity-card">
            <div className="wizard-card-header-flex" style={{ marginBottom: "16px" }}>
              <div>
                <h3>{t("mascots.conceptTitle")}</h3>
              </div>
            </div>

            {/* Segmented Mode Switcher */}
            <div
              className="concept-mode-switcher"
              role="tablist"
              aria-label={t("mascots.conceptModeSwitchAria")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={conceptMode === "ai_prompt"}
                data-testid="mode-ai-prompt-btn"
                className={`concept-mode-btn ${conceptMode === "ai_prompt" ? "is-active" : ""}`}
                onClick={() => setConceptMode("ai_prompt")}
              >
                <MagicWand size={16} weight={conceptMode === "ai_prompt" ? "bold" : "regular"} />
                <span>{t("mascots.modeAiPrompt")}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={conceptMode === "upload_concept"}
                data-testid="mode-upload-concept-btn"
                className={`concept-mode-btn ${conceptMode === "upload_concept" ? "is-active" : ""}`}
                onClick={() => setConceptMode("upload_concept")}
              >
                <UploadSimple size={16} weight={conceptMode === "upload_concept" ? "bold" : "regular"} />
                <span>{t("mascots.modeUploadConcept")}</span>
              </button>
            </div>

            {conceptMode === "ai_prompt" ? (
              <>
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
                      style={{ background: `linear-gradient(135deg, ${genColor} 0%, #0284c7 100%)`, boxShadow: `0 4px 16px ${genColor}35` }}
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
                    className={`quiet-button ${hasMasterReady ? "is-ready-forward" : ""}`}
                    onClick={onNextStep}
                    disabled={!hasMasterReady || busyAction !== null}
                  >
                    <span>{t("mascots.nextStatesBtn")}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <MascotConceptUploader
                  mascotId={editingMascot?.id}
                  name={genName}
                  description={genDescription}
                  colorTheme={genColor}
                  visualStyle={genStyle}
                  onSuccess={handleUploadSuccess}
                  onNotice={onNotice}
                  onMascotsChanged={onMascotsChanged}
                />

                {/* Mode 2 Action Row */}
                <div className="wizard-action-row" style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
                  <div />
                  <button
                    type="button"
                    className={`quiet-button ${hasMasterReady ? "is-ready-forward" : ""}`}
                    onClick={onNextStep}
                    disabled={!hasMasterReady || busyAction !== null}
                  >
                    <span>{t("mascots.nextStatesBtn")}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

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
      </div>

      {/* TIER 2: STYLE THEMES & WARDROBE DECK */}
      {hasMasterReady && editingMascot ? (
        <div className="concept-tier-styles-deck">
          <MascotStyleConceptManager editingMascot={editingMascot} stylesState={stylesState} onOpenLightbox={setLightboxImage} />
        </div>
      ) : null}

      <MascotPromptFocusModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        genPrompt={genPrompt}
        setGenPrompt={setGenPrompt}
        onInjectTag={onInjectTag}
      />

      <MascotLightboxModal imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
