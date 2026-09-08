import type { DirectorPlan, Episode, QuizImageStyle, QuizV2, Task } from "@studio/shared";

export interface CreateEpisodeFromQuestionBankInput {
  question_id: string;
  target_language?: string;
  render_aspect_ratio?: "16:9";
  auto_start_pipeline?: boolean;
  visual_style?: QuizImageStyle | "mixed";
  force?: boolean;
}

export interface CreateEpisodeFromQuestionBankResult {
  episode: Episode;
  task: Task | null;
  cooldown_recorded: boolean;
  quiz: QuizV2;
  director_plan: DirectorPlan;
}

export interface CreateEpisodeFromTopicWithBankInput {
  topic_id: string;
  question_count?: number;
  target_language?: string;
  render_aspect_ratio?: "16:9";
  auto_start_pipeline?: boolean;
  visual_style?: QuizImageStyle | "mixed";
  force?: boolean;
  request_id?: string;
}

export interface CreateEpisodeFromTopicWithBankResult {
  episode: Episode;
  task: Task | null;
  quiz: QuizV2;
  director_plan: DirectorPlan;
  curated_source: "bank_only" | "jit_only" | "hybrid";
  question_ids: string[];
  cooldown_recorded: boolean;
}

export { resolveEpisodeVisualStyles, triggerPipelineTask } from "./bootstrapperHelpers.js";
export type { BuildEpisodeRecordParams, EpisodeDirectoryContext } from "./bootstrapperHelpers.js";
export { bootstrapSingleQuestionEpisode } from "./singleQuestionBootstrapper.js";
export type { BootstrapSingleQuestionEpisodeParams } from "./singleQuestionBootstrapper.js";
export { bootstrapTopicEpisode } from "./topicEpisodeBootstrapper.js";
export type { BootstrapTopicEpisodeParams } from "./topicEpisodeBootstrapper.js";
export type { BootstrapEpisodeResult } from "./bootstrapperTypes.js";
