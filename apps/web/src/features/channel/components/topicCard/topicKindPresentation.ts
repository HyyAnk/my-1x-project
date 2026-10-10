import type { TopicCandidate, TopicContentKind } from "@studio/shared";

export interface TopicKindPresentation {
  kind: TopicContentKind;
  /** Short product name shown on cards and buttons. */
  label: string;
  aspectRatio: "16:9" | "9:16";
  isPortrait: boolean;
  /** Text for the card's format pill, e.g. "9:16 Quiz Short". */
  badgeText: string;
  selectLabel: string;
  busyLabel: string;
}

const KIND_PRESENTATIONS: Record<TopicContentKind, TopicKindPresentation> = {
  episode: {
    kind: "episode",
    label: "Episode",
    aspectRatio: "16:9",
    isPortrait: false,
    badgeText: "16:9 Episode",
    selectLabel: "Select Topic",
    busyLabel: "Selecting Topic…",
  },
  quiz_short: {
    kind: "quiz_short",
    label: "Quiz Short",
    aspectRatio: "9:16",
    isPortrait: true,
    badgeText: "9:16 Quiz Short",
    selectLabel: "Select Quiz Short",
    busyLabel: "Creating Quiz Short…",
  },
  short_reel: {
    kind: "short_reel",
    label: "Short-Reel",
    aspectRatio: "9:16",
    isPortrait: true,
    badgeText: "9:16 Short-Reel",
    selectLabel: "Select Short-Reel",
    busyLabel: "Creating Short-Reel…",
  },
};

const ARCHETYPE_LABELS: Record<string, string> = {
  versus_faceoff: "Versus Face-off",
  verdict_yes_no: "Yes or No",
  visual_identification: "Visual Identification",
  deep_trivia: "Deep Trivia",
};

export function getTopicKindPresentation(kind: TopicContentKind): TopicKindPresentation {
  return KIND_PRESENTATIONS[kind] ?? KIND_PRESENTATIONS.episode;
}

/** Human label for the gameplay archetype of a portrait (Quiz Short or Short-Reel) candidate. */
export function getTopicArchetypeLabel(archetype: TopicCandidate["archetype"]): string {
  return (archetype && ARCHETYPE_LABELS[archetype]) || "Deep Trivia";
}
