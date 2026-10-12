import type { Channel } from "@studio/shared";

function normalizePlaylistTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Finds the channel's saved YouTube link for a playlist by matching its title (case-insensitive). */
export function findChannelPlaylistUrl(channel: Channel, playlistTitle: string): string | null {
  const target = normalizePlaylistTitle(playlistTitle);
  const match = channel.publishing_profile?.playlists.find((link) => normalizePlaylistTitle(link.title) === target);
  return match?.url ?? null;
}
