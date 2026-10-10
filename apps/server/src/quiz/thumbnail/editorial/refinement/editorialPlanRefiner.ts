import type { StudioLogger } from "../../../../logger.js";
import { executeSinglePromptText, type LLMClient } from "../../../../utils/promptSanitizer.js";
import { resolveTopicSpecificHook } from "../../locales/topicHooks.js";
import type { SupportedLanguage } from "../../locales/types.js";
import { resolveThumbnailLanguage } from "../../thumbnailLocale.js";
import { deriveTopicHeadlineFallback } from "../../thumbnailTopicHookExtractor.js";
import type { QuizSubjectAnchor, QuizThumbnailPlan, ResolveThumbnailInput } from "../../thumbnailTypes.js";
import { resolveEditorialSeed } from "../seeds/seedResolver.js";
import { assessEditorialHeadline, selectEditorialHeadline, sharesTopicWord } from "./headlinePolicy.js";
import type { EditorialHeadlineContext, HeadlineIssue } from "./headlineTypes.js";
import { buildPlanRewritePrompt, parsePlanRewrite, type PlanRewrite } from "./planRewritePrompt.js";
import { findUngroundedSubjectIssue } from "./subjectGrounding.js";

const REWRITE_TIMEOUT_MS = 120_000;

export type RefineEditorialPlanInput = ResolveThumbnailInput & {
  llmClient?: LLMClient | null;
  signal?: AbortSignal;
  logger?: StudioLogger;
  channelId?: string;
  episodeId?: string;
};

type SubjectResolution = { anchors: QuizSubjectAnchor[]; source: "original" | "rewrite" | "seed"; seedHook?: string };

function buildHeadlineContext(plan: QuizThumbnailPlan, input: RefineEditorialPlanInput): EditorialHeadlineContext {
  return {
    topicTitle: input.topicTitle,
    topicSummary: input.topicSummary,
    questions: input.questions,
    questionFormat: input.questionFormat,
    layout: plan.layout,
    languageCode: resolveThumbnailLanguage(input),
    recentHeadlines: input.recentHeadlines,
  };
}

function buildDeterministicHeadlines(input: RefineEditorialPlanInput, languageCode: SupportedLanguage): string[] {
  const topicText = `${input.topicTitle} ${input.topicSummary ?? ""}`.toLowerCase();
  const domainHook = resolveTopicSpecificHook(topicText, languageCode);
  // Domain hooks come from keyword lists over title and summary; keep one only when the title confirms the domain.
  const groundedDomainHook = domainHook && sharesTopicWord(domainHook, input.topicTitle) ? domainHook : null;
  const titleHook = deriveTopicHeadlineFallback(input.topicTitle, "");
  return [groundedDomainHook, titleHook].filter((candidate): candidate is string => Boolean(candidate));
}

async function requestPlanRewrite(
  plan: QuizThumbnailPlan,
  issues: HeadlineIssue[],
  context: EditorialHeadlineContext,
  input: RefineEditorialPlanInput,
  rewriteSubjects: boolean,
): Promise<PlanRewrite | null> {
  if (!input.llmClient) return null;
  const prompt = buildPlanRewritePrompt({
    rejectedHeadline: plan.hookText,
    subjects: plan.subjectAnchors,
    issues,
    context,
    language: input.language || "English",
    rewriteSubjects,
  });
  try {
    const raw = await executeSinglePromptText(input.llmClient, prompt, { signal: input.signal, timeoutMs: REWRITE_TIMEOUT_MS, modelOverride: "flash" });
    return parsePlanRewrite(raw);
  } catch (error) {
    input.signal?.throwIfAborted();
    input.logger?.warn(`Thumbnail plan rewrite failed: ${error instanceof Error ? error.message : String(error)}`, {
      profileId: input.channelId,
      workerId: input.episodeId,
      step: "thumbnail_ai_planner",
    });
    return null;
  }
}

/** Keeps grounded rewritten subjects; otherwise swaps an invented subject for the curated topic seed. */
function resolveSubjects(plan: QuizThumbnailPlan, rewrite: PlanRewrite | null, context: EditorialHeadlineContext, input: RefineEditorialPlanInput): SubjectResolution {
  const count = plan.subjectAnchors.length;
  const rewritten = rewrite?.subjects?.slice(0, count);
  if (rewritten && rewritten.length === count && !findUngroundedSubjectIssue(rewritten, context)) {
    return { anchors: rewritten, source: "rewrite" };
  }
  const seed = resolveEditorialSeed({ ...input, editorialFallback: true });
  return { anchors: seed.subjectAnchors.slice(0, count), source: "seed", seedHook: seed.hookText };
}

function headlineCandidates(plan: QuizThumbnailPlan, rewrite: PlanRewrite | null, subjects: SubjectResolution, deterministic: string[]): Array<string | null | undefined> {
  // A headline written for a replaced subject would describe something no longer pictured.
  const originalHook = subjects.source === "original" ? plan.hookText : subjects.seedHook;
  const rewrittenHook = subjects.source === "seed" ? null : rewrite?.hookText;
  return [rewrittenHook, originalHook, ...deterministic];
}

/**
 * Enforces the editorial plan policy before image generation:
 * - the headline is topic-specific, makes no unsupported promise, and complements the title;
 * - the pictured subject comes from an actual episode question (checked when a planner model is available).
 * A rejected plan gets one model rewrite, then deterministic fallbacks. Manual headlines are never changed.
 */
export async function refineEditorialPlan(plan: QuizThumbnailPlan, input: RefineEditorialPlanInput): Promise<QuizThumbnailPlan> {
  if (!plan.editorial) return plan;
  const manualHook = Boolean(input.customHookText?.trim());
  const context = buildHeadlineContext(plan, input);
  const headlineIssues = manualHook ? [] : assessEditorialHeadline(plan.hookText, context).issues;
  const subjectIssue = input.llmClient ? findUngroundedSubjectIssue(plan.subjectAnchors, context) : null;
  if (headlineIssues.length === 0 && !subjectIssue) return plan;

  const issues = subjectIssue ? [...headlineIssues, subjectIssue] : headlineIssues;
  const rewrite = await requestPlanRewrite(plan, issues, context, input, Boolean(subjectIssue));
  input.signal?.throwIfAborted();
  const subjects: SubjectResolution = subjectIssue ? resolveSubjects(plan, rewrite, context, input) : { anchors: plan.subjectAnchors, source: "original" };
  const hookText = manualHook
    ? plan.hookText
    : selectEditorialHeadline(headlineCandidates(plan, rewrite, subjects, buildDeterministicHeadlines(input, context.languageCode)), context).headline;

  input.logger?.info(`Thumbnail plan refined: headline "${plan.hookText}" -> "${hookText}", subject source ${subjects.source}`, {
    profileId: input.channelId,
    workerId: input.episodeId,
    step: "thumbnail_ai_planner",
    issues: issues.map((issue) => issue.code).join(","),
  });
  return { ...plan, hookText, subjectAnchors: subjects.anchors };
}
