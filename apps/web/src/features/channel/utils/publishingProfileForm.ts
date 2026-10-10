import { CHANNEL_PLAYLIST_LINKS_MAX, isYouTubeUrl, type ChannelPublishingProfile } from "@studio/shared";

export interface PlaylistDraft {
  id: string;
  title: string;
  url: string;
}

export interface PublishingProfileDraft {
  channelUrl: string;
  aboutText: string;
  playlists: PlaylistDraft[];
}

export interface PublishingProfileErrors {
  channelUrl: boolean;
  playlistIds: string[];
}

export function createPublishingProfileDraft(
  profile: ChannelPublishingProfile | undefined,
  createId: () => string,
): PublishingProfileDraft {
  return {
    channelUrl: profile?.channel_url ?? "",
    aboutText: profile?.about_text ?? "",
    playlists: (profile?.playlists ?? []).map((playlist) => ({ id: createId(), title: playlist.title, url: playlist.url })),
  };
}

function isBlankPlaylist(playlist: PlaylistDraft): boolean {
  return !playlist.title.trim() && !playlist.url.trim();
}

/** Blank rows are ignored; a half-filled row or a non-YouTube link is an error. */
export function validatePublishingProfileDraft(draft: PublishingProfileDraft): PublishingProfileErrors {
  const channelUrl = draft.channelUrl.trim();
  return {
    channelUrl: channelUrl.length > 0 && !isYouTubeUrl(channelUrl),
    playlistIds: draft.playlists
      .filter((playlist) => !isBlankPlaylist(playlist))
      .filter((playlist) => !playlist.title.trim() || !isYouTubeUrl(playlist.url.trim()))
      .map((playlist) => playlist.id),
  };
}

export function hasPublishingProfileErrors(errors: PublishingProfileErrors): boolean {
  return errors.channelUrl || errors.playlistIds.length > 0;
}

export function toPublishingProfilePayload(draft: PublishingProfileDraft): ChannelPublishingProfile {
  const channelUrl = draft.channelUrl.trim();
  return {
    ...(channelUrl ? { channel_url: channelUrl } : {}),
    about_text: draft.aboutText.trim(),
    playlists: draft.playlists
      .filter((playlist) => !isBlankPlaylist(playlist))
      .slice(0, CHANNEL_PLAYLIST_LINKS_MAX)
      .map((playlist) => ({ title: playlist.title.trim(), url: playlist.url.trim() })),
  };
}
