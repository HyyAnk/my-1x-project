import { ArrowClockwise } from "@phosphor-icons/react";
import type { ReelAssetActionButtonProps, ReelAssetRetryButtonProps } from "./reelAsset.types";

export function ReelAssetActionButton({ actionButton, isGenerating = false }: ReelAssetActionButtonProps) {
  if (!actionButton) return null;

  return (
    <button
      type="button"
      className="short-reel-secondary-btn"
      disabled={actionButton.disabled || isGenerating}
      onClick={actionButton.onClick}
      aria-label={actionButton.ariaLabel ?? actionButton.label}
    >
      {actionButton.icon ?? <ArrowClockwise size={14} />}
      <span>{actionButton.label}</span>
    </button>
  );
}

export function ReelAssetRetryButton({ retryButton, isGenerating = false }: ReelAssetRetryButtonProps) {
  if (!retryButton) return null;

  return (
    <button
      type="button"
      className="short-reel-retry-btn"
      disabled={retryButton.disabled || isGenerating}
      onClick={retryButton.onClick}
      aria-label={retryButton.ariaLabel ?? "Retry Generation"}
    >
      <ArrowClockwise size={12} />
      <span>{retryButton.label ?? "Retry"}</span>
    </button>
  );
}
