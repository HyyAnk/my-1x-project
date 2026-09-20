import { useMemo, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { findBuiltInPresetById, type MascotProfile, type MascotStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { useMascotStyles } from "../hooks/useMascotStyles";
import { MascotStyleAnchorHeader } from "./MascotStyleAnchorHeader";
import { MascotStyleAnchorCanvas } from "./MascotStyleAnchorCanvas";
import { MascotStyleAnchorActions } from "./MascotStyleAnchorActions";
import { MascotStyleConceptPrompt } from "./MascotStyleConceptPrompt";
import {
  isCoreStyle,
  isUploadedConcept,
  resolveAnchorImageUrl,
  resolveRawImageUrl,
  parseKeywordsList,
  countFilledPoses,
  sanitizeIdentifier,
} from "../utils/mascotStyleAnchorHelpers";

export type MascotStyleAnchorCardState = Pick<
  ReturnType<typeof useMascotStyles>,
  | "generatingConceptStyleId"
  | "activeStyleIds"
  | "queuedStyleIds"
  | "handleQueueStyle"
  | "handleGenerateStyleConcept"
  | "handleUpdateStyle"
  | "handleDeleteStyle"
>;

export interface MascotStyleAnchorCardProps {
  style: MascotStyle;
  editingMascot: MascotProfile;
  stylesState?: MascotStyleAnchorCardState;
  onOpenLightbox?: (url: string) => void;
}

export function MascotStyleAnchorCard({ style, editingMascot, stylesState, onOpenLightbox }: MascotStyleAnchorCardProps) {
  const { t } = useTranslation();
  const [conceptPrompt, setConceptPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCore = isCoreStyle(style);
  const isUploaded = isUploadedConcept(editingMascot);
  const imageUrl = resolveAnchorImageUrl(style, editingMascot);

  const isThisGenerating =
    isSubmitting || stylesState?.generatingConceptStyleId === style.id || Boolean(stylesState?.activeStyleIds?.includes(style.id));
  const isThisQueued = Boolean(stylesState?.queuedStyleIds?.includes(style.id));
  const queuePosition = stylesState?.queuedStyleIds ? stylesState.queuedStyleIds.indexOf(style.id) + 1 : 0;
  const canGenerate = Boolean(stylesState?.handleQueueStyle || stylesState?.handleGenerateStyleConcept);
  const isCardActionLocked = isThisGenerating || isThisQueued || Boolean(stylesState?.generatingConceptStyleId) || !canGenerate;
  const hasImage = Boolean(imageUrl);
  const builtInPreset = findBuiltInPresetById(style.built_in_preset_id);
  const isManaged = Boolean(style.built_in_preset_id);

  const keywordsList = useMemo(() => parseKeywordsList(style.keyword, isCore), [isCore, style.keyword]);
  const filledPosesCount = useMemo(() => countFilledPoses(style.states), [style.states]);
  const sanitizedMascotName = useMemo(() => sanitizeIdentifier(editingMascot?.name, "mascot"), [editingMascot?.name]);
  const sanitizedStyleName = useMemo(() => sanitizeIdentifier(style.name || style.id), [style.name, style.id]);
  const rawImageUrl = useMemo(() => resolveRawImageUrl(style, editingMascot), [style, editingMascot]);

  const handleGenerate = () => {
    if (isCardActionLocked) return;
    const prompt = conceptPrompt.trim() || undefined;
    const request = stylesState?.handleQueueStyle
      ? stylesState.handleQueueStyle(style.id, prompt)
      : stylesState?.handleGenerateStyleConcept(style.id, prompt);
    if (!request) return;

    setIsSubmitting(true);
    void request.then(
      () => setIsSubmitting(false),
      () => setIsSubmitting(false),
    );
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
        builtInPresetName={builtInPreset?.name}
        isBusy={isCardActionLocked}
        onRename={stylesState ? (name) => stylesState.handleUpdateStyle(style.id, { name }) : undefined}
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
        <div className="style-anchor-uploaded-ref-hint" title={t("mascots.customStyleUploadedAnchorTooltip")}>
          <Sparkle size={12} weight="fill" />
          <span>{t("mascots.customStyleUploadedAnchorHint")}</span>
        </div>
      ) : null}

      {!isCore ? (
        <MascotStyleConceptPrompt styleName={style.name} value={conceptPrompt} disabled={isCardActionLocked} onChange={setConceptPrompt} />
      ) : null}

      <MascotStyleAnchorActions
        isCore={isCore}
        isManaged={isManaged}
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
