import {
  normalizeLanguageCode,
  type BankQuestion,
  type BankTranslationContent,
} from "@studio/shared";
import { executeSinglePromptText, type LLMClient } from "../../../utils/promptSanitizer.js";
import {
  buildQuestionTranscreationPrompt,
  parseTranscreationOutput,
} from "./transcreationPrompt.js";

export interface TranscreateQuestionOptions {
  targetLanguage: string;
  channelTone?: string;
  llmClient?: LLMClient | null;
  signal?: AbortSignal;
  modelOverride?: string;
  timeoutMs?: number;
  rawOutputOverride?: string;
  forceRecreate?: boolean;
}

export interface TranscreateQuestionResult {
  success: boolean;
  cached: boolean;
  language: string;
  content: BankTranslationContent;
}

/**
 * Coordinates the AI Transcreation workflow for a Question Bank question.
 * Features:
 * - Pre-existing cache checks (0ms latency if already translated)
 * - Automatic bypass if source language matches target language
 * - Archetype-tailored AI prompt compilation
 * - Schema and choice ID integrity validation
 * - Safe offline fallback when AI client is unavailable
 */
export async function transcreateBankQuestion(
  question: BankQuestion,
  options: TranscreateQuestionOptions,
): Promise<TranscreateQuestionResult> {
  const targetLang = normalizeLanguageCode(options.targetLanguage);
  const sourceLang = normalizeLanguageCode(question.language);

  // 1. Check if source question is already in target language
  if (sourceLang === targetLang) {
    return {
      success: true,
      cached: true,
      language: targetLang,
      content: {
        language: targetLang,
        question: question.question,
        choices: question.choices.map((c) => ({ id: c.id, text: c.text })),
        explanation: question.explanation,
        fun_fact: question.fun_fact || "",
        translated_at: new Date().toISOString(),
        verified: true,
      },
    };
  }

  // 2. Check existing cache in question record (unless forceRecreate = true)
  if (!options.forceRecreate && question.translations && question.translations[targetLang]) {
    return {
      success: true,
      cached: true,
      language: targetLang,
      content: question.translations[targetLang],
    };
  }

  // 3. Check for rawOutputOverride (used in tests or offline mock)
  if (options.rawOutputOverride) {
    const content = parseTranscreationOutput(options.rawOutputOverride, question);
    return {
      success: true,
      cached: false,
      language: targetLang,
      content,
    };
  }

  // 4. Call AI LLM to transcreate if LLM client is provided
  if (options.llmClient) {
    const prompt = buildQuestionTranscreationPrompt({
      question,
      targetLanguage: targetLang,
      channelTone: options.channelTone,
    });

    const timeout = options.timeoutMs ?? 35_000;
    const rawOutput = await executeSinglePromptText(options.llmClient, prompt, {
      signal: options.signal,
      timeoutMs: timeout,
      modelOverride: options.modelOverride,
    });

    const content = parseTranscreationOutput(rawOutput, question);
    return {
      success: true,
      cached: false,
      language: targetLang,
      content,
    };
  }

  // 5. Safe offline fallback when no AI client is available
  const fallbackContent: BankTranslationContent = {
    language: targetLang,
    question: `[${targetLang.toUpperCase()}] ${question.question}`,
    choices: question.choices.map((c) => ({ id: c.id, text: `[${targetLang.toUpperCase()}] ${c.text}` })),
    explanation: question.explanation,
    fun_fact: question.fun_fact || "",
    translated_at: new Date().toISOString(),
    verified: false,
  };

  return {
    success: true,
    cached: false,
    language: targetLang,
    content: fallbackContent,
  };
}
