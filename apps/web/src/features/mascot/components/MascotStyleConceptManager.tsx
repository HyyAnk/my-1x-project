import { useMemo } from "react";
import { Plus, Sparkle } from "@phosphor-icons/react";
import {
  type MascotProfile,
  type MascotStyle,
  synthesizeLegacyCoreStyle,
} from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { useMascotStyles } from "../hooks/useMascotStyles";
import { MascotStyleAnchorCard } from "./MascotStyleAnchorCard";
import { StyleCreateModal } from "./StyleCreateModal";

export interface MascotStyleConceptManagerProps {
  editingMascot: MascotProfile;
  stylesState?: ReturnType<typeof useMascotStyles>;
  onOpenLightbox?: (imgUrl: string) => void;
}

export function MascotStyleConceptManager({
  editingMascot,
  stylesState,
  onOpenLightbox,
}: MascotStyleConceptManagerProps) {
  const { t } = useTranslation();

  const allStyles: MascotStyle[] = useMemo(() => {
    const rawStyles =
      editingMascot?.styles && editingMascot.styles.length > 0
        ? [...editingMascot.styles]
        : [];
    const hasCore = rawStyles.some((s) => s.id === "core" || s.is_default);
    if (!hasCore) {
      rawStyles.unshift(synthesizeLegacyCoreStyle(editingMascot));
    }
    return rawStyles;
  }, [editingMascot]);

  return (
    <div className="wizard-card style-concept-manager-card">
      <div className="style-concept-manager-header">
        <div className="style-concept-manager-info">
          <div className="style-concept-title-row">
            <Sparkle size={18} weight="fill" className="style-concept-header-icon" />
            <h3 className="style-concept-title">{t("mascots.styleConceptsTitle")}</h3>
          </div>
          <p className="style-concept-subtitle">{t("mascots.styleConceptsSubtitle")}</p>
        </div>

        {stylesState ? (
          <button
            type="button"
            className="quiet-button compact style-concept-add-btn"
            onClick={() => stylesState.setIsCreateModalOpen(true)}
            title={t("mascots.addStyleBtn")}
          >
            <Plus size={14} weight="bold" />
            <span>{t("mascots.addStyleBtn")}</span>
          </button>
        ) : null}
      </div>

      <div className="style-anchor-cards-grid">
        {allStyles.map((style) => (
          <MascotStyleAnchorCard
            key={style.id}
            style={style}
            editingMascot={editingMascot}
            stylesState={stylesState}
            onOpenLightbox={onOpenLightbox}
          />
        ))}

        {stylesState ? (
          <button
            type="button"
            className="style-anchor-card style-anchor-card-add-new"
            onClick={() => stylesState.setIsCreateModalOpen(true)}
            title={t("mascots.addStyleBtn")}
          >
            <div className="style-anchor-add-new-inner">
              <div className="style-anchor-add-icon-circle">
                <Plus size={22} weight="bold" />
              </div>
              <span className="style-anchor-add-title">{t("mascots.addStyleBtn")}</span>
              <span className="style-anchor-add-desc">{t("mascots.addStyleCardDesc")}</span>
            </div>
          </button>
        ) : null}
      </div>

      {stylesState ? (
        <StyleCreateModal
          isOpen={stylesState.isCreateModalOpen}
          onClose={() => stylesState.setIsCreateModalOpen(false)}
          onCreate={stylesState.handleCreateStyle}
        />
      ) : null}
    </div>
  );
}
