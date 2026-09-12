import { FileText } from "@phosphor-icons/react";
import type { ImageProviderId } from "@studio/shared";
import { StatusLine } from "../../../../components/AppChrome";
import { ProviderApiKeyStatusLine } from "./ProviderApiKeyStatusLine";

export interface ImageProviderCardHeaderProps {
  imageProvider: ImageProviderId;
  hasImageApiKey: boolean;
  imageBalanceInfo: { balance_vnd: number; rpm?: number } | null;
}

export function ImageProviderCardHeader({
  imageProvider,
  hasImageApiKey,
  imageBalanceInfo,
}: ImageProviderCardHeaderProps) {
  const providerDisplay =
    imageProvider === "gpti2"
      ? "gpti2.store (API)"
      : imageProvider === "shopaikey"
        ? "ShopAiKey (Direct Proxy)"
        : "Custom OpenAI-compatible API";

  return (
    <>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Continuity Anchor Images</p>
          <h2>Image Provider Settings</h2>
        </div>
        <FileText size={22} />
      </div>
      <StatusLine label="Provider" value={providerDisplay} />
      <ProviderApiKeyStatusLine hasApiKey={hasImageApiKey} />
      {imageBalanceInfo && imageProvider === "gpti2" ? (
        <StatusLine
          label="Available balance"
          value={`${imageBalanceInfo.balance_vnd.toLocaleString("en-US")} VND${imageBalanceInfo.rpm ? ` (RPM: ${imageBalanceInfo.rpm})` : ""}`}
        />
      ) : null}
    </>
  );
}
