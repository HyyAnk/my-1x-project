import type { RepositoryService } from "../../repository.js";

export type QuizRenderArtifactRepository = Pick<
  RepositoryService,
  "readQuiz" | "readDirectorPlan" | "readAssetPlan" | "readVoicePlan" | "readQuizTimeline"
>;

export type RequiredQuizRenderArtifacts = {
  quiz: NonNullable<Awaited<ReturnType<RepositoryService["readQuiz"]>>>;
  director: NonNullable<Awaited<ReturnType<RepositoryService["readDirectorPlan"]>>>;
  assetPlan: NonNullable<Awaited<ReturnType<RepositoryService["readAssetPlan"]>>>;
  voicePlan: NonNullable<Awaited<ReturnType<RepositoryService["readVoicePlan"]>>>;
  timeline: NonNullable<Awaited<ReturnType<RepositoryService["readQuizTimeline"]>>>;
};
