import { ArrowClockwise, CircleNotch, FloppyDisk, Link, Palette } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";

export interface SandboxHeaderProps {
  hasChannels: boolean;
  loading: boolean;
  onOpenPresetModal: () => void;
  onOpenChannelSyncModal: () => void;
  onRerender: () => void;
}

export function SandboxHeader({ hasChannels, loading, onOpenPresetModal, onOpenChannelSyncModal, onRerender }: SandboxHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="section-heading sandbox-header" style={{ marginBottom: "10px", flexShrink: 0, padding: "4px 0" }}>
      <div>
        <h1 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "19px" }}>
          <Palette size={22} weight="duotone" color="var(--accent)" />
          <span>{t("visualSandbox.pageTitle")}</span>
        </h1>
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {/* Save Preset Button */}
        <button type="button" className="quiet-button compact" onClick={onOpenPresetModal} title={t("visualSandbox.savePresetTooltip")}>
          <FloppyDisk size={15} weight="bold" />
          <span>{t("visualSandbox.savePresetBtn")}</span>
        </button>

        {/* Apply to Channel Button */}
        {hasChannels && (
          <button
            type="button"
            className="quiet-button compact"
            onClick={onOpenChannelSyncModal}
            title={t("visualSandbox.applyToChannelTooltip")}
            style={{ color: "var(--accent)" }}
          >
            <Link size={15} weight="bold" />
            <span>{t("visualSandbox.applyToChannelBtn")}</span>
          </button>
        )}

        {/* Re-render Button */}
        <button
          type="button"
          className="primary-button compact"
          disabled={loading}
          onClick={onRerender}
          title={t("visualSandbox.rerenderTooltip")}
        >
          {loading ? <CircleNotch className="spin" size={15} /> : <ArrowClockwise size={15} weight="bold" />}
          <span>{t("visualSandbox.rerenderBtn")}</span>
        </button>
      </div>
    </div>
  );
}
