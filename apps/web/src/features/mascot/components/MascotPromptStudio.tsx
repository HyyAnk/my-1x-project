import { ArrowsOutSimple, CaretDown, CaretRight, Check, Copy, Trash } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";
import { PROMPT_TEMPLATES, QUICK_PROMPT_TAGS } from "../constants";

export interface MascotPromptStudioProps {
  genColor: string;
  genPrompt: string;
  setGenPrompt: (prompt: string) => void;
  genDescription: string;
  setGenDescription: (desc: string) => void;
  promptCopied: boolean;
  showNotesAccordion: boolean;
  setShowNotesAccordion: React.Dispatch<React.SetStateAction<boolean>>;
  onCopyPrompt: () => void;
  onInjectTag: (tag: string) => void;
  onApplyTemplate: (tpl: (typeof PROMPT_TEMPLATES)[0]) => void;
  onOpenPromptModal: () => void;
}

export function MascotPromptStudio({
  genColor,
  genPrompt,
  setGenPrompt,
  genDescription,
  setGenDescription,
  promptCopied,
  showNotesAccordion,
  setShowNotesAccordion,
  onCopyPrompt,
  onInjectTag,
  onApplyTemplate,
  onOpenPromptModal,
}: MascotPromptStudioProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* HERO PROMPT STUDIO */}
      <div className="hero-prompt-studio-box" style={{ borderColor: `${genColor}35` }}>
        <div className="hero-prompt-header">
          <label htmlFor="mascot-prompt" className="hero-prompt-label">
            {t("mascots.promptLabel")}
          </label>

          <div className="hero-prompt-actions">
            <button type="button" className="quiet-button compact icon-only" onClick={onCopyPrompt} title={t("mascots.copyPromptBtn")}>
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
              onClick={onOpenPromptModal}
              title={t("mascots.focusPromptTitle")}
            >
              <ArrowsOutSimple size={14} />
            </button>
          </div>
        </div>

        {/* Quick AI Mascot Template Chips */}
        <div className="prompt-template-chips-bar">
          <div className="prompt-chips-list">
            {PROMPT_TEMPLATES.map((tpl, idx) => (
              <button key={idx} type="button" className="prompt-template-chip" onClick={() => onApplyTemplate(tpl)} title={tpl.prompt}>
                {t(tpl.nameKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Quick AI Keyword Tags */}
        <div className="quick-tags-bar">
          <div className="quick-tags-list">
            {QUICK_PROMPT_TAGS.map((tag, idx) => (
              <button key={idx} type="button" className="quick-tag-chip" onClick={() => onInjectTag(tag)}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Expanded Textarea */}
        <div className="hero-prompt-textarea-wrap">
          <textarea
            id="mascot-prompt"
            rows={4}
            className="hero-prompt-textarea"
            placeholder={t("mascots.promptPlaceholder")}
            value={genPrompt}
            onChange={(e) => setGenPrompt(e.target.value)}
          />
        </div>
      </div>

      {/* Collapsible Personality / Lore Notes */}
      <div className="notes-accordion-section">
        <button type="button" className="notes-accordion-toggle" onClick={() => setShowNotesAccordion((p) => !p)}>
          <div className="accordion-title-wrap">
            {showNotesAccordion ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
            <span>{t("mascots.notesAccordionTitle")}</span>
          </div>
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
    </>
  );
}
