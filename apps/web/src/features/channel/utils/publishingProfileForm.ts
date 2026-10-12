import { CHANNEL_PLAYLIST_LINKS_MAX, isYouTubeUrl, type ChannelPublishingProfile } from "@studio/shared";

export interface PlaylistDraft {
  id: string;
  title: string;
  url: string;
}

export interface PublishingProfileDraft {
  aboutText: string;
  playlists: PlaylistDraft[];
}

export interface PublishingProfileErrors {
  playlistIds: string[];
}

export function createPublishingProfileDraft(
  profile: ChannelPublishingProfile | undefined,
  createId: () => string,
): PublishingProfileDraft {
  return {
    aboutText: profile?.about_text ?? "",
    playlists: (profile?.playlists ?? []).map((playlist) => ({ id: createId(), title: playlist.title, url: playlist.url })),
  };
}

function isBlankPlaylist(playlist: PlaylistDraft): boolean {
  return !playlist.title.trim() && !playlist.url.trim();
}

/** Blank rows are ignored; a half-filled row or a non-YouTube link is an error. */
export function validatePublishingProfileDraft(draft: PublishingProfileDraft): PublishingProfileErrors {
  return {
    playlistIds: draft.playlists
      .filter((playlist) => !isBlankPlaylist(playlist))
      .filter((playlist) => !playlist.title.trim() || !isYouTubeUrl(playlist.url.trim()))
      .map((playlist) => playlist.id),
  };
}

export function hasPublishingProfileErrors(errors: PublishingProfileErrors): boolean {
  return errors.playlistIds.length > 0;
}

export function toPublishingProfilePayload(draft: PublishingProfileDraft): ChannelPublishingProfile {
  return {
    about_text: draft.aboutText.trim(),
    playlists: draft.playlists
      .filter((playlist) => !isBlankPlaylist(playlist))
      .slice(0, CHANNEL_PLAYLIST_LINKS_MAX)
      .map((playlist) => ({ title: playlist.title.trim(), url: playlist.url.trim() })),
  };
}
