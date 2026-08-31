import type { QuizAssessment, QuizTimeline } from "@studio/shared";
import { RepositoryError } from "../../../repository.js";
import { assessQuiz } from "../../qa/quizAssessment.js";
import { preflightQuizRender } from "../../qa/preflight.js";
import { assertDirectorPlanValid } from "../../director/validateDirectorPlan.js";
import { compileQuizTimeline } from "../../timeline/compileTimeline.js";
import { invalidateQuizArtifacts } from "../invalidation.js";
import { readQuizArtifacts, type QuizArtifacts, type QuizOrchestratorInput } from "../orchestrator.js";

export async function compileTimeline(
  input: QuizOrchestratorInput,
): Promise<{ timeline: QuizTimeline; artifact_path: string; invalidated: string[] }> {
  const [quiz, director_plan, voice_plan] = await Promise.all([
    input.repository.readQuiz(input.channelId, input.episodeId),
    input.repository.readDirectorPlan(input.channelId, input.episodeId),
    input.repository.readVoicePlan(input.channelId, input.episodeId),
  ]);
  if (!quiz) throw new RepositoryError("Generate the Quiz facts before compiling the timeline", "QUIZ_REQUIRED");
  if (!director_plan) throw new RepositoryError("Generate the Director plan before compiling the timeline", "DIRECTOR_REQUIRED");
  if (!voice_plan) throw new RepositoryError("Generate the voice plan before compiling the timeline", "VOICE_PLAN_REQUIRED");
  assertDirectorPlanValid(quiz, director_plan);
  const audioDurations: Record<string, number> = {};
  for (const segment of voice_plan.segments) {
    if (segment.duration_seconds !== null) audioDurations[segment.segment_id] = segment.duration_seconds;
  }
  const timeline = compileQuizTimeline({ quiz, director: director_plan, voicePlan: voice_plan, audioDurations });
  const artifact_path = await input.repository.writeQuizTimeline(input.channelId, input.episodeId, timeline);
  const invalidatedStages = invalidateQuizArtifacts("timeline");
  const invalidated = await input.repository.invalidateQuizArtifacts(input.channelId, input.episodeId, invalidatedStages);
  return { timeline, artifact_path, invalidated };
}

export async function runQa(input: QuizOrchestratorInput): Promise<{ assessment: QuizAssessment; artifact_path: string }> {
  const [artifacts, channel] = await Promise.all([readQuizArtifacts(input), input.repository.getChannel(input.channelId)]);
  if (!artifacts.quiz) throw new RepositoryError("Generate the Quiz facts before running QA", "QUIZ_REQUIRED");
  const mascot = channel.mascot_id ? await input.repository.getMascot(channel.mascot_id).catch(() => null) : null;
  const assessment = assessQuiz({
    quiz: artifacts.quiz,
    director: artifacts.director_plan,
    assetPlan: artifacts.asset_plan,
    resolvedAssets: artifacts.asset_resolution?.assets ?? [],
    voicePlan: artifacts.voice_plan,
    timeline: artifacts.timeline,
    measuredAudio: artifacts.voice_plan ? artifacts.voice_plan.segments.every((segment) => segment.duration_seconds !== null) : false,
    mascot,
    mascotConfig: channel.mascot_config,
  });
  const artifact_path = await input.repository.writeQuizAssessment(input.channelId, input.episodeId, assessment);
  return { assessment, artifact_path };
}

export async function assertQuizRenderReady(
  input: QuizOrchestratorInput,
): Promise<{ artifacts: QuizArtifacts; assessment: QuizAssessment }> {
  const [episode, channel, artifacts] = await Promise.all([
    input.repository.getEpisode(input.channelId, input.episodeId),
    input.repository.getChannel(input.channelId),
    readQuizArtifacts(input),
  ]);
  if (!artifacts.quiz || !artifacts.director_plan || !artifacts.asset_plan || !artifacts.voice_plan || !artifacts.timeline) {
    throw new RepositoryError("Complete the Quiz V2 stages before rendering", "QUIZ_V2_INCOMPLETE");
  }
  const mascot = channel.mascot_id ? await input.repository.getMascot(channel.mascot_id).catch(() => null) : null;
  const preflight = preflightQuizRender({
    quiz: artifacts.quiz,
    director: artifacts.director_plan,
    assetPlan: artifacts.asset_plan,
    resolvedAssets: artifacts.asset_resolution?.assets ?? [],
    voicePlan: artifacts.voice_plan,
    timeline: artifacts.timeline,
    measuredAudio: episode.narration_duration_seconds !== null,
    mascot,
    mascotConfig: channel.mascot_config,
  });
  if (!preflight.ok) {
    const blocker = preflight.assessment.issues.find((issue) => issue.severity === "blocker");
    throw new RepositoryError(
      "Quiz V2 preflight blocked render: " + (blocker?.message ?? "Resolve the reported QA blockers before rendering."),
      "QUIZ_PREFLIGHT_BLOCKED",
    );
  }
  return { artifacts, assessment: preflight.assessment };
}
