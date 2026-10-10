import type { TopicSlotArchetypeDefinition } from "./topicMatrix.constants.js";

const QUIZ_SHORT_READABILITY_NOTE = "choices must be readable in two seconds";

/**
 * Quiz Short slots: portrait 9:16 quizzes of five short questions sourced from one bank topic.
 * Every archetype maps to a portrait layout from QUIZ_PORTRAIT_LAYOUT_IDS.
 */
export const QUIZ_SHORT_ARCHETYPE_DEFINITIONS: readonly TopicSlotArchetypeDefinition[] = [
  {
    name: "Deep Trivia (Quiz Short)",
    archetype: "deep_trivia",
    suggestedLayout: "short_stack_list",
    quizFormat: "multiple_choice",
    contentKind: "quiz_short",
    description: `Five escalating knowledge questions from one topic in a stacked portrait list; ${QUIZ_SHORT_READABILITY_NOTE}`,
  },
  {
    name: "Yes or No (Quiz Short)",
    archetype: "verdict_yes_no",
    suggestedLayout: "short_verdict_yes_no",
    quizFormat: "yes_no",
    contentKind: "quiz_short",
    description: `Five surprising Yes/No verdicts from one topic with big two-button choices; ${QUIZ_SHORT_READABILITY_NOTE}`,
  },
  {
    name: "Versus Face-off (Quiz Short)",
    archetype: "versus_faceoff",
    suggestedLayout: "short_versus_two",
    quizFormat: "multiple_choice",
    contentKind: "quiz_short",
    description: `Five head-to-head showdowns from one topic on a stacked two-card split; ${QUIZ_SHORT_READABILITY_NOTE}`,
  },
  {
    name: "Visual Identification (Quiz Short)",
    archetype: "visual_identification",
    suggestedLayout: "short_media_top_choices",
    quizFormat: "multiple_choice",
    contentKind: "quiz_short",
    description: `Five picture-recognition questions from one topic with at most two images per question; ${QUIZ_SHORT_READABILITY_NOTE}`,
  },
] as const;
