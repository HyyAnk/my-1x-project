import type { QuizGameplayArchetypeId, QuizQuestionFormat, ResolvedQuizLayoutId } from "@studio/shared";

export type TopicMatrixSlotArchetype = QuizGameplayArchetypeId;

export type TopicMatrixSuggestedLayout = ResolvedQuizLayoutId;

export type TopicMatrixQuizFormat = QuizQuestionFormat;

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
