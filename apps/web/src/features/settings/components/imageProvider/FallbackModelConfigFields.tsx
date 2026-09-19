import { type ImgStudioModelDefinition, IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID, IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID } from "@studio/shared";

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
        Level 2 Model
        <select value={fallbackModel} onChange={(event) => setFallbackModel(event.target.value)}>
          {availableModels
            .filter((item) => item.id !== IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.id === IMGSTUDIO_FALLBACK_LEVEL_2_MODEL_ID ? "Default · " : ""}Max {item.max_resolution})
              </option>
            ))}
        </select>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <label>
          Fallback Resolution
          <select value={fallbackResolution} onChange={(event) => setFallbackResolution(event.target.value as "1K" | "2K" | "4K")}>
            <option value="1K">1K (Fast / Standard HD)</option>
            <option value="2K">2K (High Resolution - Recommended)</option>
            <option value="4K">4K (Ultra High Definition)</option>
          </select>
        </label>

        <label>
          Fallback Quality
          <select value={fallbackQuality} onChange={(event) => setFallbackQuality(event.target.value as "standard" | "high")}>
            <option value="standard">Standard Quality</option>
            <option value="high">High Quality</option>
          </select>
        </label>
      </div>
    </>
  );
}
