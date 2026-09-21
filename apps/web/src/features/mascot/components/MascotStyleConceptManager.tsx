import { useMemo } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { reconcileMascotBuiltInStyles, type MascotProfile, type MascotStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { useMascotStyles } from "../hooks/useMascotStyles";
import { MascotStyleAnchorCard } from "./MascotStyleAnchorCard";
import { MascotStyleQueueProgressCard } from "./MascotStyleQueueProgressCard";

export interface MascotStyleConceptManagerProps {
  editingMascot: MascotProfile;
  stylesState?: ReturnType<typeof useMascotStyles>;
  onOpenLightbox?: (imgUrl: string) => void;
}

export function MascotStyleConceptManager({ editingMascot, stylesState, onOpenLightbox }: MascotStyleConceptManagerProps) {
  const { t } = useTranslation();

  const allStyles: MascotStyle[] = useMemo(() => {
    return reconcileMascotBuiltInStyles(editingMascot).styles ?? [];
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
      </div>

      {editingMascot?.concept_origin === "user_uploaded" ? (
        <div className="style-concept-uploaded-banner" role="status">
          <Sparkle size={15} weight="fill" className="uploaded-banner-icon" />
          <span>{t("mascots.derivedFromUploadedMasterNotice")}</span>
        </div>
      ) : null}

      {stylesState?.styleQueueProgress ? (
        <MascotStyleQueueProgressCard
          styleQueueProgress={stylesState.styleQueueProgress}
          onStopQueue={() => void stylesState.handleStopStyleQueue()}
          onRetryFailed={() => void stylesState.handleRetryFailedStyles()}
        />
      ) : null}

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
      </div>
    </div>
  );
}
