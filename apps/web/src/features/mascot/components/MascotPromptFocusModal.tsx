import { Check, X } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";
import { QUICK_PROMPT_TAGS } from "../constants";

export interface MascotPromptFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  genPrompt: string;
  setGenPrompt: (prompt: string) => void;
  onInjectTag: (tag: string) => void;
}

export function MascotPromptFocusModal({ isOpen, onClose, genPrompt, setGenPrompt, onInjectTag }: MascotPromptFocusModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal prompt-focus-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <h2 style={{ fontSize: "16px", margin: 0 }}>{t("mascots.focusPromptTitle")}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t("common.close")}>
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
          <button type="button" className="primary-button" onClick={onClose}>
            <Check size={16} />
            <span>{t("common.saved")}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
