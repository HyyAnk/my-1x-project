import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { VIDEO_TITLE_KEYWORD_WINDOW_CHARS, VIDEO_TITLE_MAX_CHARS, VIDEO_TITLE_VISIBLE_CHARS } from "@studio/shared";
import type { TitleSeoMetrics } from "../../utils/videoTitleMetrics";

interface VideoTitleSeoChecksProps {
  metrics: TitleSeoMetrics;
  primaryKeyword: string | null;
}

const LENGTH_MESSAGES: Record<TitleSeoMetrics["lengthStatus"], string> = {
  optimal: `Fully visible on mobile (≤ ${VIDEO_TITLE_VISIBLE_CHARS} chars)`,
  truncated: `May be cut off on mobile after ${VIDEO_TITLE_VISIBLE_CHARS} chars`,
  overflow: `Over the YouTube limit of ${VIDEO_TITLE_MAX_CHARS} chars`,
};

function CheckItem({ passed, label }: { passed: boolean; label: string }) {
  return (
    <li className={`video-title-check ${passed ? "is-pass" : "is-warn"}`}>
      {passed ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} weight="fill" />}
      <span>{label}</span>
    </li>
  );
}

export function VideoTitleSeoChecks({ metrics, primaryKeyword }: VideoTitleSeoChecksProps) {
  const keywordLabel = !primaryKeyword
    ? "No primary keyword yet"
    : metrics.keywordFrontLoaded
      ? `Keyword "${primaryKeyword}" is front-loaded`
      : metrics.keywordPresent
        ? `Move "${primaryKeyword}" into the first ${VIDEO_TITLE_KEYWORD_WINDOW_CHARS} chars`
        : `Keyword "${primaryKeyword}" is missing`;

  return (
    <ul className="video-title-checks" aria-label="Title SEO checks">
      <li className={`video-title-length is-${metrics.lengthStatus}`}>
        {metrics.charCount} / {VIDEO_TITLE_MAX_CHARS}
      </li>
      <CheckItem passed={metrics.lengthStatus === "optimal"} label={LENGTH_MESSAGES[metrics.lengthStatus]} />
      <CheckItem passed={metrics.keywordFrontLoaded} label={keywordLabel} />
    </ul>
  );
}
