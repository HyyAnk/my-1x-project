import { ArrowClockwise } from "@phosphor-icons/react";
import type { ReelUnitStatus } from "@studio/shared";
import { ReelAssetCard } from "../ReelAssetCard";
import { getUnitTone } from "./assetCardUtils";

export interface CoverAssetCardProps {
  coverState: ReelUnitStatus;
  isCoverPending: boolean;
  coverPayload?: { width: number; height: number; mime_type: string; checksum: string } | null;
  coverDisplayUrl: string | null;
  coverStageMessage?: string;
  coverError: string | null;
  onRegenerate: () => void;
}

export function CoverAssetCard({
  coverState,
  isCoverPending,
  coverPayload,
  coverDisplayUrl,
  coverStageMessage,
  coverError,
  onRegenerate,
}: CoverAssetCardProps) {
  return (
    <ReelAssetCard
      title="Cover Image"
      roleLabel="9:16 Cover"
      badge={{
        label: isCoverPending ? "Generating" : coverState,
        tone: getUnitTone(coverState, isCoverPending),
      }}
      aspectRatio="9:16"
      imageUrl={isCoverPending && coverPayload ? null : coverDisplayUrl}
      previousImageUrl={coverDisplayUrl}
      imageAlt="Short-Reel cover"
      isGenerating={isCoverPending}
      statusMessage={coverStageMessage || "Generating 1080x1920 cover image..."}
      error={coverError}
      actionButton={{
        label: coverPayload ? "Regenerate Cover" : "Generate Cover",
        onClick: onRegenerate,
        ariaLabel: coverPayload ? "Regenerate Cover Image" : "Generate Cover Image",
        icon: <ArrowClockwise size={14} />,
      }}
      retryButton={
        coverError
          ? {
              label: "Retry Cover",
              onClick: onRegenerate,
              ariaLabel: "Retry Cover Generation",
            }
          : undefined
      }
      meta={
        coverPayload
          ? {
              dimensions: `${coverPayload.width}×${coverPayload.height}`,
              mimeType: coverPayload.mime_type,
              checksum: coverPayload.checksum,
            }
          : undefined
      }
      downloadUrl={coverDisplayUrl}
      downloadName="short-reel-cover.png"
      downloadAriaLabel="Download cover"
      emptyState={{
        title: "Cover Not Generated",
        description: "Cover image is conditioned on the accepted style reference and script.",
      }}
      ariaLabel="Cover Image"
    />
  );
}
