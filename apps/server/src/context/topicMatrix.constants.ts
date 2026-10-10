import type { QuizGameplayArchetypeId, QuizQuestionFormat, ResolvedQuizLayoutId, TopicContentKind } from "@studio/shared";
import { QUIZ_SHORT_ARCHETYPE_DEFINITIONS } from "./topicMatrix.quizShort.constants.js";

export { CANONICAL_FALLBACK_DOMAINS, KEYWORD_SYNONYMS, type TopicDomainOption } from "./topicDomainCatalog.js";
export { QUIZ_SHORT_ARCHETYPE_DEFINITIONS } from "./topicMatrix.quizShort.constants.js";

export interface TopicSlotArchetypeDefinition {
  name: string;
  archetype: QuizGameplayArchetypeId;
  suggestedLayout: ResolvedQuizLayoutId;
  quizFormat: QuizQuestionFormat;
  contentKind: TopicContentKind;
  description: string;
}

export type TopicSlotDefinition = TopicSlotArchetypeDefinition & { slot: number };

/** Slots per content kind in one suggestion run, in Topics tab order: Episode, Quiz Short, Short Reel. */
export const TOPIC_SLOTS_PER_KIND = 4;

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

const VERSUS_CLASH_SHORT_REEL_DEFINITION: TopicSlotArchetypeDefinition = {
  name: "Versus Clash (Short-Reel)",
  archetype: "versus_faceoff",
  suggestedLayout: "split_versus_two",
  quizFormat: "multiple_choice",
  contentKind: "short_reel",
  description: "High-stakes 1v1 Face-off Short-Reel (9:16 vertical, 1 question)",
};

export function shuffleArray<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function numberSlots(definitions: readonly TopicSlotArchetypeDefinition[]): TopicSlotDefinition[] {
  return definitions.map((definition, index) => ({ ...definition, slot: index + 1 }));
}

function pickRandomShortReelDefinitions(): TopicSlotArchetypeDefinition[] {
  const shuffledShorts = shuffleArray(SHORT_REEL_ARCHETYPE_DEFINITIONS);
  const extraShort = shuffledShorts[Math.floor(Math.random() * shuffledShorts.length)];
  return [...shuffledShorts, extraShort];
}

/** Random slots: 1-4 Episode, 5-8 Quiz Short, 9-12 Short Reel. */
export function generateRandomSlotDefinitions(): TopicSlotDefinition[] {
  return numberSlots([
    ...shuffleArray(EPISODE_ARCHETYPE_DEFINITIONS).slice(0, TOPIC_SLOTS_PER_KIND),
    ...shuffleArray(QUIZ_SHORT_ARCHETYPE_DEFINITIONS).slice(0, TOPIC_SLOTS_PER_KIND),
    ...pickRandomShortReelDefinitions(),
  ]);
}

/** Deterministic slots: 1-4 Episode, 5-8 Quiz Short, 9-12 Short Reel. */
export const ARCHETYPE_SLOT_DEFINITIONS: readonly TopicSlotDefinition[] = numberSlots([
  EPISODE_ARCHETYPE_DEFINITIONS[0],
  EPISODE_ARCHETYPE_DEFINITIONS[1],
  EPISODE_ARCHETYPE_DEFINITIONS[2],
  EPISODE_ARCHETYPE_DEFINITIONS[4],
  ...QUIZ_SHORT_ARCHETYPE_DEFINITIONS,
  SHORT_REEL_ARCHETYPE_DEFINITIONS[0],
  SHORT_REEL_ARCHETYPE_DEFINITIONS[1],
  SHORT_REEL_ARCHETYPE_DEFINITIONS[2],
  VERSUS_CLASH_SHORT_REEL_DEFINITION,
]);
