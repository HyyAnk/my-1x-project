import type React from "react";

export type ReelAssetTone = "ready" | "pending" | "failed" | "stale" | "missing" | "neutral";
export type ReelAssetAspectRatio = "1:1" | "9:16";

export interface ReelAssetBadge {
  label: string;
  tone?: ReelAssetTone;
}

export interface ReelAssetActionButtonConfig {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  icon?: React.ReactNode;
}

export interface ReelAssetRetryButtonConfig {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export interface ReelAssetMeta {
  dimensions?: string;
  mimeType?: string;
  checksum?: string;
}

export interface ReelAssetEmptyStateActionLink {
  label: string;
  href: string;
  onClick?: () => void;
}

export interface ReelAssetEmptyState {
  title?: string;
  description: string;
  actionLink?: ReelAssetEmptyStateActionLink;
}

export interface ReelAssetCardProps {
  title: string;
  roleLabel?: string;
  badge: ReelAssetBadge;
  aspectRatio: ReelAssetAspectRatio;
  imageUrl: string | null;
  imageAlt: string;
  previousImageUrl?: string | null;
  isGenerating?: boolean;
  statusMessage?: string | null;
  error?: string | null;
  actionButton?: ReelAssetActionButtonConfig;
  retryButton?: ReelAssetRetryButtonConfig;
  meta?: ReelAssetMeta;
  downloadUrl?: string | null;
  downloadName?: string;
  downloadAriaLabel?: string;
  emptyState?: ReelAssetEmptyState;
  ariaLabel: string;
}

export interface ReelAssetMetadataBarProps {
  meta?: ReelAssetMeta;
  downloadUrl?: string | null;
  downloadName?: string;
  downloadAriaLabel?: string;
  title: string;
}

export interface ReelAssetActionButtonProps {
  actionButton?: ReelAssetActionButtonConfig;
  isGenerating?: boolean;
}

export interface ReelAssetRetryButtonProps {
  retryButton?: ReelAssetRetryButtonConfig;
  isGenerating?: boolean;
}

export interface ReelAssetPlaceholderProps {
  aspectRatio: ReelAssetAspectRatio;
  isGenerating: boolean;
  statusMessage?: string | null;
  emptyState?: ReelAssetEmptyState;
}

export interface ReelAssetPreviewProps {
  displayImage?: string | null;
  imageAlt: string;
  aspectRatio: ReelAssetAspectRatio;
  isShowingPrevious: boolean;
  isGenerating: boolean;
  statusMessage?: string | null;
  meta?: ReelAssetMeta;
  downloadUrl?: string | null;
  downloadName?: string;
  downloadAriaLabel?: string;
  title: string;
  emptyState?: ReelAssetEmptyState;
}

export interface ReelAssetErrorBoxProps {
  error?: string | null;
  retryButton?: ReelAssetRetryButtonConfig;
  isGenerating?: boolean;
}

export interface ReelAssetMediaSlotProps {
  title: string;
  aspectRatio: ReelAssetAspectRatio;
  imageUrl: string | null;
  imageAlt: string;
  previousImageUrl?: string | null;
  isGenerating?: boolean;
  statusMessage?: string | null;
  error?: string | null;
  retryButton?: ReelAssetRetryButtonConfig;
  meta?: ReelAssetMeta;
  downloadUrl?: string | null;
  downloadName?: string;
  downloadAriaLabel?: string;
  emptyState?: ReelAssetEmptyState;
}
