import { MagicWand, X } from "@phosphor-icons/react";
import type { MascotActionType } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { getLocalizedActionMeta } from "../constants";

export interface ActionPromptModalProps {
  promptEditAction: MascotActionType | null;
  setPromptEditAction: (action: MascotActionType | null) => void;
  actionPrompts: Record<MascotActionType, string>;
  setActionPrompts: React.Dispatch<React.SetStateAction<Record<MascotActionType, string>>>;
  onGenerateSprite: (action: MascotActionType) => void;
}

export function ActionPromptModal({
  promptEditAction,
  setPromptEditAction,
  actionPrompts,
  setActionPrompts,
  onGenerateSprite,
}: ActionPromptModalProps) {
  const { t } = useTranslation();

  if (!promptEditAction) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => setPromptEditAction(null)}>
      <section className="modal" role="dialog" aria-modal="true" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{t("mascots.customPromptEyebrow")}</p>
            <h2>{getLocalizedActionMeta(promptEditAction, t).label}</h2>
          </div>
          <button type="button" className="icon-button" aria-label={t("common.close")} onClick={() => setPromptEditAction(null)}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ marginTop: "16px" }}>
          <div className="form-group">
            <label>{t("mascots.customPromptLabel")}</label>
            <textarea
              className="full-prompt-textarea"
              rows={4}
              value={actionPrompts[promptEditAction]}
              onChange={(e) => setActionPrompts((prev) => ({ ...prev, [promptEditAction]: e.target.value }))}
              placeholder={getLocalizedActionMeta(promptEditAction, t).description}
              style={{ width: "100%", fontSize: "13px", resize: "vertical" }}
            />
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button type="button" className="quiet-button" onClick={() => setPromptEditAction(null)}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              const act = promptEditAction;
              setPromptEditAction(null);
              if (act) onGenerateSprite(act);
            }}
          >
            <MagicWand size={16} />
            <span>{t("mascots.saveAndRegenerateBtn")}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
