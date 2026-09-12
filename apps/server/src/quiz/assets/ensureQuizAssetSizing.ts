import { createHash } from "node:crypto";
import type {
  DirectorPlan,
  QuizAssetPlan,
  QuizTimeline,
  QuizV2,
  VoicePlan,
} from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../../repository.js";
import {
  reconcileQuizAssetSizing,
  type SizingChange,
} from "./reconcileQuizAssetSizing.js";
import { planQuizAssets } from "./assetPlanner.js";

export type EnsureQuizAssetSizingIntent = "inspect" | "generate" | "render";

export type EnsureQuizAssetSizingArtifacts = {
  quiz?: QuizV2 | null;
  director?: DirectorPlan | null;
  assetPlan?: QuizAssetPlan | null;
  voicePlan?: VoicePlan | null;
  timeline?: QuizTimeline | null;
};

export interface EnsureQuizAssetSizingInput {
  repository: RepositoryService;
  channelId: string;
  episodeId: string;
  artifacts?: EnsureQuizAssetSizingArtifacts;
  intent: EnsureQuizAssetSizingIntent;
  confirmed?: boolean;
  sourceIdentityToken?: string;
}

export type EnsureQuizAssetSizingStatus = "current" | "stale" | "confirmation_required";

export interface EnsureQuizAssetSizingResult {
  status: EnsureQuizAssetSizingStatus;
  affectedAssetIds: string[];
  reconciledPlan: QuizAssetPlan;
  changes: SizingChange[];
  sourceIdentityToken: string;
  persisted: boolean;
}

export function computeQuizSourceIdentityToken(quiz: QuizV2, director: DirectorPlan): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: "quiz-source-sizing-v1",
        episode_id: quiz.episode_id,
        beats: (director.beats ?? []).map((b) => ({
          question_id: b.question_id,
          layout_id: b.layout_id,
          asset_intents: b.asset_intents,
        })),
        questions: (quiz.questions ?? []).map((q) => ({
          id: q.id,
          choices: q.choices,
        })),
      }),
    )
    .digest("hex");
}

export async function ensureQuizAssetSizing(
  input: EnsureQuizAssetSizingInput,
): Promise<EnsureQuizAssetSizingResult> {
  const { repository, channelId, episodeId, intent, confirmed, sourceIdentityToken } = input;

  const quiz = input.artifacts?.quiz ?? (await repository.readQuiz(channelId, episodeId));
  if (!quiz) {
    throw new RepositoryError("Quiz facts are required before asset sizing check", "QUIZ_REQUIRED");
  }

  const director = input.artifacts?.director ?? (await repository.readDirectorPlan(channelId, episodeId));
  if (!director) {
    throw new RepositoryError("Director plan is required before asset sizing check", "DIRECTOR_REQUIRED");
  }

  const currentToken = computeQuizSourceIdentityToken(quiz, director);
  if (sourceIdentityToken && sourceIdentityToken !== currentToken) {
    throw new RepositoryError(
      "Quiz source layout or assets changed during generation",
      "asset_sizing_changed_during_generation",
    );
  }

  const assetPlan = input.artifacts?.assetPlan ?? (await repository.readAssetPlan(channelId, episodeId));
  if (!assetPlan) {
    if (intent === "render") {
      throw new RepositoryError("Asset plan is required before video rendering", "QUIZ_V2_REQUIRED");
    }
    const planned = planQuizAssets(quiz, director);
    if (intent === "generate") {
      await repository.writeAssetPlan(channelId, episodeId, planned);
      return {
        status: "current",
        affectedAssetIds: planned.assets.map((a) => a.asset_id),
        reconciledPlan: planned,
        changes: [],
        sourceIdentityToken: currentToken,
        persisted: true,
      };
    }
    return {
      status: "stale",
      affectedAssetIds: planned.assets.map((a) => a.asset_id),
      reconciledPlan: planned,
      changes: [],
      sourceIdentityToken: currentToken,
      persisted: false,
    };
  }

  const resolution = await repository.readQuizAssetResolution(channelId, episodeId).catch(() => null);

  const { plan: reconciledPlan, changes } = reconcileQuizAssetSizing(quiz, director, assetPlan, resolution);

  const generationAffectingChanges = changes.filter((c) => c.kind === "generation_affecting");
  const affectedAssetIds = Array.from(new Set(changes.map((c) => c.assetId)));
  const generationAffectingIds = Array.from(new Set(generationAffectingChanges.map((c) => c.assetId)));

  if (intent === "inspect") {
    if (changes.length === 0) {
      return {
        status: "current",
        affectedAssetIds: [],
        reconciledPlan,
        changes,
        sourceIdentityToken: currentToken,
        persisted: false,
      };
    }
    return {
      status: "stale",
      affectedAssetIds,
      reconciledPlan,
      changes,
      sourceIdentityToken: currentToken,
      persisted: false,
    };
  }

  if (intent === "generate") {
    if (changes.length === 0) {
      return {
        status: "current",
        affectedAssetIds: [],
        reconciledPlan,
        changes,
        sourceIdentityToken: currentToken,
        persisted: false,
      };
    }

    if (generationAffectingChanges.length === 0) {
      await repository.writeAssetPlan(channelId, episodeId, reconciledPlan);
      return {
        status: "current",
        affectedAssetIds,
        reconciledPlan,
        changes,
        sourceIdentityToken: currentToken,
        persisted: true,
      };
    }

    if (confirmed !== true) {
      return {
        status: "confirmation_required",
        affectedAssetIds: generationAffectingIds,
        reconciledPlan,
        changes,
        sourceIdentityToken: currentToken,
        persisted: false,
      };
    }

    await repository.writeAssetPlan(channelId, episodeId, reconciledPlan);
    return {
      status: "current",
      affectedAssetIds: generationAffectingIds,
      reconciledPlan,
      changes,
      sourceIdentityToken: currentToken,
      persisted: true,
    };
  }

  // intent === "render"
  if (changes.length === 0) {
    return {
      status: "current",
      affectedAssetIds: [],
      reconciledPlan,
      changes,
      sourceIdentityToken: currentToken,
      persisted: false,
    };
  }

  if (generationAffectingChanges.length === 0) {
    await repository.writeAssetPlan(channelId, episodeId, reconciledPlan);
    return {
      status: "current",
      affectedAssetIds,
      reconciledPlan,
      changes,
      sourceIdentityToken: currentToken,
      persisted: true,
    };
  }

  return {
    status: "stale",
    affectedAssetIds: generationAffectingIds,
    reconciledPlan,
    changes,
    sourceIdentityToken: currentToken,
    persisted: false,
  };
}
