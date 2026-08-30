import type { ResolvedQuizLayoutId } from "@studio/shared";

export type EpisodePreviewQuestion = {
  id: string;
  number: number;
  text: string;
  choices: string[];
  correctChoiceIndex: number;
  factText: string;
  totalQuestions: number;
  layoutId: ResolvedQuizLayoutId;
  layoutSource: "director" | "inferred" | "topic_template";
};
