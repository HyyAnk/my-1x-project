import { useMemo, useState } from "react";
import {
  resolveYouTubePlaylistAssignment,
  type Channel,
  type PlaylistAssignment,
  type PlaylistAssignmentInput,
  type YouTubePlaylistDefinition,
} from "@studio/shared";
import type { Notice } from "../../../components/types";
import { findChannelPlaylistUrl } from "../utils/playlistLinks";

export interface AssignedPlaylistItem {
  definition: YouTubePlaylistDefinition;
  role: "primary" | "secondary";
  url: string | null;
}

interface UseVideoPlaylistsOptions {
  channel: Channel;
  input: PlaylistAssignmentInput;
  onNotice?: (notice: NonNullable<Notice>) => void;
}

function toItems(assignment: PlaylistAssignment, channel: Channel): AssignedPlaylistItem[] {
  const primary = assignment.primary ? [{ definition: assignment.primary, role: "primary" as const }] : [];
  const secondary = assignment.secondary.map((definition) => ({ definition, role: "secondary" as const }));
  return [...primary, ...secondary].map((item) => ({ ...item, url: findChannelPlaylistUrl(channel, item.definition.title) }));
}

/** Resolves the fixed YouTube playlists for a video and handles copying their titles. */
export function useVideoPlaylists({ channel, input, onNotice }: UseVideoPlaylistsOptions) {
  const { contentKind, domainId, archetype, quizFormat, topicText } = input;
  const assignment = useMemo(
    () => resolveYouTubePlaylistAssignment({ contentKind, domainId, archetype, quizFormat, topicText }),
    [contentKind, domainId, archetype, quizFormat, topicText],
  );
  const items = useMemo(() => toItems(assignment, channel), [assignment, channel]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyTitle = async (item: AssignedPlaylistItem) => {
    try {
      await navigator.clipboard.writeText(item.definition.title);
      setCopiedKey(item.definition.key);
      window.setTimeout(() => setCopiedKey((current) => (current === item.definition.key ? null : current)), 1600);
    } catch {
      onNotice?.({ tone: "bad", message: "Failed to copy playlist name to clipboard" });
    }
  };

  return { assignment, items, copiedKey, copyTitle };
}
