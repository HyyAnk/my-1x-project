import { ArrowSquareOut, Check, Copy, Info, Playlist } from "@phosphor-icons/react";
import type { Channel, PlaylistAssignmentInput, PlaylistDomainSource } from "@studio/shared";
import type { Notice } from "../../../../components/types";
import { useVideoPlaylists, type AssignedPlaylistItem } from "../../hooks/useVideoPlaylists";

export interface VideoPlaylistCardProps {
  channel: Channel;
  input: PlaylistAssignmentInput;
  onNotice?: (notice: NonNullable<Notice>) => void;
}

const DOMAIN_SOURCE_NOTES: Partial<Record<PlaylistDomainSource, string>> = {
  inferred: "Topic playlist inferred from the video topic.",
  none: "No topic playlist matched this video. Pick a topic playlist manually.",
};

interface PlaylistRowProps {
  item: AssignedPlaylistItem;
  copied: boolean;
  onCopy: (item: AssignedPlaylistItem) => void;
}

function PlaylistRow({ item, copied, onCopy }: PlaylistRowProps) {
  const { definition, role, url } = item;
  return (
    <li className={`video-playlist-row is-${role}`}>
      <span className="video-playlist-role">{role === "primary" ? "Primary" : "Also add to"}</span>
      <div className="video-playlist-name">
        <strong>{definition.title}</strong>
        <span>{definition.summary}</span>
      </div>
      <span className="video-playlist-format">{definition.format === "shorts" ? "Shorts" : "Long-form"}</span>
      <div className="video-playlist-actions">
        {url && (
          <a className="quiet-button compact" href={url} target="_blank" rel="noreferrer" title="Open playlist on YouTube">
            <ArrowSquareOut size={14} />
          </a>
        )}
        <button
          type="button"
          className={`bento-copy-pill ${copied ? "is-copied" : ""}`}
          onClick={() => onCopy(item)}
          title={`Copy "${definition.title}"`}
        >
          {copied ? <Check size={12} weight="bold" /> : <Copy size={12} weight="duotone" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </li>
  );
}

/** Shows which fixed YouTube playlists this video should be added to. */
export function VideoPlaylistCard({ channel, input, onNotice }: VideoPlaylistCardProps) {
  const { assignment, items, copiedKey, copyTitle } = useVideoPlaylists({ channel, input, onNotice });
  // Shorts playlists depend on gameplay only, so the topic note applies to Episodes alone.
  const note = input.contentKind === "episode" ? DOMAIN_SOURCE_NOTES[assignment.domainSource] : undefined;

  return (
    <section className="video-description-panel video-playlist-panel" data-testid="video-playlist-card">
      <div className="video-description-header">
        <div className="video-description-title-group">
          <h2 className="video-description-title">
            <Playlist size={22} weight="duotone" color="var(--accent)" />
            <span>YouTube Playlist</span>
          </h2>
          <span
            className="info-tooltip-trigger video-title-info"
            title="Fixed mapping from the topic domain and gameplay to the channel playlists. Add a link with the same playlist name in the channel publishing profile to open it from here."
          >
            <Info size={15} />
          </span>
        </div>
      </div>

      {items.length > 0 && (
        <ul className="video-playlist-list">
          {items.map((item) => (
            <PlaylistRow key={item.definition.key} item={item} copied={copiedKey === item.definition.key} onCopy={(target) => void copyTitle(target)} />
          ))}
        </ul>
      )}
      {note && <p className="video-title-empty">{note}</p>}
    </section>
  );
}
