import {
  type AppConfig,
  type DirectorPlan,
  type QuestionHistoryCheckResult,
  type QuizAssessment,
  type QuizAssetPlan,
  type QuizAssetResolution,
  type QuizTimeline,
  type QuizV2,
  type VideoDescription,
  type VideoTitle,
  type VoicePlan,
  type ThumbnailLayoutType,
} from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import type { QuizVoicePacingClamp } from "../audio/voiceSynthesis.js";
import type { AntigravityClient } from "../../antigravity.js";
import type { CodexAppServerClient } from "../../codex.js";

import { readQuizArtifacts, generateQuiz, generateDirector } from "./stages/quizGenerationStage.js";
import { planAssets, resolveAssets, planVoice, generateVoice } from "./stages/assetsVoiceStages.js";
import { compileTimeline, runQa, assertQuizRenderReady } from "./stages/timelineAssessmentStages.js";
import { ensureEpisodeThumbnail } from "../thumbnail/ensureEpisodeThumbnail.js";
import { generateEpisodeDescription, generateEpisodeTitle } from "./stages/videoMetadataStages.js";

export { remixQuizQuestions } from "./remixQuestions.js";
export {
  readQuizArtifacts,
  generateQuiz,
  generateDirector,
  planAssets,
  resolveAssets,
  planVoice,
  generateVoice,
  compileTimeline,
  runQa,
  assertQuizRenderReady,
  generateEpisodeTitle,
  generateEpisodeDescription,
};

export type QuizOrchestratorInput = {
  repository: RepositoryService;
  config: Pick<AppConfig, "audio_generation"> & {
    image_generation?: AppConfig["image_generation"];
    image_fallback?: AppConfig["image_fallback"];
    question_history?: AppConfig["question_history"];
  };
  channelId: string;
  episodeId: string;
  activeEngine?: "codex" | "antigravity";
  antigravityClient?: AntigravityClient;
  codexClient?: CodexAppServerClient;
  onAssetProgress?: (progress: { completed: number; total: number; reused: boolean }) => Promise<void> | void;
  onVoiceProgress?: (progress: { completed: number; total: number; reused: boolean }) => Promise<void> | void;
  onVoicePacingClamp?: (details: QuizVoicePacingClamp) => Promise<void> | void;
  customHookText?: string;
  layoutOverride?: ThumbnailLayoutType;
  badgeOverride?: string;
};

export type QuizArtifacts = {
  quiz: QuizV2 | null;
  history_check: QuestionHistoryCheckResult | null;
  director_plan: DirectorPlan | null;
  asset_plan: QuizAssetPlan | null;
  asset_resolution: QuizAssetResolution | null;
  voice_plan: VoicePlan | null;
  timeline: QuizTimeline | null;
  assessment: QuizAssessment | null;
  description: VideoDescription | null;
  title: VideoTitle | null;
};

export async function runQuizV2Pipeline(input: QuizOrchestratorInput): Promise<QuizArtifacts> {
  const generatedQuiz = await generateQuiz(input);
  const director = await generateDirector(input);
  const assetPlan = await planAssets(input);
  const voicePlan = await planVoice(input);

  const [assetResolutionResult, voiceResult] = await Promise.all([resolveAssets(input), generateVoice(input)]);

  const qaResult = await runQa(input);

  try {
    await ensureEpisodeThumbnail(input.repository, {
      channelId: input.channelId,
      episodeId: input.episodeId,
      activeEngine: input.activeEngine,
      antigravityClient: input.antigravityClient,
      codexClient: input.codexClient,
      customHookText: input.customHookText,
      layoutOverride: input.layoutOverride,
      badgeOverride: input.badgeOverride,
      imageConfig: input.config.image_generation
        ? {
            api_key: input.config.image_generation.api_key,
            model: input.config.image_generation.model,
            provider: input.config.image_generation.provider,
            base_url: input.config.image_generation.base_url,
          }
        : undefined,
      imageFallbackConfig: input.config.image_fallback,
    });
  } catch {
    // Non-blocking
  }

  // The description stage generates the title first, so both target the same search keyword.
  let description: VideoDescription | null;
  let title: VideoTitle | null;
  try {
    const metadata = await generateEpisodeDescription(input);
    description = metadata.description;
    title = metadata.title;
  } catch {
    description = await input.repository.readVideoDescription(input.channelId, input.episodeId);
    title = await input.repository.readVideoTitle(input.channelId, input.episodeId);
  }

  return {
    quiz: generatedQuiz.quiz,
    history_check: generatedQuiz.history_check,
    director_plan: director.director_plan,
    asset_plan: assetPlan.asset_plan,
    asset_resolution: assetResolutionResult.asset_resolution,
    voice_plan: voicePlan.voice_plan,
    timeline: voiceResult.timeline,
    assessment: qaResult.assessment,
    description,
    title,
  };
}
