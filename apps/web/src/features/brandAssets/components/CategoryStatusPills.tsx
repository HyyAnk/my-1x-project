import { Image, Sparkle, XLogo, YoutubeLogo } from "@phosphor-icons/react";
import type { CategoryReadiness } from "../types";
import { formatReadinessLabel } from "../utils/readinessHelpers";

export interface CategoryStatusPillsProps {
  readiness: CategoryReadiness;
}

export function CategoryStatusPills({ readiness }: CategoryStatusPillsProps) {
  const { logoStatus, youtubeStatus, xStatus, artCount } = readiness;

  return (
    <div className="category-status-pills-row" data-testid="category-status-pills">
      <span
        className={`status-pill pill-${logoStatus}`}
        data-testid="pill-brand-logo"
        title={`Brand Logo: ${formatReadinessLabel(logoStatus)}`}
      >
        <Sparkle size={13} weight="bold" />
        <span>Logo: {formatReadinessLabel(logoStatus)}</span>
      </span>

      <span
        className={`status-pill pill-${youtubeStatus}`}
        data-testid="pill-youtube-kit"
        title={`YouTube Kit: ${formatReadinessLabel(youtubeStatus)}`}
      >
        <YoutubeLogo size={13} weight="fill" />
        <span>YouTube: {formatReadinessLabel(youtubeStatus)}</span>
      </span>

      <span
        className={`status-pill pill-${xStatus}`}
        data-testid="pill-x-kit"
        title={`X Kit: ${formatReadinessLabel(xStatus)}`}
      >
        <XLogo size={13} weight="bold" />
        <span>X: {formatReadinessLabel(xStatus)}</span>
      </span>

      <span
        className="status-pill pill-art"
        data-testid="pill-social-art"
        title={`Social Art: ${artCount} ${artCount === 1 ? "item" : "items"}`}
      >
        <Image size={13} weight="bold" />
        <span>Art: {artCount}</span>
      </span>
    </div>
  );
}
