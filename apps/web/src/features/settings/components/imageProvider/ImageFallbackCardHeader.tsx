import { ShieldCheck } from "@phosphor-icons/react";
import { resolveImgStudioModelName } from "@studio/shared";
import { StatusLine } from "../../../../components/AppChrome";
import { ProviderApiKeyStatusLine } from "./ProviderApiKeyStatusLine";

export interface ImageFallbackCardHeaderProps {
  fallbackEnabled: boolean;
  hasFallbackApiKey: boolean;
  fallbackModel: string;
}

export function ImageFallbackCardHeader({
  fallbackEnabled,
  hasFallbackApiKey,
  fallbackModel,
}: ImageFallbackCardHeaderProps) {
  return (
    <>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Automatic Disaster Recovery</p>
          <h2>Image Provider Fallback</h2>
        </div>
        <ShieldCheck size={22} />
      </div>

      <StatusLine label="Fallback Provider" value="ImgStudio (imgstudio.site)" />
      <StatusLine
        label="Fallback Mode"
        value={
          fallbackEnabled ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--accent-deep)", fontWeight: 700 }}>
              <ShieldCheck weight="fill" size={14} />
              Active (Auto-failover on primary failure)
            </span>
          ) : (
            <span style={{ color: "var(--muted)" }}>Disabled</span>
          )
        }
      />
      <ProviderApiKeyStatusLine hasApiKey={hasFallbackApiKey} />
      <StatusLine
        label="Active Fallback Model"
        value={resolveImgStudioModelName(fallbackModel)}
      />
    </>
  );
}
