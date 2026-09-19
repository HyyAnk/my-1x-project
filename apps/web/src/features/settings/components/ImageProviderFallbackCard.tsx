import type { FormEvent } from "react";
import type { ImgStudioModelDefinition } from "@studio/shared";
import type { VerificationResult } from "../hooks/useImageFallbackSettingsState";
import {
  ApiKeyInputField,
  FallbackActionButtons,
  FallbackModelConfigFields,
  ImageFallbackCardHeader,
  ProviderVerificationBanner,
} from "./imageProvider";

export interface ImageProviderFallbackCardProps {
  fallbackEnabled: boolean;
  setFallbackEnabled: (enabled: boolean) => void;
  fallbackModel: string;
  setFallbackModel: (model: string) => void;
  fallbackResolution: "1K" | "2K" | "4K";
  setFallbackResolution: (resolution: "1K" | "2K" | "4K") => void;
  fallbackQuality: "standard" | "high";
  setFallbackQuality: (quality: "standard" | "high") => void;
  fallbackApiKey: string;
  setFallbackApiKey: (key: string) => void;
  showFallbackKey: boolean;
  setShowFallbackKey: (show: boolean) => void;
  hasFallbackApiKey: boolean;
  savingFallback: boolean;
  verifyingFallback: boolean;
  verificationResult?: VerificationResult;
  setVerificationResult?: (result: VerificationResult) => void;
  availableModels: readonly ImgStudioModelDefinition[];
  onSaveFallback: (event: FormEvent) => void | Promise<void>;
  onClearFallbackKey: () => void | Promise<void>;
  onVerifyFallbackConnection: () => void | Promise<void>;
}

export function ImageProviderFallbackCard({
  fallbackEnabled,
  setFallbackEnabled,
  fallbackModel,
  setFallbackModel,
  fallbackResolution,
  setFallbackResolution,
  fallbackQuality,
  setFallbackQuality,
  fallbackApiKey,
  setFallbackApiKey,
  showFallbackKey,
  setShowFallbackKey,
  hasFallbackApiKey,
  savingFallback,
  verifyingFallback,
  verificationResult,
  setVerificationResult,
  availableModels,
  onSaveFallback,
  onClearFallbackKey,
  onVerifyFallbackConnection,
}: ImageProviderFallbackCardProps) {
  const placeholderText = hasFallbackApiKey ? "Enter a new key to replace" : "Paste ImgStudio API key";

  const helpText = hasFallbackApiKey ? "Leave blank to keep the saved key." : "Create a key at https://imgstudio.site/docs/api.";

  const handleApiKeyChange = (nextKey: string) => {
    setFallbackApiKey(nextKey);
    if (setVerificationResult) {
      setVerificationResult(null);
    }
  };

  return (
    <section className="panel image-fallback-panel">
      <ImageFallbackCardHeader fallbackEnabled={fallbackEnabled} fallbackModel={fallbackModel} />

      <form className="codex-form" onSubmit={(event) => void onSaveFallback(event)}>
        <label className="toggle-field">
          <input type="checkbox" checked={fallbackEnabled} onChange={(event) => setFallbackEnabled(event.target.checked)} />
          <span>Enable automatic fallback to ImgStudio</span>
        </label>

        <FallbackModelConfigFields
          fallbackModel={fallbackModel}
          setFallbackModel={setFallbackModel}
          fallbackResolution={fallbackResolution}
          setFallbackResolution={setFallbackResolution}
          fallbackQuality={fallbackQuality}
          setFallbackQuality={setFallbackQuality}
          availableModels={availableModels}
        />

        <ApiKeyInputField
          label="ImgStudio API Key"
          value={fallbackApiKey}
          onChange={handleApiKeyChange}
          hasKey={hasFallbackApiKey}
          showKey={showFallbackKey}
          onToggleShowKey={() => setShowFallbackKey(!showFallbackKey)}
          onClearKey={onClearFallbackKey}
          placeholder={placeholderText}
          helpText={helpText}
          disabled={savingFallback}
          clearButtonTitle="Remove ImgStudio API Key"
        />

        <FallbackActionButtons
          savingFallback={savingFallback}
          verifyingFallback={verifyingFallback}
          canTest={Boolean(fallbackApiKey || hasFallbackApiKey)}
          onVerifyFallbackConnection={onVerifyFallbackConnection}
        />

        {verificationResult ? <ProviderVerificationBanner result={verificationResult} /> : null}
      </form>
    </section>
  );
}
