import type { ImageProviderId } from "@studio/shared";

export interface ProviderConfigFieldsProps {
  imageProvider: ImageProviderId;
  setImageProvider: (provider: ImageProviderId) => void;
  imageBaseUrl: string;
  setImageBaseUrl: (url: string) => void;
  imageModel: string;
  setImageModel: (model: string) => void;
  maxConcurrentImageTasks: number;
  setMaxConcurrentImageTasks: (val: number) => void;
  imagesPerBundle: number;
  setImagesPerBundle: (val: number) => void;
  imageEnabled: boolean;
}

export function ProviderConfigFields({
  imageProvider,
  setImageProvider,
  imageBaseUrl,
  setImageBaseUrl,
  imageModel,
  setImageModel,
  maxConcurrentImageTasks,
  setMaxConcurrentImageTasks,
  imagesPerBundle,
  setImagesPerBundle,
  imageEnabled,
}: ProviderConfigFieldsProps) {
  const handleProviderChange = (nextProvider: ImageProviderId) => {
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
  };

  return (
    <>
      <label>
        Image Provider Service
        <select value={imageProvider} onChange={(e) => handleProviderChange(e.target.value as ImageProviderId)}>
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
    </>
  );
}
