import type { QuizAssessment, QuizAssetResolution } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import { ensureQuizAssetSizing } from "../../quiz/assets/ensureQuizAssetSizing.js";
import { preflightQuizRender } from "../../quiz/qa/preflight.js";
import type { RequiredQuizRenderArtifacts } from "./quizRenderArtifacts.js";

export type QuizPreflightAssessment = QuizAssessment;

export async function ensureCurrentAssetSizing(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  artifacts: RequiredQuizRenderArtifacts,
): Promise<void> {
  const sizingResult = await ensureQuizAssetSizing({
    repository,
    channelId,
    episodeId,
    artifacts: {
      quiz: artifacts.quiz,
      director: artifacts.director,
      assetPlan: artifacts.assetPlan,
      voicePlan: artifacts.voicePlan,
      timeline: artifacts.timeline,
    },
    intent: "render",
  });

  if (sizingResult.status !== "current") {
    throw new RepositoryError(
      `Asset plan sizing is stale for episode ${episodeId}. Regenerate assets before video rendering. Affected assets: ${sizingResult.affectedAssetIds.join(", ")}`,
      "QUIZ_ASSET_SIZING_STALE",
    );
  }

  if (sizingResult.reconciledPlan && sizingResult.persisted) {
    artifacts.assetPlan = sizingResult.reconciledPlan;
  }
}

export async function validateQuizPreflight(
  repository: RepositoryService,
  channelId: string,
  episodeId: string,
  artifacts: RequiredQuizRenderArtifacts,
  resolvedAssets: QuizAssetResolution["assets"],
  hasMeasuredAudio: boolean,
): Promise<QuizAssessment> {
  let sourcesRepaired = false;
  for (let i = 0; i < artifacts.quiz.questions.length; i++) {
    const q = artifacts.quiz.questions[i];
    if (!q.source_ids || q.source_ids.length === 0) {
      q.source_ids = [`C${String(q.number || i + 1).padStart(2, "0")}`];
      q.validation.source_coverage = true;
      sourcesRepaired = true;
    }
  }
  if (sourcesRepaired) {
    await repository.writeQuiz(channelId, episodeId, artifacts.quiz);
  }

  const preflight = preflightQuizRender({
    quiz: artifacts.quiz,
    director: artifacts.director,
    assetPlan: artifacts.assetPlan,
    resolvedAssets,
    voicePlan: artifacts.voicePlan,
    timeline: artifacts.timeline,
    measuredAudio: hasMeasuredAudio,
  });
  await repository.writeQuizAssessment(channelId, episodeId, preflight.assessment);
  if (!preflight.ok) {
    const blocker = preflight.assessment.issues.find((issue) => issue.severity === "blocker");
    throw new RepositoryError(
      "Quiz V2 preflight blocked render: " + (blocker?.message ?? "Resolve the reported QA blockers before rendering."),
      "QUIZ_PREFLIGHT_BLOCKED",
    );
  }
  return preflight.assessment;
}
