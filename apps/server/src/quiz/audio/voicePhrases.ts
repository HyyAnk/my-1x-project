import type { VoicePhrase, VoicePlan, VoiceSegmentRole } from "@studio/shared";
import { sanitizeTextForSpeech, splitSmartPunctuationPhrases, canSplitBetweenWords } from "../../utils/speechSanitizer.js";

const KICKOFF_PATTERN = /(?:let's\s+(?:go|do this|dive in)|here we go|game on|ready\?|出发|马上开始)/i;

export function withPhrases(segment: Omit<VoicePlan["segments"][number], "phrases">): VoicePlan["segments"][number] {
  return { ...segment, phrases: performancePhrases(segment.text, segment.role) };
}

export function performancePhrases(text: string, role: VoiceSegmentRole): VoicePhrase[] {
  const normalized = sanitizeTextForSpeech(text.trim().replace(/\s+/g, " "));
  const chunks =
    role === "question"
      ? splitQuestionPhrases(normalized)
      : role === "choice"
        ? splitChoicePhrases(normalized)
        : role === "intro"
          ? [normalized]
          : splitPunctuationPhrases(normalized);
  return chunks.map((phrase, index) => {
    const isLastChunk = index === chunks.length - 1;
    const isCtaKickoff = role === "intro_cta" && (isLastChunk || KICKOFF_PATTERN.test(phrase));
    return {
      text: phrase,
      delivery: phraseDelivery(role, index, isLastChunk, isCtaKickoff),
      pause_after: phrasePause(role, index, isLastChunk),
    };
  });
}

function phraseDelivery(role: VoiceSegmentRole, index: number, isLastChunk: boolean, isCtaKickoff: boolean): VoicePhrase["delivery"] {
  if (role === "reveal" || isCtaKickoff) return "emphasis";
  if (role === "pre_outro") return isLastChunk ? "emphasis" : "playful";
  if (role === "fun_fact" || role === "explanation" || role === "intro_topic") return "warm";
  if (role === "outro" || role === "intro" || role === "intro_cta" || role === "thinking_prompt") return "playful";
  if (role === "question" && isLastChunk) return "question_end";
  return index === 1 ? "emphasis" : "normal";
}

function phrasePause(role: VoiceSegmentRole, index: number, isLastChunk: boolean): VoicePhrase["pause_after"] {
  if (isLastChunk) return "none";
  if (role === "outro" && index === 0) return "long";
  if (role === "question" || role === "intro_cta" || role === "intro_topic") return "phrase";
  if (role === "reveal") return "anticipation";
  return "micro";
}

function splitQuestionPhrases(text: string): string[] {
  const punctuation = splitPunctuationPhrases(text);
  if (punctuation.length > 1) return punctuation;
  const words = text.split(" ").filter(Boolean);
  if (words.length <= 12) return [text];

  const midpoint = Math.round(words.length / 2);
  let bestSplit = -1;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let i = 3; i <= words.length - 3; i++) {
    if (!canSplitBetweenWords(words[i - 1], words[i])) continue;
    const word = words[i].replace(/^[^A-Za-zÀ-ỹ]+/, "").toLowerCase();
    const isConjunction = /^(and|or|but|because|although|when|while|which|that|who|whom|where|if|as)$/i.test(word);
    const score = (isConjunction ? 0 : 5) + Math.abs(i - midpoint);
    if (score < bestScore) {
      bestScore = score;
      bestSplit = i;
    }
  }

  if (bestSplit > 0) {
    return [words.slice(0, bestSplit).join(" "), words.slice(bestSplit).join(" ")];
  }
  return [text];
}

export function splitChoicePhrases(text: string): string[] {
  const commaParts = text
    .split(/(?<=,)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (commaParts.length <= 1) return splitPunctuationPhrases(text);

  const phrases: string[] = [];
  let current: string[] = [];
  for (const [index, part] of commaParts.entries()) {
    current.push(part);
    const wordsBeforeBoundary = current.join(" ").split(/\s+/).filter(Boolean).length;
    const wordsAfterBoundary = commaParts
      .slice(index + 1)
      .join(" ")
      .split(/\s+/)
      .filter(Boolean).length;
    if (wordsAfterBoundary >= 3 && wordsBeforeBoundary >= 3) {
      phrases.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) phrases.push(current.join(" "));
  return phrases.length > 1 ? phrases : [text];
}

export function splitPunctuationPhrases(text: string): string[] {
  return splitSmartPunctuationPhrases(text);
}
