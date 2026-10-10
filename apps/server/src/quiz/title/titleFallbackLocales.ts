import { VIDEO_TITLE_MAX_CHARS, type Episode } from "@studio/shared";
import type { SupportedBaseLanguage } from "../bank/localization/localization.types.js";
import { cleanRawTitleNoise } from "../thumbnail/thumbnailTopicHookExtractor.js";
import type { TitleDraft } from "./videoTitle.types.js";

const MAX_SUBJECT_CHARS = 50;
const TOPIC_SEGMENT_DELIMITER = /[:：|—–]|\s-\s/u;

type FallbackTitleBuilder = (subject: string, questionCount: number) => string;

/** Each template follows the keyword-first + number + challenge hook formula; the keyword ends at the colon. */
const FALLBACK_TITLE_BUILDERS: Record<SupportedBaseLanguage, FallbackTitleBuilder> = {
  en: (subject, count) => `${subject} Quiz: ${count} Questions - How Many Can You Get Right?`,
  de: (subject, count) => `${subject} Quiz: ${count} Fragen - Wie viele schaffst du?`,
  fr: (subject, count) => `Quiz ${subject} : ${count} questions - Combien en réussirez-vous ?`,
  es: (subject, count) => `Quiz de ${subject}: ${count} preguntas - ¿Cuántas puedes acertar?`,
  it: (subject, count) => `Quiz ${subject}: ${count} domande - Quante ne indovini?`,
  pt: (subject, count) => `Quiz de ${subject}: ${count} perguntas - Quantas você acerta?`,
  ja: (subject, count) => `${subject}クイズ：全${count}問 - 何問正解できる？`,
  ko: (subject, count) => `${subject} 퀴즈: ${count}문제 - 몇 개나 맞힐 수 있을까?`,
  zh: (subject, count) => `${subject}知识问答：${count}道题 - 你能答对几道？`,
};

function truncateAtWordBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxChars / 2 ? truncated.slice(0, lastSpace) : truncated).trim();
}

/** Derives the search subject from the working topic title without format noise such as "Quiz" or "Part 2". */
export function resolveTitleSubject(episode: Episode): string {
  const rawTitle = episode.topic.title.trim();
  const meaningfulSegment = rawTitle
    .split(TOPIC_SEGMENT_DELIMITER)
    .map(cleanRawTitleNoise)
    .find((segment) => segment.length > 0);
  return truncateAtWordBoundary(meaningfulSegment || rawTitle, MAX_SUBJECT_CHARS);
}

/**
 * Builds a grounded template title used when the LLM fails or keeps producing blocked drafts.
 */
export function buildFallbackTitle(language: SupportedBaseLanguage, episode: Episode, questionCount: number): TitleDraft {
  const title = FALLBACK_TITLE_BUILDERS[language](resolveTitleSubject(episode), questionCount).slice(0, VIDEO_TITLE_MAX_CHARS).trim();
  const primaryKeyword = title.split(/\s?[:：]/u)[0].trim().toLowerCase();
  return { title, primaryKeyword };
}
