import { CaretDown, Image, WarningCircle } from "@phosphor-icons/react";
import { useTranslation } from "../../../i18n";

export type ImageModelControlProps = {
  hasImageApiKey: boolean;
  currentImageModel: string;
  onImageModelChange: (model: string) => Promise<void>;
  onOpenImageSettings?: () => void;
};

export function ImageModelControl({ hasImageApiKey, currentImageModel, onImageModelChange, onOpenImageSettings }: ImageModelControlProps) {
  const { t } = useTranslation();
  if (!hasImageApiKey) {
    return (
      <button
        type="button"
        className="topbar-key-missing-btn"
        onClick={onOpenImageSettings}
        title="gpti2.store API Key is not configured. Click to open Settings."
      >
        <WarningCircle size={14} weight="fill" className="key-warning-icon" />
        <span>{t("topbar.missingImageKey")}</span>
      </button>
    );
  }
  return (
    <label className="model-select image-model-select" title="Image Generation Model (gpti2.store)">
      <Image size={13} style={{ marginRight: 2 }} />
      <span>{t("topbar.imageModel")}</span>
      <CaretDown size={13} />
      <select
        aria-label="Image generation model"
        value={currentImageModel || "gpt-image-2"}
        onChange={(event) => void onImageModelChange(event.target.value)}
      >
        <option value="gpt-image-2">gpt-image-2 (50 VND)</option>
        <option value="nano-banana-2">nano-banana-2 (100 VND - 2K)</option>
      </select>
    </label>
  );
}

export type TextModelControlProps = {
  activeEngine: "codex" | "antigravity";
  currentModel: string;
  models: Array<{ id: string; label: string }>;
  loadingModels: boolean;
  modelsError: string | null;
  onModelChange: (model: string) => Promise<void>;
};

export function TextModelControl({ activeEngine, currentModel, models, loadingModels, modelsError, onModelChange }: TextModelControlProps) {
  const { t } = useTranslation();
  const engineDefaultLabel = activeEngine === "antigravity" ? t("topbar.antigravityDefault") : t("topbar.codexDefault");

  return (
    <>
      <label className="model-select">
        <span>{t("topbar.model")}</span>
        <CaretDown size={13} />
        {loadingModels ? (
          <select aria-label={activeEngine === "antigravity" ? "Antigravity model" : "Codex model"} disabled>
            <option>{t("topbar.loadingModels")}</option>
          </select>
        ) : (
          <select
            aria-label={activeEngine === "antigravity" ? "Antigravity model" : "Codex model"}
            value={currentModel}
            onChange={(event) => void onModelChange(event.target.value)}
          >
            <option value="">{engineDefaultLabel}</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        )}
      </label>
      {modelsError ? (
        <span className="model-error-tooltip" title={modelsError}>
          <WarningCircle size={15} />
        </span>
      ) : null}
    </>
  );
}
