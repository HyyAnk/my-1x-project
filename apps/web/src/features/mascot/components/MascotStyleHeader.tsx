import { useState, useEffect } from "react";
import {
  Trash,
  Lightning,
  Check,
  CircleNotch,
} from "@phosphor-icons/react";
import type { MascotProfile, MascotStyle } from "@studio/shared";
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
  const {
    handleUpdateStyleKeyword,
    handleDeleteStyle,
    handleBatchGenerateStyle,
  } = stylesState;

  const [keywordInput, setKeywordInput] = useState<string>(
    resolvedActiveStyle?.keyword || "",
  );
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
              <h4 className="active-style-name">
                {resolvedActiveStyle?.is_default || resolvedActiveStyle?.id === "core"
                  ? "Core Style (Default)"
                  : resolvedActiveStyle?.name}
              </h4>
              <span className={`style-type-badge ${isCoreStyle ? "is-core" : "is-custom"}`}>
                {isCoreStyle ? "Default Style" : "Custom Style"}
              </span>
              <span className="style-completion-badge">
                {totalFilledCount}/{totalSlots} slots generated
              </span>
            </div>
            <p className="active-style-description">
              {isCoreStyle
                ? "Default mascot visual identity and signature wardrobe."
                : "Custom wardrobe and thematic styling for this character."}
            </p>
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

            {!isCoreStyle ? (
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

        {/* Style Keyword Input Row */}
        <div className="active-style-keyword-box">
          <div className="keyword-input-wrap">
            <label htmlFor="active-style-keyword-input" className="keyword-field-label">
              Style Theme Keyword:
            </label>
            <input
              id="active-style-keyword-input"
              type="text"
              className="style-keyword-input"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="e.g., tactical military camouflage uniform, beret, tactical gear"
              disabled={busySlotKey !== null || isSavingKeyword}
            />
          </div>
          <button
            type="button"
            className="save-keyword-btn"
            onClick={handleSaveKeyword}
            disabled={
              keywordInput === (resolvedActiveStyle?.keyword || "") ||
              isSavingKeyword ||
              busySlotKey !== null
            }
            title="Save keyword updates"
          >
            {isSavingKeyword ? (
              <CircleNotch size={14} className="spin" />
            ) : (
              <Check size={14} weight="bold" />
            )}
            <span>Save Keyword</span>
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
