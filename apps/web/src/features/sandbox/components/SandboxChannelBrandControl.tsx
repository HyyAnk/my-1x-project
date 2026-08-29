import type React from "react";
import { CHANNEL_BRAND_NAME_MAX_LENGTH } from "@studio/shared";
import { useTranslation } from "../../../i18n";

export interface SandboxChannelBrandControlProps {
  channelBrandName: string;
  setChannelBrandName: (name: string) => void;
  disabled?: boolean;
}

export function SandboxChannelBrandControl({ channelBrandName, setChannelBrandName, disabled = false }: SandboxChannelBrandControlProps) {
  const { t } = useTranslation();

  return (
    <div>
      <label
        htmlFor="sandbox-channel-brand-name-input"
        style={{
          display: "block",
          fontSize: "11px",
          fontWeight: 700,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "6px",
        }}
      >
        {t("episodeCustomization.channelNameLabel")}
      </label>
      <input
        id="sandbox-channel-brand-name-input"
        type="text"
        value={channelBrandName}
        maxLength={CHANNEL_BRAND_NAME_MAX_LENGTH}
        placeholder={t("episodeCustomization.channelNamePlaceholder")}
        onChange={(e) => setChannelBrandName(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        style={{
          width: "100%",
          height: "36px",
          padding: "6px 12px",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          color: "var(--ink)",
          fontSize: "13px",
          fontWeight: 600,
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.15s ease, background 0.15s ease",
        }}
      />
    </div>
  );
}
