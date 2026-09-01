import {
  nowIso,
  QuizAssessmentSchema,
  type ChannelMascotConfig,
  type DirectorPlan,
  type MascotProfile,
  type QuizAssessment,
  type QuizAssetPlan,
  type QuizIssue,
  type QuizTimeline,
  type QuizV2,
  type VoicePlan,
} from "@studio/shared";
import { validateDirectorPlan } from "../director/validateDirectorPlan.js";
import { assessQuizVisualLayout } from "./visualQa.js";
import { assessSemanticQa } from "./stages/assessSemanticQa.js";
import { assessAssetQa } from "./stages/assessAssetQa.js";
import { assessVoiceQa } from "./stages/assessVoiceQa.js";
import { assessTimelineQa, questionCycleRangeSeconds } from "./stages/assessTimelineQa.js";
import { candyArcadeVisualScore, categoryScore, computeAssessmentRating } from "./stages/assessmentScoring.js";

export { questionCycleRangeSeconds, categoryScore, candyArcadeVisualScore };

export type QuizAssessmentInput = {
  quiz: QuizV2;
  director?: DirectorPlan | null;
  assetPlan?: QuizAssetPlan | null;
  resolvedAssets?: Array<{
    asset_id: string;
    path: string;
    source: string;
    degraded?: boolean;
    fallback_tier?: number;
    question_id?: string | null;
  }>;
  voicePlan?: VoicePlan | null;
  timeline?: QuizTimeline | null;
  measuredAudio?: boolean;
  renderIntegrity?: boolean;
  staticIntervalThresholdSeconds?: number;
  mascot?: MascotProfile | null;
  mascotConfig?: ChannelMascotConfig | null;
};

export function assessQuiz(input: QuizAssessmentInput): QuizAssessment {
  const issues: QuizIssue[] = [];
  const hasQuestionMascot = Boolean(
    input.mascot && input.mascotConfig?.enabled !== false && input.mascotConfig?.show_in_question !== false,
  );

  // 1. Semantic & Fact Checking Stage
  assessSemanticQa(input.quiz).forEach((issue) => issues.push(issue));

  // 2. Director Stage
  if (input.director) {
    validateDirectorPlan(input.quiz, input.director).issues.forEach((issue) => issues.push(issue));
  }

  // 3. Visual Layout Stage
  assessQuizVisualLayout({
    quiz: input.quiz,
    director: input.director,
    assetPlan: input.assetPlan,
    timeline: input.timeline,
    hasMascot: hasQuestionMascot,
  }).forEach((issue) => issues.push(issue));

  // 4. Assets & Mascot Studio Stage
  assessAssetQa({
    assetPlan: input.assetPlan,
    resolvedAssets: input.resolvedAssets,
    mascot: input.mascot,
    mascotConfig: input.mascotConfig,
  }).forEach((issue) => issues.push(issue));

  // 5. Voice & Pacing Stage
  assessVoiceQa({
    quiz: input.quiz,
    voicePlan: input.voicePlan,
    measuredAudio: input.measuredAudio,
  }).forEach((issue) => issues.push(issue));

  // 6. Timeline & Motion Continuity Stage
  assessTimelineQa({
    quiz: input.quiz,
    timeline: input.timeline,
    staticIntervalThresholdSeconds: input.staticIntervalThresholdSeconds,
  }).forEach((issue) => issues.push(issue));

  // 7. Render Integrity Verification
  if (input.renderIntegrity === false) {
    issues.push({
      code: "render_integrity_missing",
      severity: "blocker",
      message: "Rendered video evidence is missing or invalid.",
      next_action: "Run post-render FFprobe verification before marking the episode ready.",
      question_ids: [],
      stage: "render",
    });
  }

  // Categories and overall scoring calculation
  const categories = {
    semantic: categoryScore(issues, "semantic", 25),
    visual: categoryScore(issues, "layout", 20),
    pacing: categoryScore(issues, "timeline", 15),
    audio: categoryScore(issues, "voice", 15),
    variety: categoryScore(issues, "director", 10),
    render_integrity: categoryScore(issues, "render", 15),
  };

  const score = Math.round(
    (categories.semantic * 25 +
      categories.visual * 20 +
      categories.pacing * 15 +
      categories.audio * 15 +
      categories.variety * 10 +
      categories.render_integrity * 15) /
      100,
  );

  const candyArcadeVisual = candyArcadeVisualScore(issues);
  const rating = computeAssessmentRating(issues, score, candyArcadeVisual);

  return QuizAssessmentSchema.parse({
    schema_version: 2,
    episode_id: input.quiz.episode_id,
    assessed_at: nowIso(),
    score,
    rating,
    categories,
    candy_arcade_visual: candyArcadeVisual,
    issues,
  });
}
