import type { QuizQuestionFormat } from "./enums/quiz/pipelineEnums.js";
import type { ResolvedQuizLayoutId } from "./quizLayouts.catalog.js";

export type QuizGameplayArchetypeId =
  | "deep_trivia"
  | "visual_spotting"
  | "verdict_true_false"
  | "verdict_fact_myth"
  | "versus_faceoff"
  | "visual_identification"
  | "speed_blitz"
  | "mystery_reveal"
  | "clue_deduction";

export interface QuizGameplayArchetypeBlueprint {
  id: QuizGameplayArchetypeId;
  name: string;
  description: string;
  defaultFormat: QuizQuestionFormat;
  targetLayout: ResolvedQuizLayoutId;
  creativeAngles: readonly string[];
}

export const QUIZ_GAMEPLAY_ARCHETYPES: readonly QuizGameplayArchetypeBlueprint[] = [
  {
    id: "deep_trivia",
    name: "Deep Trivia",
    description: "In-depth knowledge challenge featuring a prominent subject illustration on the left and 3 answer choices on the right.",
    defaultFormat: "multiple_choice",
    targetLayout: "media_left_choices_right",
    creativeAngles: ["Historical Secrets", "Natural Phenomena", "World Exploration", "Famous Figures & Landmarks"],
  },
  {
    id: "visual_spotting",
    name: "Visual Spotting",
    description: "Visual spotting challenge finding anomalies, differences, or synthetic impostors across 3 full-bleed images without text.",
    defaultFormat: "odd_one_out",
    targetLayout: "visual_choices_three_pure",
    creativeAngles: ["Find the Anomaly", "Real vs AI Generated", "Spot the Flaw", "Identify the Impostor"],
  },
  {
    id: "verdict_true_false",
    name: "True or False",
    description: "Verdict evaluation question testing True vs False with a cinematic background visual and 2 prominent TRUE / FALSE buttons.",
    defaultFormat: "true_false",
    targetLayout: "verdict_true_false",
    creativeAngles: ["Surprising Realities & Misconceptions", "Human Body Surprises", "Counter-Intuitive Truths", "Strange Laws Around the World"],
  },
  {
    id: "versus_faceoff",
    name: "Versus Face-off (1v1)",
    description: "Head-to-head comparison between two entities or characters across a balanced split-screen layout.",
    defaultFormat: "multiple_choice",
    targetLayout: "split_versus_two",
    creativeAngles: ["Who is Faster / Stronger", "Scale & Power Comparison", "Pick Your Side", "Historic Showdowns"],
  },
  {
    id: "visual_identification",
    name: "Visual Identification",
    description: "Identification challenge recognizing objects, creatures, or landmarks across 3 labeled visual cards.",
    defaultFormat: "multiple_choice",
    targetLayout: "visual_choices_three",
    creativeAngles: ["Silhouette Identification", "Macro Zoom Guessing", "Country Flags & Symbols", "Item Ownership"],
  },
  {
    id: "speed_blitz",
    name: "Speed Blitz (Rapid Reflex)",
    description: "Fast-paced rapid reflex riddles, mental math, or wordplay formatted in a clean text-focused layout.",
    defaultFormat: "multiple_choice",
    targetLayout: "full_stack_list",
    creativeAngles: ["Tricky Brainteasers", "Rapid Logic Math", "Wordplay & Puns", "Mental Math Blitz"],
  },
  {
    id: "mystery_reveal",
    name: "Mystery Reveal (Silhouette)",
    description: "Visual mystery challenge obscured by dark silhouette or pixelation, revealed via laser scanner animation.",
    defaultFormat: "image_guess",
    targetLayout: "mystery_reveal",
    creativeAngles: [
      "Who's That Character / Silhouette",
      "Animal Silhouette Guess",
      "Macro / Microscopic Guessing",
      "Hidden Shape Identification",
    ],
  },
  {
    id: "clue_deduction",
    name: "Clue Deduction (Detective)",
    description: "Detective deduction challenge connecting clue image A to surprise reveal answer B.",
    defaultFormat: "image_guess",
    targetLayout: "clue_deduction",
    creativeAngles: [
      "Identify Profession by Tool",
      "Identify Country by Dish or Landmark",
      "Identify Creature by Track or Habitat",
      "Identify Historical Figure by Artifact",
    ],
  },
] as const;

export function getQuizGameplayArchetype(id: QuizGameplayArchetypeId | string): QuizGameplayArchetypeBlueprint | undefined {
  const targetId = id === "verdict_fact_myth" ? "verdict_true_false" : id;
  return QUIZ_GAMEPLAY_ARCHETYPES.find((archetype) => archetype.id === targetId);
}
