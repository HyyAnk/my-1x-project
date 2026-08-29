import { CheckCircle, CircleNotch } from "@phosphor-icons/react";
import type { useStageStudio } from "../hooks/useStageStudio";

type StageStudioFooterProps = {
  studio: ReturnType<typeof useStageStudio>;
  onClose: () => void;
};

export function StageStudioFooter({ studio, onClose }: StageStudioFooterProps) {
  const { t, isSingleChannelMode, targetChannel, position, scale, offsetX, offsetY, selectedChannelIds, saving, handleSave } = studio;

  return (
    <footer className="stage-studio-footer">
      {/* Sleek Minimal Status Readout */}
      <div className="stage-footer-summary">
        <span className="stage-status-dot" />
        <span className="stage-status-text">
          {isSingleChannelMode && targetChannel
            ? targetChannel.display_name || targetChannel.slug
            : t("stageStudio.channelsSummaryCount", { count: selectedChannelIds.length })}
        </span>
        <span className="stage-status-divider">•</span>
        <span className="stage-status-details">
          {position === "bottom_left" ? t("stageStudio.leftBadge") : t("stageStudio.rightBadge")} · {Math.round(scale * 100)}% · X:{" "}
          {offsetX > 0 ? `+${offsetX}` : offsetX}px, Y: {offsetY > 0 ? `+${offsetY}` : offsetY}px
        </span>
      </div>

      <div className="stage-studio-credit" aria-label="Development and design credit">
        <span className="stage-studio-credit-full">Develop - Design - Deliver by HyyAnk | Dư Ngọc Minh Hoàng</span>
        <span className="stage-studio-credit-mobile">HyyAnk | Dư Ngọc Minh Hoàng</span>
      </div>

      {/* Action Buttons */}
      <div className="stage-footer-actions">
        <button type="button" className="quiet-button stage-cancel-btn" onClick={onClose} disabled={saving}>
          <span>{t("common.cancel")}</span>
        </button>

        <button type="button" className="primary-button stage-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? <CircleNotch className="spin" size={15} /> : <CheckCircle size={15} weight="fill" />}
          <span>{saving ? t("common.saving") : t("stageStudio.saveAndApplyBtn")}</span>
        </button>
      </div>
    </footer>
  );
}
