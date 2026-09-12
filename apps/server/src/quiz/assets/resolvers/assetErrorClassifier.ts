import type { QuizAssetPlan, QuizIssue } from "@studio/shared";
import { isContentFilterError } from "../../../utils/promptSanitizer.js";

export function createQuizAssetIssue(
  request: QuizAssetPlan["assets"][number],
  code: string,
  severity: "blocker" | "warning",
  message: string,
  nextAction: string,
): QuizIssue {
  return {
    code,
    severity,
    message,
    next_action: nextAction,
    question_ids: request.question_id ? [request.question_id] : [],
    stage: "assets",
  };
}

const METADATA_ERROR_CODES = [
  "image_output_aspect_mismatch",
  "image_resolution_insufficient",
  "image_undecodable",
  "image_request_size_conflict",
] as const;

function extractMetadataErrorCode(error: Error): string | null {
  const codeCandidate = (error as { code?: unknown }).code;
  if (typeof codeCandidate === "string" && METADATA_ERROR_CODES.some((c) => c === codeCandidate)) {
    return codeCandidate;
  }
  for (const knownCode of METADATA_ERROR_CODES) {
    if (error.message.includes(knownCode)) {
      return knownCode;
    }
  }
  return null;
}

export function classifyAssetError(
  request: QuizAssetPlan["assets"][number],
  error: unknown,
  round: number,
  maxRounds: number,
): { issue: QuizIssue; terminal: boolean } | null {
  if (isContentFilterError(error)) {
    const message = error instanceof Error ? error.message : "content filter rejection";
    return {
      terminal: true,
      issue: createQuizAssetIssue(
        request,
        "asset_generation_failed",
        "blocker",
        `Image generation rejected by content filter for ${request.asset_id}: ${message}`,
        "Modify the prompt or attach an authorized asset manually.",
      ),
    };
  }

  if (error instanceof Error && error.message === "PROVIDER_UNAVAILABLE") {
    return {
      terminal: true,
      issue: createQuizAssetIssue(
        request,
        "asset_provider_unavailable",
        "blocker",
        "A semantically critical visual asset needs image generation, but no image provider is configured.",
        "Configure an image provider (gpti2.store, ShopAiKey, or Custom) in Settings or switch to Antigravity engine before rendering.",
      ),
    };
  }

  if (error instanceof Error) {
    const metaCode = extractMetadataErrorCode(error);
    if (metaCode) {
      return {
        terminal: true,
        issue: createQuizAssetIssue(
          request,
          metaCode,
          request.required ? "blocker" : "warning",
          `Asset ${request.asset_id} failed image metadata validation: ${error.message}`,
          "Check layout sizing recommendations or configure provider dimensions.",
        ),
      };
    }
  }

  if (round === maxRounds) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      terminal: false,
      issue: createQuizAssetIssue(
        request,
        "asset_generation_failed",
        "blocker",
        `Image generation failed for ${request.asset_id} after ${maxRounds} retry rounds: ${message}`,
        "Retry generation or attach the exact semantic asset before rendering.",
      ),
    };
  }

  return null;
}
