import { useState, useEffect } from "react";
import { Trash, Lightning, Check, CircleNotch } from "@phosphor-icons/react";
import { MASCOT_STYLE_CONCEPT_PROMPT_MAX_LENGTH, findBuiltInPresetById, type MascotProfile, type MascotStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import type { useMascotStyles } from "../hooks/useMascotStyles";
import { StyleAnchorReferencePin } from "./StyleAnchorReferencePin";

export type MascotStyleHeaderProps = {
  resolvedActiveStyle: MascotStyle | null;
  editingMascot: MascotProfile | null;
  stylesState: ReturnType<typeof useMascotStyles>;
  totalFilledCount: number;
  totalSlots: number;
  isCoreStyle: boolean;
  isBatchBusy: boolean;
  busySlotKey: string | null;
  onOpenLightbox?: (img: string) => void;
};

export function MascotStyleHeader({
  resolvedActiveStyle,
  editingMascot,
  stylesState,
  totalFilledCount,
  totalSlots,
  isCoreStyle,
  isBatchBusy,
  busySlotKey,
  onOpenLightbox,
}: MascotStyleHeaderProps) {
  const { t } = useTranslation();
  const { handleUpdateStyleKeyword, handleDeleteStyle, handleBatchGenerateStyle } = stylesState;
  const builtInPreset = findBuiltInPresetById(resolvedActiveStyle?.built_in_preset_id);
  const isManagedStyle = Boolean(resolvedActiveStyle?.built_in_preset_id);

  const [keywordInput, setKeywordInput] = useState<string>(resolvedActiveStyle?.keyword || "");
  const [isSavingKeyword, setIsSavingKeyword] = useState<boolean>(false);

  useEffect(() => {
    setKeywordInput(resolvedActiveStyle?.keyword || "");
  }, [resolvedActiveStyle?.id, resolvedActiveStyle?.keyword]);

  const handleSaveKeyword = async () => {
    if (!resolvedActiveStyle) return;
    setIsSavingKeyword(true);
    try {
      await handleUpdateStyleKeyword(resolvedActiveStyle.id, keywordInput.trim());
    } finally {
      setIsSavingKeyword(false);
    }
  };

  const handleDeleteActiveStyle = async () => {
    if (isCoreStyle || !resolvedActiveStyle) return;
    const confirmed = window.confirm(t("mascots.deleteStyleConfirm"));
    if (confirmed) {
      await handleDeleteStyle(resolvedActiveStyle.id);
    }
  };

  return (
    <>
      <div className="active-style-banner">
        <div className="active-style-banner-top">
          <div className="active-style-info-col">
            <div className="active-style-title-row">
              <h4 className="active-style-name">{resolvedActiveStyle?.name}</h4>
              <span className={`style-type-badge ${isCoreStyle ? "is-core" : "is-custom"}`}>
                {isCoreStyle ? "Default Style" : isManagedStyle ? "Built-in Style" : "Legacy Style"}
              </span>
              {builtInPreset ? <span className="style-type-badge is-custom">Preset · {builtInPreset.name}</span> : null}
              <span className="style-completion-badge">
                {totalFilledCount}/{totalSlots} slots generated
              </span>
            </div>
          </div>

          <div className="active-style-actions-col">
            <button
              type="button"
              className="primary-button is-batch-generate"
              onClick={() => handleBatchGenerateStyle("all")}
              disabled={isBatchBusy || busySlotKey !== null}
              title="Generate all empty slots in this style"
            >
              {isBatchBusy ? (
                <>
                  <CircleNotch size={15} className="spin" />
                  <span>Generating All Slots...</span>
                </>
              ) : (
                <>
                  <Lightning size={15} weight="fill" />
                  <span>Generate Full Style</span>
                </>
              )}
            </button>

            {!isManagedStyle ? (
              <button
                type="button"
                className="quiet-button is-delete-style"
                onClick={handleDeleteActiveStyle}
                disabled={busySlotKey !== null}
                title="Delete this custom style"
                aria-label="Delete style"
              >
                <Trash size={15} />
                <span>Delete Style</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Style prompt input row */}
        <div className="active-style-keyword-box">
          <div className="keyword-input-wrap">
            <label htmlFor="active-style-keyword-input" className="keyword-field-label">
              Style Prompt
            </label>
            <input
              id="active-style-keyword-input"
              type="text"
              className="style-keyword-input"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Describe exactly what to add or change"
              maxLength={MASCOT_STYLE_CONCEPT_PROMPT_MAX_LENGTH}
              disabled={busySlotKey !== null || isSavingKeyword}
            />
          </div>
          <button
            type="button"
            className="save-keyword-btn"
            onClick={handleSaveKeyword}
            disabled={keywordInput === (resolvedActiveStyle?.keyword || "") || isSavingKeyword || busySlotKey !== null}
            title="Save prompt updates"
          >
            {isSavingKeyword ? <CircleNotch size={14} className="spin" /> : <Check size={14} weight="bold" />}
            <span>Save Prompt</span>
          </button>
        </div>
      </div>

      {/* Style Visual Anchor Reference Pin */}
      <StyleAnchorReferencePin
        style={resolvedActiveStyle}
        editingMascot={editingMascot}
        stylesState={stylesState}
        onOpenLightbox={onOpenLightbox}
      />
    </>
  );
}
