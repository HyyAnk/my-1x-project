import type { ARCHETYPE_SLOT_DEFINITIONS } from "./topicMatrix.constants.js";

export type TopicMatrixSlotArchetype = (typeof ARCHETYPE_SLOT_DEFINITIONS)[number]["archetype"];

export type TopicMatrixSuggestedLayout = (typeof ARCHETYPE_SLOT_DEFINITIONS)[number]["suggestedLayout"];

export type TopicMatrixQuizFormat = (typeof ARCHETYPE_SLOT_DEFINITIONS)[number]["quizFormat"];

export interface TopicMatrixSlotPlan {
  slot: number;
  name: string;
  domainId: string;
  domainTitle: string;
  archetype: TopicMatrixSlotArchetype;
  suggestedLayout: TopicMatrixSuggestedLayout;
  quizFormat: TopicMatrixQuizFormat;
  description: string;
  isKeySteered: boolean;
  contentKind: "episode" | "short_reel";
}

export interface TopicMatrixPlan {
  slots: TopicMatrixSlotPlan[];
  steeredKeyword?: string;
  aspectRatio?: "16:9";
}
