import type { FormEvent } from "react";
import { CircleNotch, Eye, EyeSlash, FileText, FloppyDisk, Trash } from "@phosphor-icons/react";
import type { ImageProviderId } from "@studio/shared";
import { StatusLine } from "../../../components/AppChrome";

export interface ImageProviderSettingsCardProps {
  imageProvider: ImageProviderId;
  setImageProvider: (provider: ImageProviderId) => void;
  hasImageApiKey: boolean;
  imageApiKey: string;
  setImageApiKey: (key: string) => void;
  showImageKey: boolean;
  setShowImageKey: (show: boolean) => void;
  imageBalanceInfo: { balance_vnd: number; rpm?: number } | null;
  imageEnabled: boolean;
  setImageEnabled: (enabled: boolean) => void;
  imageBaseUrl: string;
  setImageBaseUrl: (url: string) => void;
  imageModel: string;
  setImageModel: (model: string) => void;
  maxConcurrentImageTasks: number;
  setMaxConcurrentImageTasks: (val: number) => void;
  imagesPerBundle: number;
  setImagesPerBundle: (val: number) => void;
  savingImage: boolean;
  checkingImageBalance: boolean;
  onSaveImage: (event: FormEvent) => void | Promise<void>;
  onClearImageKey: () => void | Promise<void>;
  onCheckImageBalance: () => void | Promise<void>;
}

export function ImageProviderSettingsCard({
  imageProvider,
  setImageProvider,
  hasImageApiKey,
  imageApiKey,
  setImageApiKey,
  showImageKey,
  setShowImageKey,
  imageBalanceInfo,
  imageEnabled,
  setImageEnabled,
  imageBaseUrl,
  setImageBaseUrl,
  imageModel,
  setImageModel,
  maxConcurrentImageTasks,
  setMaxConcurrentImageTasks,
  imagesPerBundle,
  setImagesPerBundle,
  savingImage,
  checkingImageBalance,
  onSaveImage,
  onClearImageKey,
  onCheckImageBalance,
}: ImageProviderSettingsCardProps) {
  return (
    <section className="panel image-settings-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Continuity Anchor Images</p>
          <h2>Image Provider Settings</h2>
        </div>
        <FileText size={22} />
      </div>
      <StatusLine
        label="Provider"
        value={
          imageProvider === "gpti2"
            ? "gpti2.store (API)"
            : imageProvider === "shopaikey"
              ? "ShopAiKey (Direct Proxy)"
              : "Custom OpenAI-compatible API"
        }
      />
      <StatusLine label="API Key status" value={hasImageApiKey ? "Configured" : "Not configured"} />
      {imageBalanceInfo && imageProvider === "gpti2" ? (
        <StatusLine
          label="Available balance"
          value={`${imageBalanceInfo.balance_vnd.toLocaleString("en-US")} VND${imageBalanceInfo.rpm ? ` (RPM: ${imageBalanceInfo.rpm})` : ""}`}
        />
      ) : null}
      <form className="codex-form" onSubmit={(event) => void onSaveImage(event)}>
        <label className="toggle-field">
          <input type="checkbox" checked={imageEnabled} onChange={(event) => setImageEnabled(event.target.checked)} />
          <span>Enable continuity anchor images generation</span>
        </label>

        <label>
          Image Provider Service
          <select
            value={imageProvider}
            onChange={(event) => {
              const nextProvider = event.target.value as ImageProviderId;
              setImageProvider(nextProvider);
              if (nextProvider === "gpti2") {
                if (imageModel !== "gpt-image-2" && imageModel !== "nano-banana-2") {
                  setImageModel("gpt-image-2");
                }
              } else if (nextProvider === "shopaikey") {
                if (!imageBaseUrl) setImageBaseUrl("https://direct.shopaikey.com/v1");
                if (imageModel === "nano-banana-2") setImageModel("gpt-image-2");
              } else if (nextProvider === "custom") {
                if (!imageBaseUrl) setImageBaseUrl("https://api.openai.com/v1");
              }
            }}
          >
            <option value="gpti2">gpti2.store (Default - Low cost VND, gpt-image-2 & nano-banana-2)</option>
            <option value="shopaikey">ShopAiKey (Direct OpenAI-compatible proxy)</option>
            <option value="custom">Custom Provider (OpenAI-compatible Endpoint)</option>
          </select>
          <small className="field-help">
            {imageProvider === "gpti2"
              ? "Optimized for high-volume automated video assets with VND pricing and balance check."
              : imageProvider === "shopaikey"
                ? "Direct OpenAI proxy endpoint supporting gpt-image-2, gpt-image-1.5, dall-e-3."
                : "Connect any custom OpenAI-compatible image endpoint (OneAPI, NewAPI, Fal, OpenRouter, Local AI)."}
          </small>
        </label>

        {imageProvider === "shopaikey" || imageProvider === "custom" ? (
          <label>
            {imageProvider === "custom" ? "Custom Base URL / Endpoint" : "Base URL (Optional override)"}
            <input
              value={imageBaseUrl}
              onChange={(event) => setImageBaseUrl(event.target.value)}
              placeholder={imageProvider === "shopaikey" ? "https://direct.shopaikey.com/v1" : "https://your-api-endpoint.com/v1"}
              autoComplete="off"
            />
            <small className="field-help">
              {imageProvider === "custom"
                ? "Base URL of your OpenAI-compatible image service (e.g. https://api.openai.com/v1 or http://localhost:8000/v1)."
                : "Default: https://direct.shopaikey.com/v1. Leave blank to use default."}
            </small>
          </label>
        ) : null}

        <label>
          {imageProvider === "gpti2"
            ? "gpti2.store API key"
            : imageProvider === "shopaikey"
              ? "ShopAiKey API key"
              : "API Key / Bearer Token"}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", width: "100%" }}>
            <input
              type={showImageKey ? "text" : "password"}
              value={imageApiKey}
              onChange={(event) => setImageApiKey(event.target.value)}
              placeholder={
                imageProvider === "gpti2"
                  ? "Paste gpti2.store API key (sk-...)"
                  : imageProvider === "shopaikey"
                    ? "Paste ShopAiKey API key (sk-...)"
                    : "Paste custom API key or Bearer token"
              }
              autoComplete="off"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="quiet-button compact"
              title={showImageKey ? "Hide key" : "Show key"}
              onClick={() => setShowImageKey(!showImageKey)}
              style={{ height: "35px", padding: "0 10px" }}
            >
              {showImageKey ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
            {hasImageApiKey || imageApiKey ? (
              <button
                type="button"
                className="icon-button danger compact"
                title="Remove this API Key"
                disabled={savingImage}
                onClick={() => void onClearImageKey()}
                style={{ height: "35px", width: "35px", minWidth: "35px", borderRadius: "6px" }}
              >
                <Trash size={16} />
              </button>
            ) : null}
          </div>
          <small className="field-help">
            {hasImageApiKey
              ? "Key stored securely in .documentary-studio/ (gitignored). You can edit directly to replace or click the trash icon to remove."
              : imageProvider === "gpti2"
                ? "Get your API key from the Account tab at https://gpti2.store. Stored securely in .documentary-studio/ (gitignored)."
                : imageProvider === "shopaikey"
                  ? "Get your API key from https://shopaikey.com. Stored securely in .documentary-studio/ (gitignored)."
                  : "Key or token for your custom OpenAI-compatible endpoint. Stored securely in .documentary-studio/."}
          </small>
        </label>

        {imageProvider === "gpti2" ? (
          <label>
            Default Model
            <select value={imageModel} onChange={(event) => setImageModel(event.target.value)}>
              <option value="gpt-image-2">gpt-image-2 (50 VND / image - Economy)</option>
              <option value="nano-banana-2">nano-banana-2 (100 VND / image - 2K HD)</option>
            </select>
          </label>
        ) : imageProvider === "shopaikey" ? (
          <label>
            Default Model
            <select value={imageModel} onChange={(event) => setImageModel(event.target.value)}>
              <option value="gpt-image-2">gpt-image-2 (Default)</option>
              <option value="gpt-image-1.5">gpt-image-1.5</option>
              <option value="gpt-image-1">gpt-image-1</option>
              <option value="gpt-image-2-all">gpt-image-2-all</option>
              <option value="dall-e-3">dall-e-3</option>
            </select>
          </label>
        ) : (
          <label>
            Model Name / ID
            <input
              value={imageModel}
              onChange={(event) => setImageModel(event.target.value)}
              placeholder="e.g. dall-e-3, gpt-image-2, flux-schnell, sdxl"
              list="custom-image-models"
            />
            <datalist id="custom-image-models">
              <option value="gpt-image-2" />
              <option value="dall-e-3" />
              <option value="flux-schnell" />
              <option value="flux-dev" />
              <option value="stable-diffusion-xl" />
              <option value="imagen-3" />
            </datalist>
            <small className="field-help">Specify the model identifier accepted by your custom provider API.</small>
          </label>
        )}

        <label>
          Parallel Generation Workers
          <select value={maxConcurrentImageTasks} onChange={(event) => setMaxConcurrentImageTasks(Number(event.target.value))}>
            <option value="1">1 worker</option>
            <option value="2">2 workers</option>
            <option value="3">3 workers (Recommended)</option>
            <option value="4">4 workers</option>
          </select>
        </label>

        <label>
          Images per bundle
          <select value={imagesPerBundle} disabled={!imageEnabled} onChange={(event) => setImagesPerBundle(Number(event.target.value))}>
            <option value="1">1 anchor</option>
            <option value="2">2 anchors</option>
          </select>
        </label>

        <small className="field-help">
          Idempotency protection and async queue support are active. Low-quality mode optimizes rendering speed and token cost.
        </small>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="primary-button" disabled={savingImage}>
            {savingImage ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
            <span>Save Image Settings</span>
          </button>
          {hasImageApiKey || imageApiKey ? (
            <button type="button" className="quiet-button" disabled={checkingImageBalance} onClick={() => void onCheckImageBalance()}>
              {checkingImageBalance ? <CircleNotch className="spin" size={15} /> : null}
              <span>
                {checkingImageBalance
                  ? "Verifying…"
                  : imageProvider === "gpti2"
                    ? "Check Balance & Verify Key"
                    : "Verify Connection & Key"}
              </span>
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
