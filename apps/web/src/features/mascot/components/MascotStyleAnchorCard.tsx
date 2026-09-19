import { useMemo } from "react";
import { Sparkle } from "@phosphor-icons/react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { useMascotStyles } from "../hooks/useMascotStyles";
import { MascotStyleAnchorHeader } from "./MascotStyleAnchorHeader";
import { MascotStyleAnchorCanvas } from "./MascotStyleAnchorCanvas";
import { MascotStyleAnchorActions } from "./MascotStyleAnchorActions";
import {
  isCoreStyle,
  isUploadedConcept,
  resolveAnchorImageUrl,
  resolveRawImageUrl,
  parseKeywordsList,
  countFilledPoses,
  sanitizeIdentifier,
} from "../utils/mascotStyleAnchorHelpers";

export interface MascotStyleAnchorCardProps {
  style: MascotStyle;
  editingMascot: MascotProfile;
  stylesState?: ReturnType<typeof useMascotStyles>;
  onOpenLightbox?: (url: string) => void;
}

export function MascotStyleAnchorCard({ style, editingMascot, stylesState, onOpenLightbox }: MascotStyleAnchorCardProps) {
  const { t } = useTranslation();
  const isCore = isCoreStyle(style);
  const isUploaded = isUploadedConcept(editingMascot);
  const imageUrl = resolveAnchorImageUrl(style, editingMascot);

  const isThisGenerating = stylesState?.generatingConceptStyleId === style.id || Boolean(stylesState?.activeStyleIds?.includes(style.id));
  const isThisQueued = Boolean(stylesState?.queuedStyleIds?.includes(style.id));
  const queuePosition = stylesState?.queuedStyleIds ? stylesState.queuedStyleIds.indexOf(style.id) + 1 : 0;
  const isCardActionLocked = isThisGenerating || isThisQueued || Boolean(stylesState?.generatingConceptStyleId);
  const hasImage = Boolean(imageUrl);

  const keywordsList = useMemo(() => parseKeywordsList(style.keyword, isCore), [isCore, style.keyword]);
  const filledPosesCount = useMemo(() => countFilledPoses(style.states), [style.states]);
  const sanitizedMascotName = useMemo(() => sanitizeIdentifier(editingMascot?.name, "mascot"), [editingMascot?.name]);
  const sanitizedStyleName = useMemo(() => sanitizeIdentifier(style.name || style.id), [style.name, style.id]);
  const rawImageUrl = useMemo(() => resolveRawImageUrl(style, editingMascot), [style, editingMascot]);

  const handleGenerate = () => {
    if (stylesState?.handleQueueStyle) {
      void stylesState.handleQueueStyle(style.id);
    } else {
      void stylesState?.handleGenerateStyleConcept(style.id);
    }
  };
  const handleDelete = () => {
    if (window.confirm(t("mascots.deleteStyleConfirm"))) void stylesState?.handleDeleteStyle(style.id);
  };

  return (
    <div
      className={`style-anchor-card ${isCore ? "is-core" : "is-custom"} ${hasImage ? "has-anchor" : "missing-anchor"} ${isThisGenerating ? "is-generating" : ""} ${isThisQueued ? "is-queued" : ""}`}
      data-style-id={style.id}
    >
      <MascotStyleAnchorHeader
        style={style}
        isCore={isCore}
        hasImage={hasImage}
        keywordsList={keywordsList}
        filledPosesCount={filledPosesCount}
        isGenerating={isThisGenerating}
        isQueued={isThisQueued}
        queuePosition={queuePosition}
        isUploadedConcept={isUploaded}
      />

      <MascotStyleAnchorCanvas
        style={style}
        imageUrl={imageUrl}
        rawImageUrl={rawImageUrl}
        sanitizedMascotName={sanitizedMascotName}
        sanitizedStyleName={sanitizedStyleName}
        hasImage={hasImage}
        isThisGenerating={isThisGenerating}
        isBusy={isCardActionLocked}
        isCore={isCore}
        isUploadedConcept={isUploaded}
        onOpenLightbox={onOpenLightbox}
        onGenerate={handleGenerate}
      />

      {!isCore && isUploaded ? (
        <div
          className="style-anchor-uploaded-ref-hint"
          title={t("mascots.customStyleUploadedAnchorTooltip")}
        >
          <Sparkle size={12} weight="fill" />
          <span>{t("mascots.customStyleUploadedAnchorHint")}</span>
        </div>
      ) : null}

      <MascotStyleAnchorActions
        isCore={isCore}
        hasImage={hasImage}
        isThisGenerating={isThisGenerating}
        isThisQueued={isThisQueued}
        isCardActionLocked={isCardActionLocked}
        queuePosition={queuePosition}
        isUploadedConcept={isUploaded}
        onGenerate={handleGenerate}
        onDelete={handleDelete}
      />
    </div>
  );
}
