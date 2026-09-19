import { ShieldCheck } from "@phosphor-icons/react";
import { IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID, resolveImgStudioModelName } from "@studio/shared";
import { StatusLine } from "../../../../components/AppChrome";

export interface ImageFallbackCardHeaderProps {
  fallbackEnabled: boolean;
  fallbackModel: string;
}

export function ImageFallbackCardHeader({ fallbackEnabled, fallbackModel }: ImageFallbackCardHeaderProps) {
  return (
    <>
      <div className="panel-heading">
        <h2>Image Provider Fallback</h2>
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
      <StatusLine label="Level 1 Model" value={resolveImgStudioModelName(IMGSTUDIO_FALLBACK_LEVEL_1_MODEL_ID)} />
      <StatusLine label="Level 2 Model" value={resolveImgStudioModelName(fallbackModel)} />
    </>
  );
}
