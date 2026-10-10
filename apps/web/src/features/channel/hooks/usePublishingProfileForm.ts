import { useCallback, useMemo, useRef, useState } from "react";
import { CHANNEL_PLAYLIST_LINKS_MAX, type ChannelPublishingProfile } from "@studio/shared";
import {
  createPublishingProfileDraft,
  hasPublishingProfileErrors,
  toPublishingProfilePayload,
  validatePublishingProfileDraft,
  type PlaylistDraft,
  type PublishingProfileDraft,
} from "../utils/publishingProfileForm";

export function usePublishingProfileForm(initialProfile: ChannelPublishingProfile | undefined) {
  const nextIdRef = useRef(0);
  const createId = useCallback(() => `playlist-${(nextIdRef.current += 1)}`, []);
  const [draft, setDraft] = useState<PublishingProfileDraft>(() => createPublishingProfileDraft(initialProfile, createId));

  const errors = useMemo(() => validatePublishingProfileDraft(draft), [draft]);

  const setChannelUrl = useCallback((channelUrl: string) => setDraft((current) => ({ ...current, channelUrl })), []);
  const setAboutText = useCallback((aboutText: string) => setDraft((current) => ({ ...current, aboutText })), []);

  const addPlaylist = useCallback(() => {
    setDraft((current) =>
      current.playlists.length >= CHANNEL_PLAYLIST_LINKS_MAX
        ? current
        : { ...current, playlists: [...current.playlists, { id: createId(), title: "", url: "" }] },
    );
  }, [createId]);

  const updatePlaylist = useCallback((id: string, patch: Partial<Omit<PlaylistDraft, "id">>) => {
    setDraft((current) => ({
      ...current,
      playlists: current.playlists.map((playlist) => (playlist.id === id ? { ...playlist, ...patch } : playlist)),
    }));
  }, []);

  const removePlaylist = useCallback((id: string) => {
    setDraft((current) => ({ ...current, playlists: current.playlists.filter((playlist) => playlist.id !== id) }));
  }, []);

  return {
    draft,
    errors,
    isValid: !hasPublishingProfileErrors(errors),
    canAddPlaylist: draft.playlists.length < CHANNEL_PLAYLIST_LINKS_MAX,
    setChannelUrl,
    setAboutText,
    addPlaylist,
    updatePlaylist,
    removePlaylist,
    toPayload: () => toPublishingProfilePayload(draft),
  };
}

export type PublishingProfileForm = ReturnType<typeof usePublishingProfileForm>;
