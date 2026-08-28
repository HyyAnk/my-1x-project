import {
  ArrowRight,
  ArrowsOutSimple,
  CaretDown,
  CaretRight,
  Check,
  CheckCircle,
  CircleNotch,
  Copy,
  DownloadSimple,
  MagicWand,
  MagnifyingGlassPlus,
  PaintBrush,
  Smiley,
  Sparkle,
  Trash,
  X,
} from "@phosphor-icons/react";
import { QUIZ_IMAGE_STYLE_LABELS, type MascotProfile, type QuizImageStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import {
  COLOR_PRESETS,
  PROMPT_TEMPLATES,
  QUICK_PROMPT_TAGS,
  STYLE_OPTIONS,
} from "../constants";

type MascotConceptStepProps = {
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
  onInjectTag: (tag: string) => void;
  onApplyTemplate: (tpl: (typeof PROMPT_TEMPLATES)[0]) => void;
  onCopyPrompt: () => void;
  onGenerateConcept: () => void;
  onRemoveBackground: (target: "master" | "all") => void;
  onNextStep: () => void;
};

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
  onInjectTag,
  onApplyTemplate,
  onCopyPrompt,
  onGenerateConcept,
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
              <p className="wizard-card-sub" style={{ marginBottom: 0 }}>
                {t("mascots.conceptSub")}
              </p>
            </div>
          </div>

          {/* Mascot Name & Color Palette Row */}
          <div className="identity-top-row">
            <div className="form-group flex-1">
              <label htmlFor="mascot-name">
                {t("mascots.nameLabel")} <span style={{ color: "var(--coral)" }}>*</span>
              </label>
              <input
                id="mascot-name"
                type="text"
                className="identity-name-input"
                placeholder={t("mascots.namePlaceholder")}
                value={genName}
                onChange={(e) => setGenName(e.target.value)}
              />
            </div>

            <div className="form-group color-palette-form-group">
              <label htmlFor="mascot-color">{t("mascots.colorLabel")}</label>
              <div className="color-palette-wrap">
                <div className="color-swatches-row">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      className={`color-swatch-btn ${genColor.toLowerCase() === preset.hex.toLowerCase() ? "is-selected" : ""}`}
                      style={{ backgroundColor: preset.hex }}
                      onClick={() => setGenColor(preset.hex)}
                      title={`${preset.name} (${preset.hex})`}
                      aria-label={preset.name}
                    >
                      {genColor.toLowerCase() === preset.hex.toLowerCase() ? (
                        <Check size={12} weight="bold" color="#fff" />
                      ) : null}
                    </button>
                  ))}
                </div>
                <div className="custom-color-input-wrap">
                  <input
                    id="mascot-color"
                    type="color"
                    value={genColor}
                    onChange={(e) => setGenColor(e.target.value)}
                    className="native-color-picker"
                    title={t("mascots.customColorPicker")}
                  />
                  <input
                    type="text"
                    value={genColor}
                    onChange={(e) => setGenColor(e.target.value)}
                    placeholder="#06b6d4"
                    className="color-hex-input"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Visual Style Selector Cards */}
          <div className="form-group" style={{ marginTop: "14px" }}>
            <label>{t("mascots.styleLabel")}</label>
            <div className="visual-style-selector-grid">
              {STYLE_OPTIONS.map((opt) => {
                const isSelected = genStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`visual-style-card ${isSelected ? "is-selected" : ""}`}
                    style={isSelected ? { borderColor: genColor, boxShadow: `0 0 14px ${genColor}35` } : undefined}
                    onClick={() => setGenStyle(opt.id)}
                  >
                    <span className="style-card-icon">{opt.icon}</span>
                    <div className="style-card-info">
                      <strong className="style-card-title">{opt.title}</strong>
                      <small className="style-card-desc">{t(opt.descKey)}</small>
                    </div>
                    {isSelected ? (
                      <span className="style-card-badge" style={{ backgroundColor: genColor }}>
                        <Check size={11} weight="bold" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* HERO PROMPT STUDIO */}
          <div className="hero-prompt-studio-box" style={{ borderColor: `${genColor}45` }}>
            <div className="hero-prompt-header">
              <div className="hero-prompt-title-group">
                <Sparkle size={18} weight="fill" style={{ color: genColor }} />
                <div>
                  <label htmlFor="mascot-prompt" className="hero-prompt-label">
                    {t("mascots.promptLabel")} <span className="hero-prompt-subtag">(AI Character Anchor)</span>
                  </label>
                </div>
              </div>

              <div className="hero-prompt-actions">
                <button
                  type="button"
                  className="quiet-button compact icon-only"
                  onClick={onCopyPrompt}
                  title={t("mascots.copyPromptBtn")}
                >
                  {promptCopied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                </button>
                <button
                  type="button"
                  className="quiet-button compact icon-only"
                  onClick={() => setGenPrompt("")}
                  title={t("mascots.clearPromptBtn")}
                >
                  <Trash size={14} />
                </button>
                <button
                  type="button"
                  className="quiet-button compact icon-only"
                  onClick={() => setIsPromptModalOpen(true)}
                  title={t("mascots.focusPromptTitle")}
                >
                  <ArrowsOutSimple size={14} />
                </button>
              </div>
            </div>

            {/* Quick AI Mascot Template Chips */}
            <div className="prompt-template-chips-bar">
              <span className="prompt-chips-label">{t("mascots.templatesLabel")}</span>
              <div className="prompt-chips-list">
                {PROMPT_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="prompt-template-chip"
                    onClick={() => onApplyTemplate(tpl)}
                    title={tpl.prompt}
                  >
                    {t(tpl.nameKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick AI Keyword Tags */}
            <div className="quick-tags-bar">
              <span className="prompt-chips-label">{t("mascots.quickTagsLabel")}</span>
              <div className="quick-tags-list">
                {QUICK_PROMPT_TAGS.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="quick-tag-chip"
                    onClick={() => onInjectTag(tag)}
                    title={`+ "${tag}"`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Expanded Textarea */}
            <div className="hero-prompt-textarea-wrap">
              <textarea
                id="mascot-prompt"
                rows={5}
                className="hero-prompt-textarea"
                placeholder={t("mascots.promptPlaceholder")}
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
              />
            </div>

            {/* Prompt Box Footer Stats */}
            <div className="hero-prompt-footer">
              <div className="hero-prompt-stats">
                <span>{t("mascots.charsCount", { count: genPrompt.length })}</span>
                <span>•</span>
                <span>
                  {t("mascots.wordsCount", {
                    count: genPrompt.trim() ? genPrompt.trim().split(/\s+/).length : 0,
                  })}
                </span>
              </div>
              {promptCopied ? <span className="prompt-copied-notice">{t("common.copied")}!</span> : null}
            </div>
          </div>

          {/* Collapsible Personality / Lore Notes */}
          <div className="notes-accordion-section">
            <button
              type="button"
              className="notes-accordion-toggle"
              onClick={() => setShowNotesAccordion((p) => !p)}
            >
              <div className="accordion-title-wrap">
                {showNotesAccordion ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
                <span>{t("mascots.notesAccordionTitle")}</span>
              </div>
              <small>{t("mascots.notesAccordionSub")}</small>
            </button>

            {showNotesAccordion ? (
              <div className="notes-accordion-body">
                <textarea
                  id="mascot-desc"
                  rows={3}
                  className="notes-textarea"
                  placeholder={t("mascots.descPlaceholder")}
                  value={genDescription}
                  onChange={(e) => setGenDescription(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          {/* Wizard Action CTA Row */}
          <div className="wizard-action-row" style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
            <button
              type="button"
              className="primary-button ai-magic-btn"
              style={{
                background: `linear-gradient(135deg, ${genColor} 0%, #0284c7 100%)`,
                boxShadow: `0 4px 20px ${genColor}45`,
              }}
              disabled={busyAction !== null || !genName.trim()}
              onClick={onGenerateConcept}
            >
              {busyAction === "concept" ? <CircleNotch className="spin" size={18} /> : <MagicWand size={18} weight="bold" />}
              <span>
                {busyAction === "concept"
                  ? `${t("mascots.generatingConceptBtn")} (${itemProgress}%)`
                  : t("mascots.generateConceptBtn")}
              </span>
            </button>

            <button
              type="button"
              className={`quiet-button ${editingMascot?.master_image_url ? "is-ready-forward" : ""}`}
              onClick={onNextStep}
              disabled={!editingMascot?.master_image_url || busyAction !== null}
              title={!editingMascot?.master_image_url ? "Vui lòng sinh hoặc tải lên Master Concept trước khi sang bước 2" : undefined}
            >
              <span>{t("mascots.nextStatesBtn")}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Master Preview Stage Box */}
      <div className="wizard-preview-col">
        <div className="wizard-card preview-card studio-preview-card">
          <div className="wizard-card-header-flex">
            <div>
              <h3>{t("mascots.masterPreviewTitle")}</h3>
              <p className="wizard-card-sub">{t("mascots.masterPreviewSub")}</p>
            </div>
            {editingMascot?.master_image_url && !busyAction ? (
              <button
                type="button"
                className="icon-button compact"
                onClick={() => setLightboxImage(editingMascot.master_image_url)}
                title={t("mascots.zoomPreviewBtn")}
              >
                <MagnifyingGlassPlus size={16} />
              </button>
            ) : null}
          </div>

          <div
            className="concept-preview-frame studio-stage-frame"
            style={{
              borderColor: busyAction === "concept" ? "var(--accent)" : editingMascot?.master_image_url ? genColor : undefined,
              boxShadow: busyAction === "concept"
                ? `0 0 28px var(--accent-glow)`
                : editingMascot?.master_image_url
                ? `0 16px 36px rgba(0, 0, 0, 0.4), 0 0 28px ${genColor}30`
                : "var(--shadow-sm)",
            }}
          >
            {busyAction === "concept" ? (
              <div className="concept-generating-overlay">
                <div className="concept-gen-holo-mesh" />
                <div className="concept-gen-laser-scan" />
                <div className="concept-gen-holo-orb">
                  <div className="concept-gen-ring-outer" />
                  <div className="concept-gen-ring-inner" />
                  <div className="concept-gen-core">
                    <Sparkle size={28} weight="fill" />
                  </div>
                </div>

                <div className="concept-gen-info-box">
                  <div className="concept-gen-header-row">
                    <span className="concept-gen-headline">
                      <CircleNotch className="spin" size={14} />
                      {t("mascots.globalGenTitleConcept")}
                    </span>
                    <span className="concept-gen-percent-badge">{itemProgress}%</span>
                  </div>

                  <div className="concept-gen-track">
                    <div className="mascot-gen-bar-fill" style={{ width: `${itemProgress}%` }} />
                  </div>

                  <p className="concept-gen-stage-label">{currentStageMessage}</p>

                  <div className="concept-gen-footer-row">
                    <span>⏱ {t("mascots.elapsedTimer", { seconds: Math.floor(generationElapsed) })}</span>
                    <span>{QUIZ_IMAGE_STYLE_LABELS[genStyle]}</span>
                  </div>
                </div>
              </div>
            ) : busyAction === "matting-master" ? (
              <div className="matting-active-overlay">
                <div className="matting-laser" />
                <CircleNotch className="spin" size={32} color="#a855f7" />
                <h4 style={{ color: "#fff", margin: 0, fontSize: "14px" }}>{t("mascots.mattingInProgress")}</h4>
                <p style={{ color: "#c084fc", fontSize: "12px", margin: 0 }}>{currentStageMessage}</p>
                <div className="concept-gen-track" style={{ width: "80%" }}>
                  <div className="mascot-gen-bar-fill" style={{ width: `${itemProgress}%`, backgroundColor: "#a855f7" }} />
                </div>
              </div>
            ) : editingMascot?.master_image_url ? (
              <div className="concept-preview-img-container" onClick={() => setLightboxImage(editingMascot.master_image_url)}>
                <img src={editingMascot.master_image_url} alt="Master Concept" className="concept-preview-img" />
                <div className="preview-hover-overlay">
                  <MagnifyingGlassPlus size={24} color="#fff" />
                  <span>{t("mascots.zoomPreviewBtn")}</span>
                </div>
              </div>
            ) : (
              <div className="concept-preview-placeholder studio-placeholder">
                <div className="placeholder-aura-glow" style={{ backgroundColor: `${genColor}20`, borderColor: `${genColor}40` }}>
                  <Smiley size={56} weight="duotone" style={{ color: genColor }} />
                </div>
                <h4>{t("mascots.masterPreviewTitle")}</h4>
                <p>{t("mascots.masterPreviewPlaceholder")}</p>
              </div>
            )}
          </div>

          {editingMascot?.master_image_url && !busyAction ? (
            <>
              <div className="concept-meta-box modern-meta-box">
                <div className="concept-meta-item">
                  <span>{t("common.status")}:</span>
                  <strong style={{ color: "var(--green)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle size={14} weight="fill" /> {t("mascots.statusIdentityLocked")}
                  </strong>
                </div>
                <div className="concept-meta-item">
                  <span>{t("mascots.statusStyle")}</span>
                  <strong>{QUIZ_IMAGE_STYLE_LABELS[editingMascot.visual_style]}</strong>
                </div>
              </div>

              <div className="master-action-buttons-row" style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" }}>
                <button
                  type="button"
                  className="quiet-button compact"
                  disabled={busyAction !== null}
                  onClick={() => onRemoveBackground("master")}
                  style={{ justifyContent: "center" }}
                  title={t("mascots.mattingMasterBtn")}
                >
                  {busyAction === "matting-master" ? <CircleNotch className="spin" size={14} /> : <PaintBrush size={14} />}
                  <span>{busyAction === "matting-master" ? t("mascots.mattingInProgress") : t("mascots.mattingMasterBtn")}</span>
                </button>

                <a
                  href={editingMascot.master_image_url}
                  download={`${editingMascot.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_master.png`}
                  className="icon-button"
                  title={t("common.download")}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                >
                  <DownloadSimple size={15} />
                </a>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Fullscreen Prompt Focus Modal */}
      {isPromptModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsPromptModalOpen(false)}>
          <section
            className="modal prompt-focus-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Sparkle size={20} weight="fill" style={{ color: genColor }} />
                <h2 style={{ fontSize: "16px", margin: 0 }}>{t("mascots.focusPromptTitle")}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setIsPromptModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="prompt-modal-body" style={{ padding: "16px 20px" }}>
              <div className="quick-tags-bar" style={{ marginBottom: "12px" }}>
                <span className="prompt-chips-label">{t("mascots.quickTagsLabel")}</span>
                <div className="quick-tags-list">
                  {QUICK_PROMPT_TAGS.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="quick-tag-chip"
                      onClick={() => onInjectTag(tag)}
                    >
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

              <div className="hero-prompt-footer" style={{ marginTop: "10px" }}>
                <div className="hero-prompt-stats">
                  <span>{t("mascots.charsCount", { count: genPrompt.length })}</span>
                  <span>•</span>
                  <span>
                    {t("mascots.wordsCount", {
                      count: genPrompt.trim() ? genPrompt.trim().split(/\s+/).length : 0,
                    })}
                  </span>
                </div>
              </div>
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
