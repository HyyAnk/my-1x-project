import type { ChannelPlaylistLink, ChannelPublishingProfile } from "@studio/shared";
import type { DescriptionFooterLabels } from "./description.types.js";

/** Minimum share of category words a playlist title must contain to count as a match. */
const PLAYLIST_MATCH_THRESHOLD = 0.5;
const WORD_SPLITTER = /[^\p{L}\p{N}]+/u;
/** Words shared by nearly every quiz playlist; matching on them would link the wrong playlist. */
const GENERIC_PLAYLIST_WORDS = new Set([
  "quiz",
  "quizzes",
  "trivia",
  "challenge",
  "challenges",
  "game",
  "games",
  "test",
  "and",
  "the",
  "of",
  "for",
]);

function tokenize(text: string): string[] {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .split(WORD_SPLITTER)
    .filter((token) => token && !GENERIC_PLAYLIST_WORDS.has(token));
}

interface PlaylistMatch {
  link: ChannelPlaylistLink;
  ratio: number;
  shared: number;
}

function scorePlaylist(categoryTokens: string[], link: ChannelPlaylistLink): PlaylistMatch {
  const titleTokens = new Set(tokenize(link.title));
  if (categoryTokens.length === 0 || titleTokens.size === 0) return { link, ratio: 0, shared: 0 };
  const shared = categoryTokens.filter((token) => titleTokens.has(token)).length;
  return { link, ratio: shared / Math.min(categoryTokens.length, titleTokens.size), shared };
}

function isBetterMatch(candidate: PlaylistMatch, best: PlaylistMatch | null): boolean {
  if (candidate.ratio < PLAYLIST_MATCH_THRESHOLD) return false;
  if (!best) return true;
  return candidate.ratio > best.ratio || (candidate.ratio === best.ratio && candidate.shared > best.shared);
}

/**
 * Picks the channel playlist whose title best matches the suggested category,
 * so the description links to a real playlist instead of printing an internal label.
 */
export function matchPlaylistLink(categories: string[], playlists: ChannelPlaylistLink[]): ChannelPlaylistLink | null {
  let best: PlaylistMatch | null = null;
  for (const category of categories) {
    const tokens = Array.from(new Set(tokenize(category)));
    for (const link of playlists) {
      const candidate = scorePlaylist(tokens, link);
      if (isBetterMatch(candidate, best)) best = candidate;
    }
  }
  return best?.link ?? null;
}

/** Appends YouTube's subscribe-confirmation flag so the link opens the subscribe prompt. */
export function buildSubscribeUrl(channelUrl: string): string {
  const url = new URL(channelUrl);
  url.searchParams.set("sub_confirmation", "1");
  return url.toString();
}

export interface ChannelFooterInput {
  profile?: ChannelPublishingProfile | null;
  channelName: string;
  categories: string[];
  labels: DescriptionFooterLabels;
}

/**
 * Builds the channel footer (matching playlist, subscribe link, about line).
 * Returns an empty string when the channel has no publishing profile yet.
 */
export function buildChannelFooter(input: ChannelFooterInput): string {
  const { profile, channelName, categories, labels } = input;
  if (!profile) return "";
  const playlist = matchPlaylistLink(categories, profile.playlists);
  const aboutText = profile.about_text.trim();
  return [
    playlist ? `${labels.morePlaylist} ${playlist.url}` : "",
    profile.channel_url ? `${labels.subscribe} ${buildSubscribeUrl(profile.channel_url)}` : "",
    aboutText ? `${labels.about} ${channelName}: ${aboutText}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
