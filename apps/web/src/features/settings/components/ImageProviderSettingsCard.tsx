import type { FormEvent } from "react";
import type { ImageProviderId } from "@studio/shared";
import {
  ApiKeyInputField,
  ImageProviderActionButtons,
  ImageProviderCardHeader,
  ProviderConfigFields,
  getProviderKeyHelpText,
  getProviderKeyLabel,
  getProviderKeyPlaceholder,
} from "./imageProvider";

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
  const providerKeyLabel = getProviderKeyLabel(imageProvider);
  const keyPlaceholder = getProviderKeyPlaceholder(imageProvider, hasImageApiKey, showImageKey);
  const keyHelpText = getProviderKeyHelpText(imageProvider, hasImageApiKey);

  return (
    <section className="panel image-settings-panel">
      <ImageProviderCardHeader
        imageProvider={imageProvider}
        hasImageApiKey={hasImageApiKey}
        imageBalanceInfo={imageBalanceInfo}
      />
      <form className="codex-form" onSubmit={(event) => void onSaveImage(event)}>
        <label className="toggle-field">
          <input type="checkbox" checked={imageEnabled} onChange={(event) => setImageEnabled(event.target.checked)} />
          <span>Enable continuity anchor images generation</span>
        </label>

        <ProviderConfigFields
          imageProvider={imageProvider}
          setImageProvider={setImageProvider}
          imageBaseUrl={imageBaseUrl}
          setImageBaseUrl={setImageBaseUrl}
          imageModel={imageModel}
          setImageModel={setImageModel}
          maxConcurrentImageTasks={maxConcurrentImageTasks}
          setMaxConcurrentImageTasks={setMaxConcurrentImageTasks}
          imagesPerBundle={imagesPerBundle}
          setImagesPerBundle={setImagesPerBundle}
          imageEnabled={imageEnabled}
        />

        <ApiKeyInputField
          label={providerKeyLabel}
          value={imageApiKey}
          onChange={setImageApiKey}
          hasKey={hasImageApiKey}
          showKey={showImageKey}
          onToggleShowKey={() => setShowImageKey(!showImageKey)}
          onClearKey={onClearImageKey}
          placeholder={keyPlaceholder}
          helpText={keyHelpText}
          disabled={savingImage}
        />

        <ImageProviderActionButtons
          imageProvider={imageProvider}
          savingImage={savingImage}
          checkingImageBalance={checkingImageBalance}
          canTest={Boolean(hasImageApiKey || imageApiKey)}
          onCheckImageBalance={onCheckImageBalance}
        />
      </form>
    </section>
  );
}
