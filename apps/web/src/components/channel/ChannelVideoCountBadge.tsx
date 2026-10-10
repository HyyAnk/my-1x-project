import { FilmSlate } from "@phosphor-icons/react";

export type ChannelVideoCountBadgeProps = {
  episodeCount: number | undefined;
};

export function ChannelVideoCountBadge({ episodeCount }: ChannelVideoCountBadgeProps) {
  const count = episodeCount || 0;
  const unitLabel = episodeCount === 1 ? "video" : "videos";
  const summary = `${count} ${unitLabel}`;

  return (
    <div
      className={`channel-video-count-badge ${episodeCount ? "has-videos" : "is-empty"}`}
      title={summary}
      aria-label={summary}
    >
      <FilmSlate size={13} weight={episodeCount ? "fill" : "regular"} className="count-icon" />
      <span className="count-number">{count}</span>
      <span className="count-label">{unitLabel}</span>
    </div>
  );
}
