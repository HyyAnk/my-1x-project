import { type ImgStudioModelDefinition, IMGSTUDIO_DEFAULT_MODEL_ID } from "@studio/shared";

export interface FallbackModelConfigFieldsProps {
  fallbackModel: string;
  setFallbackModel: (model: string) => void;
  fallbackResolution: "1K" | "2K" | "4K";
  setFallbackResolution: (resolution: "1K" | "2K" | "4K") => void;
  fallbackQuality: "standard" | "high";
  setFallbackQuality: (quality: "standard" | "high") => void;
  availableModels: readonly ImgStudioModelDefinition[];
}

export function FallbackModelConfigFields({
  fallbackModel,
  setFallbackModel,
  fallbackResolution,
  setFallbackResolution,
  fallbackQuality,
  setFallbackQuality,
  availableModels,
}: FallbackModelConfigFieldsProps) {
  return (
    <>
      <label>
        Fallback Model
        <select
          value={fallbackModel}
          onChange={(event) => setFallbackModel(event.target.value)}
        >
          {availableModels.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.id === IMGSTUDIO_DEFAULT_MODEL_ID ? "Default · " : ""}Max {item.max_resolution})
            </option>
          ))}
        </select>
        <small className="field-help">
          Default fallback model is Qwen Image 3.0 Pro, providing high visual fidelity and robust prompt adherence.
        </small>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <label>
          Fallback Resolution
          <select
            value={fallbackResolution}
            onChange={(event) => setFallbackResolution(event.target.value as "1K" | "2K" | "4K")}
          >
            <option value="1K">1K (Fast / Standard HD)</option>
            <option value="2K">2K (High Resolution - Recommended)</option>
            <option value="4K">4K (Ultra High Definition)</option>
          </select>
        </label>

        <label>
          Fallback Quality
          <select
            value={fallbackQuality}
            onChange={(event) => setFallbackQuality(event.target.value as "standard" | "high")}
          >
            <option value="standard">Standard Quality</option>
            <option value="high">High Quality</option>
          </select>
        </label>
      </div>
    </>
  );
}
