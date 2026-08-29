import { ArrowsClockwise, CircleNotch, Eye, EyeSlash, FileText, FloppyDisk, Trash, VideoCamera } from "@phosphor-icons/react";
import type { AppConfig, ImageProviderId } from "@studio/shared";
import { StatusLine } from "../../components/AppChrome";
import type { Notice } from "../../components/types";
import { useMediaSettings } from "./hooks/useMediaSettings";

type MediaSettingsTabProps = {
  appConfig: AppConfig | null;
  onVideoSaved: (video: AppConfig["video_generation"]) => void | Promise<void>;
  onImageSaved: (image: AppConfig["image_generation"]) => void | Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
};

export function MediaSettingsTab({ appConfig, onVideoSaved, onImageSaved, onNotice }: MediaSettingsTabProps) {
  const {
    maxSceneDuration,
    setMaxSceneDuration,
    narrationWordsPerSecond,
    setNarrationWordsPerSecond,
    maxConcurrentVideoTasks,
    setMaxConcurrentVideoTasks,
    savingVideo,
    saveVideo,
    imageEnabled,
    setImageEnabled,
    imagesPerBundle,
    setImagesPerBundle,
    imageProvider,
    setImageProvider,
    imageBaseUrl,
    setImageBaseUrl,
    imageModel,
    setImageModel,
    imageApiKey,
    setImageApiKey,
    showImageKey,
    setShowImageKey,
    hasImageApiKey,
    maxConcurrentImageTasks,
    setMaxConcurrentImageTasks,
    savingImage,
    checkingImageBalance,
    imageBalanceInfo,
    saveImage,
    clearImageKey,
    checkImageBalance,
    historyEnabled,
    setHistoryEnabled,
    passThreshold,
    setPassThreshold,
    ttlDays,
    setTtlDays,
    autoRemix,
    setAutoRemix,
    savingHistory,
    saveHistory,
  } = useMediaSettings({
    appConfig,
    onVideoSaved,
    onImageSaved,
    onNotice,
  });

  const maxDuration = appConfig?.video_generation.max_scene_duration_seconds ?? 8;
  const estimatedWpm = Math.round(narrationWordsPerSecond * 60);

  return (
    <div className="settings-grid">
      <section className="panel video-settings-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Video Timing & Pacing</p>
            <h2>Scene Duration & Speed</h2>
          </div>
          <VideoCamera size={22} />
        </div>
        <StatusLine label="Max scene duration" value={`${maxDuration}s`} />
        <StatusLine label="Estimated speaking pace" value={`~${estimatedWpm} words/min`} />
        <StatusLine label="Max concurrent episode builds" value={`${maxConcurrentVideoTasks} episodes`} />
        <form className="codex-form" onSubmit={(event) => void saveVideo(event)}>
          <label>
            Parallel Episode Builds (Queue Limit)
            <select value={maxConcurrentVideoTasks} onChange={(event) => setMaxConcurrentVideoTasks(Number(event.target.value))}>
              <option value="1">1 episode (Sequential / Resource-saving)</option>
              <option value="2">2 episodes (Default - Recommended for 32GB RAM)</option>
              <option value="3">3 episodes</option>
              <option value="4">4 episodes</option>
            </select>
            <small className="field-help">
              Maximum number of concurrent episode video builds. Tasks exceeding this limit are queued automatically in the sidebar.
            </small>
          </label>
          <label>
            Max Scene Duration (seconds)
            <input
              type="number"
              min="1"
              max="120"
              step="0.5"
              value={maxSceneDuration}
              onChange={(event) => setMaxSceneDuration(Number(event.target.value))}
            />
            <small className="field-help">
              Maximum length your video generation pipeline will produce per shot. The scene breakdown engine packs dialogue beats to fit
              within this duration.
            </small>
          </label>
          <label>
            Narration pace (words/sec)
            <input
              type="number"
              min="0.1"
              max="20"
              step="0.1"
              value={narrationWordsPerSecond}
              onChange={(event) => setNarrationWordsPerSecond(Number(event.target.value))}
            />
            <small className="field-help">
              Standard spoken speed calibration ({narrationWordsPerSecond} words/sec ≈ {estimatedWpm} words/min).
            </small>
          </label>
          <button className="primary-button" disabled={savingVideo}>
            {savingVideo ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
            <span>Save Video Settings</span>
          </button>
        </form>
      </section>

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
        <form className="codex-form" onSubmit={(event) => void saveImage(event)}>
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
                  onClick={() => void clearImageKey()}
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
              <button type="button" className="quiet-button" disabled={checkingImageBalance} onClick={() => void checkImageBalance()}>
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

      <section className="panel history-settings-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Content Quality & Anti-Duplicate</p>
            <h2>Question History & Duplicate Gate</h2>
          </div>
          <ArrowsClockwise size={22} />
        </div>
        <StatusLine label="History check" value={historyEnabled ? "Enabled" : "Disabled"} />
        <StatusLine label="Pass history threshold" value={`<= ${passThreshold} duplicate questions`} />
        <StatusLine label="Retention period (TTL)" value={`${ttlDays} days`} />
        <form className="codex-form" onSubmit={(event) => void saveHistory(event)}>
          <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={historyEnabled} onChange={(event) => setHistoryEnabled(event.target.checked)} />
            <span>Enable Question History Duplicate Check</span>
          </label>

          <label>
            Pass History Threshold (Maximum allowed duplicates to auto-pass)
            <input
              type="number"
              min="0"
              max="20"
              step="1"
              value={passThreshold}
              onChange={(event) => setPassThreshold(Number(event.target.value))}
            />
            <small className="field-help">
              Example: 2 means if an episode has 2 or fewer duplicate questions, the pipeline continues building automatically without
              pausing.
            </small>
          </label>

          <label>
            History Retention Period (TTL in Days)
            <input type="number" min="1" max="365" step="1" value={ttlDays} onChange={(event) => setTtlDays(Number(event.target.value))} />
            <small className="field-help">
              Default: 30 days. Questions older than this period are pruned automatically to optimize memory.
            </small>
          </label>

          <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={autoRemix} onChange={(event) => setAutoRemix(event.target.checked)} />
            <span>Auto-remix duplicate questions with AI during generation</span>
          </label>

          <button className="primary-button" disabled={savingHistory}>
            {savingHistory ? <CircleNotch className="spin" size={16} /> : <FloppyDisk size={16} />}
            <span>Save History Settings</span>
          </button>
        </form>
      </section>
    </div>
  );
}
