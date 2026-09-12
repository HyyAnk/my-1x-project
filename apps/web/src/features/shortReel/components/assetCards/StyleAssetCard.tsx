import { ArrowClockwise } from "@phosphor-icons/react";
import type { ReelUnitStatus } from "@studio/shared";
import { ReelAssetCard } from "../ReelAssetCard";
import { getUnitTone } from "./assetCardUtils";

export interface StyleAssetCardProps {
  referencesState: ReelUnitStatus;
  isStylePending: boolean;
  acceptedStyleRef?: { width: number; height: number; mime_type: string; checksum: string };
  styleDisplayUrl: string | null;
  styleStageMessage?: string;
  styleError: string | null;
  onRegenerate: () => void;
}

export function StyleAssetCard({
  referencesState,
  isStylePending,
  acceptedStyleRef,
  styleDisplayUrl,
  styleStageMessage,
  styleError,
  onRegenerate,
}: StyleAssetCardProps) {
  return (
    <ReelAssetCard
      title="Portrait Style Reference"
      roleLabel="9:16 Style"
      badge={{
        label: isStylePending ? "Generating" : referencesState,
        tone: getUnitTone(referencesState, isStylePending),
      }}
      aspectRatio="9:16"
      imageUrl={isStylePending && acceptedStyleRef ? null : styleDisplayUrl}
      previousImageUrl={styleDisplayUrl}
      imageAlt="Short-Reel 9:16 portrait style reference"
      isGenerating={isStylePending}
      statusMessage={styleStageMessage || "Generating portrait style 9:16..."}
      error={styleError}
      actionButton={{
        label: acceptedStyleRef ? "Regenerate Style" : "Generate Style",
        onClick: onRegenerate,
        ariaLabel: acceptedStyleRef ? "Regenerate Style Reference" : "Generate Style Reference",
        icon: <ArrowClockwise size={14} />,
      }}
      retryButton={
        styleError
          ? {
              label: "Retry Style",
              onClick: onRegenerate,
              ariaLabel: "Retry Style Generation",
            }
          : undefined
      }
      meta={
        acceptedStyleRef
          ? {
              dimensions: `${acceptedStyleRef.width}×${acceptedStyleRef.height}`,
              mimeType: acceptedStyleRef.mime_type,
              checksum: acceptedStyleRef.checksum,
            }
          : undefined
      }
      downloadUrl={styleDisplayUrl}
      downloadName="portrait-style.png"
      emptyState={{
        title: "Style Not Generated",
        description: "Click 'Generate Style' to produce a 9:16 portrait style scene conditioned on the mascot.",
      }}
      ariaLabel="Portrait Style Reference"
    />
  );
}
