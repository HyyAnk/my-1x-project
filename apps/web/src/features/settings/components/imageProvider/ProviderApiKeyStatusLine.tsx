import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { StatusLine } from "../../../../components/AppChrome";

export interface ProviderApiKeyStatusLineProps {
  label?: string;
  hasApiKey: boolean;
}

export function ProviderApiKeyStatusLine({
  label = "API Key Status",
  hasApiKey,
}: ProviderApiKeyStatusLineProps) {
  return (
    <StatusLine
      label={label}
      value={
        hasApiKey ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--green)", fontWeight: 700 }}>
            <CheckCircle weight="fill" size={14} /> Configured & Active
          </span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--muted)", fontWeight: 600 }}>
            <XCircle size={14} /> Not configured
          </span>
        )
      }
    />
  );
}
