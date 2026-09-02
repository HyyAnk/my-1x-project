import { ArrowCounterClockwise, Check, DotsSixVertical } from "@phosphor-icons/react";
import { useTranslation } from "../../i18n";

export type ChannelReorderBannerProps = {
  onDone: () => void;
  onReset: () => void;
  hasCustomOrder: boolean;
};

export function ChannelReorderBanner({ onDone, onReset, hasCustomOrder }: ChannelReorderBannerProps) {
  const { t } = useTranslation();

  return (
    <div className="channel-reorder-banner">
      <div className="channel-reorder-banner-left">
        <span className="channel-reorder-badge">
          <DotsSixVertical size={16} weight="bold" />
          <span>{t("channels.reorderingActive")}</span>
        </span>
        <span className="channel-reorder-hint">{t("channels.reorderHint")}</span>
      </div>

      <div className="channel-reorder-banner-right">
        {hasCustomOrder ? (
          <button type="button" className="quiet-button is-compact" onClick={onReset} title={t("channels.resetOrder")}>
            <ArrowCounterClockwise size={14} />
            <span>{t("channels.resetOrder")}</span>
          </button>
        ) : null}

        <button type="button" className="primary-button is-compact" onClick={onDone}>
          <Check size={14} weight="bold" />
          <span>{t("channels.doneReordering")}</span>
        </button>
      </div>
    </div>
  );
}
