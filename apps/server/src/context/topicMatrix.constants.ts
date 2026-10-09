import type { QuizGameplayArchetypeId, QuizQuestionFormat, ResolvedQuizLayoutId } from "@studio/shared";

export { CANONICAL_FALLBACK_DOMAINS, KEYWORD_SYNONYMS, type TopicDomainOption } from "./topicDomainCatalog.js";

export interface TopicSlotArchetypeDefinition {
  name: string;
  archetype: QuizGameplayArchetypeId;
  suggestedLayout: ResolvedQuizLayoutId;
  quizFormat: QuizQuestionFormat;
  contentKind: "episode" | "short_reel";
  description: string;
}

export const EPISODE_ARCHETYPE_DEFINITIONS: readonly TopicSlotArchetypeDefinition[] = [
  {
    name: "Deep Trivia (Episode)",
    archetype: "deep_trivia",
    suggestedLayout: "media_left_choices_right",
    quizFormat: "multiple_choice",
    contentKind: "episode",
    description: "Knowledge/story quiz with a single hero subject scene",
  },
  {
    name: "Silhouette / Mystery Reveal (Episode)",
    archetype: "mystery_reveal",
    suggestedLayout: "mystery_reveal",
    quizFormat: "image_guess",
    contentKind: "episode",
    description: "Guess animal/object/food through shadow/silhouette or pixelated mosaic, revealed with laser scanner wipe",
  },
  {
    name: "Yes or No (Episode)",
    archetype: "verdict_yes_no",
    suggestedLayout: "verdict_yes_no",
    quizFormat: "yes_no",
    contentKind: "episode",
    description: "Surprising truths and misconceptions as kid-friendly Yes/No questions",
  },
  {
    name: "Visual Spotting (Episode)",
    archetype: "visual_spotting",
    suggestedLayout: "visual_choices_three_pure",
    quizFormat: "odd_one_out",
    contentKind: "episode",
    description: "Spot the anomaly, intruder, or odd one out across 3 visual choices",
  },
  {
    name: "Visual Identification (Episode)",
    archetype: "visual_identification",
    suggestedLayout: "visual_choices_three",
    quizFormat: "multiple_choice",
    contentKind: "episode",
    description: "Visual recognition challenge across 3 labeled visual clue cards",
  },
  {
    name: "Speed Blitz (Episode)",
    archetype: "speed_blitz",
    suggestedLayout: "full_stack_list",
    quizFormat: "multiple_choice",
    contentKind: "episode",
    description: "Fast-paced rapid reflex riddles or tricky wordplay in clean stacked layout",
  },
  {
    name: "Versus Face-off (Episode)",
    archetype: "versus_faceoff",
    suggestedLayout: "split_versus_two",
    quizFormat: "multiple_choice",
    contentKind: "episode",
    description: "Head-to-head comparison and 1v1 showdown across balanced split screen",
  },
] as const;

export const SHORT_REEL_ARCHETYPE_DEFINITIONS: readonly TopicSlotArchetypeDefinition[] = [
  {
    name: "Versus Face-off (Short-Reel)",
    archetype: "versus_faceoff",
    suggestedLayout: "split_versus_two",
    quizFormat: "multiple_choice",
    contentKind: "short_reel",
    description: "1v1 Face-off Short-Reel (9:16 vertical, 1 question)",
  },
  {
    name: "Deep Trivia (Short-Reel)",
    archetype: "deep_trivia",
    suggestedLayout: "media_left_choices_right",
    quizFormat: "multiple_choice",
    contentKind: "short_reel",
    description: "Deep Trivia Short-Reel (9:16 vertical, 1 question)",
  },
  {
    name: "Yes or No (Short-Reel)",
    archetype: "verdict_yes_no",
    suggestedLayout: "verdict_yes_no",
    quizFormat: "yes_no",
    contentKind: "short_reel",
    description: "Yes or No Short-Reel verdict showdown (9:16 vertical, 1 question)",
  },
] as const;

export function shuffleArray<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateRandomSlotDefinitions(): Array<TopicSlotArchetypeDefinition & { slot: number }> {
  const shuffledEpisodes = shuffleArray(EPISODE_ARCHETYPE_DEFINITIONS).slice(0, 4);
  const shuffledShorts = shuffleArray(SHORT_REEL_ARCHETYPE_DEFINITIONS);
  const extraShort = shuffledShorts[Math.floor(Math.random() * shuffledShorts.length)];
  const fourShorts = [...shuffledShorts, extraShort];

  return [
    { ...shuffledEpisodes[0], slot: 1 },
    { ...shuffledEpisodes[1], slot: 2 },
    { ...shuffledEpisodes[2], slot: 3 },
    { ...shuffledEpisodes[3], slot: 4 },
    { ...fourShorts[0], slot: 5 },
    { ...fourShorts[1], slot: 6 },
    { ...fourShorts[2], slot: 7 },
    { ...fourShorts[3], slot: 8 },
  ];
}

export const ARCHETYPE_SLOT_DEFINITIONS = [
  {
    slot: 1,
    name: "Deep Trivia (Episode)",
    archetype: "deep_trivia" as const,
    suggestedLayout: "media_left_choices_right" as const,
    quizFormat: "multiple_choice" as const,
    contentKind: "episode" as const,
    description: "Knowledge/story quiz with a single hero subject scene",
  },
  {
    slot: 2,
    name: "Silhouette / Mystery Reveal (Episode)",
    archetype: "mystery_reveal" as const,
    suggestedLayout: "mystery_reveal" as const,
    quizFormat: "image_guess" as const,
    contentKind: "episode" as const,
    description: "Guess animal/object/food through shadow/silhouette or pixelated mosaic, revealed with laser scanner wipe",
  },
  {
    slot: 3,
    name: "Yes or No (Episode)",
    archetype: "verdict_yes_no" as const,
    suggestedLayout: "verdict_yes_no" as const,
    quizFormat: "yes_no" as const,
    contentKind: "episode" as const,
    description: "Surprising truths and misconceptions as kid-friendly Yes/No questions",
  },
  {
    slot: 4,
    name: "Visual Identification (Episode)",
    archetype: "visual_identification" as const,
    suggestedLayout: "visual_choices_three" as const,
    quizFormat: "multiple_choice" as const,
    contentKind: "episode" as const,
    description: "Visual recognition challenge across 3 labeled visual clue cards",
  },
  {
    slot: 5,
    name: "Versus Face-off (Short-Reel)",
    archetype: "versus_faceoff" as const,
    suggestedLayout: "split_versus_two" as const,
    quizFormat: "multiple_choice" as const,
    contentKind: "short_reel" as const,
    description: "1v1 Face-off Short-Reel (9:16 vertical, 1 question)",
  },
  {
    slot: 6,
    name: "Deep Trivia (Short-Reel)",
    archetype: "deep_trivia" as const,
    suggestedLayout: "media_left_choices_right" as const,
    quizFormat: "multiple_choice" as const,
    contentKind: "short_reel" as const,
    description: "Deep Trivia Short-Reel (9:16 vertical, 1 question)",
  },
  {
    slot: 7,
    name: "Yes or No (Short-Reel)",
    archetype: "verdict_yes_no" as const,
    suggestedLayout: "verdict_yes_no" as const,
    quizFormat: "yes_no" as const,
    contentKind: "short_reel" as const,
    description: "Yes or No Short-Reel verdict showdown (9:16 vertical, 1 question)",
  },
  {
    slot: 8,
    name: "Versus Clash (Short-Reel)",
    archetype: "versus_faceoff" as const,
    suggestedLayout: "split_versus_two" as const,
    quizFormat: "multiple_choice" as const,
    contentKind: "short_reel" as const,
    description: "High-stakes 1v1 Face-off Short-Reel (9:16 vertical, 1 question)",
  },
] as const;
