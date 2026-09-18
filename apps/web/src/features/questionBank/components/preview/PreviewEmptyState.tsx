import { Sparkle } from "@phosphor-icons/react";
import { useTranslation } from "../../../../i18n";

export function PreviewEmptyState() {
  const { t } = useTranslation();

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
