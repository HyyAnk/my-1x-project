import { inferCanonicalDomainFromText } from "../taxonomy/canonicalDomains.js";
import {
  DOMAIN_TOPIC_PLAYLIST,
  PICTURE_GAMEPLAY_ARCHETYPES,
  PICTURE_QUIZ_FORMATS,
  SHORTS_ARCHETYPE_PLAYLIST,
  YOUTUBE_PLAYLIST_CATALOG,
} from "./youtubePlaylistCatalog.js";
import type {
  PlaylistAssignment,
  PlaylistAssignmentInput,
  PlaylistDomainSource,
  YouTubePlaylistDefinition,
  YouTubePlaylistKey,
} from "./youtubePlaylist.types.js";

interface ResolvedDomain {
  domainId: string | null;
  source: PlaylistDomainSource;
}

function resolveDomain(input: PlaylistAssignmentInput): ResolvedDomain {
  if (input.domainId && DOMAIN_TOPIC_PLAYLIST[input.domainId]) return { domainId: input.domainId, source: "stored" };
  const inferred = inferCanonicalDomainFromText(input.topicText);
  if (inferred && DOMAIN_TOPIC_PLAYLIST[inferred]) return { domainId: inferred, source: "inferred" };
  return { domainId: input.domainId ?? null, source: "none" };
}

function toDefinitions(keys: Array<YouTubePlaylistKey | undefined>): YouTubePlaylistDefinition[] {
  const unique = [...new Set(keys.filter((key): key is YouTubePlaylistKey => Boolean(key)))];
  return unique.map((key) => YOUTUBE_PLAYLIST_CATALOG[key]);
}

function isPictureGameplay(input: PlaylistAssignmentInput): boolean {
  return Boolean(
    (input.archetype && PICTURE_GAMEPLAY_ARCHETYPES.has(input.archetype)) || (input.quizFormat && PICTURE_QUIZ_FORMATS.has(input.quizFormat)),
  );
}

/** Episodes: topic playlist first, plus "Guess the Picture" for picture-driven gameplay. */
function resolveEpisodeKeys(input: PlaylistAssignmentInput, domainId: string | null): Array<YouTubePlaylistKey | undefined> {
  const topicKey = domainId ? DOMAIN_TOPIC_PLAYLIST[domainId] : undefined;
  return [topicKey, isPictureGameplay(input) ? "guess_the_picture" : undefined];
}

/** Quiz Shorts always live in "Quick Quiz Shorts"; Short Reels go to their gameplay playlist first. */
function resolveShortsKeys(input: PlaylistAssignmentInput): Array<YouTubePlaylistKey | undefined> {
  const gameplayKey = input.archetype ? SHORTS_ARCHETYPE_PLAYLIST[input.archetype] : undefined;
  if (input.contentKind === "quiz_short") return ["quick_quiz_shorts", gameplayKey];
  return [gameplayKey ?? "quick_quiz_shorts"];
}

/** Resolves which fixed YouTube playlists a video should be added to. */
export function resolveYouTubePlaylistAssignment(input: PlaylistAssignmentInput): PlaylistAssignment {
  const domain = resolveDomain(input);
  const keys = input.contentKind === "episode" ? resolveEpisodeKeys(input, domain.domainId) : resolveShortsKeys(input);
  const [primary = null, ...secondary] = toDefinitions(keys);
  return { primary, secondary, domainId: domain.domainId, domainSource: domain.source };
}

/** All playlist titles for an assignment, primary first. */
export function listAssignedPlaylistTitles(assignment: PlaylistAssignment): string[] {
  return [assignment.primary, ...assignment.secondary].filter((item): item is YouTubePlaylistDefinition => Boolean(item)).map((item) => item.title);
}
