import { QUIZ_SECONDS_PER_QUESTION, type TopicCandidate } from "@studio/shared";

export const DEFAULT_NARRATION_WORDS_PER_SECOND = 2.3;

export function isPng(content: Uint8Array): boolean {
  return content.length >= 8
    && content[0] === 0x89
    && content[1] === 0x50
    && content[2] === 0x4e
    && content[3] === 0x47
    && content[4] === 0x0d
    && content[5] === 0x0a
    && content[6] === 0x1a
    && content[7] === 0x0a;
}

export function isJpeg(content: Uint8Array): boolean {
  return content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
}

export function isWebp(content: Uint8Array): boolean {
  return content.length >= 12
    && content[0] === 0x52
    && content[1] === 0x49
    && content[2] === 0x46
    && content[3] === 0x46
    && content[8] === 0x57
    && content[9] === 0x45
    && content[10] === 0x42
    && content[11] === 0x50;
}

export function isValidImageBuffer(content: Uint8Array): boolean {
  return isPng(content) || isJpeg(content) || isWebp(content);
}

export function estimateQuizTargetDurationMinutes(questionCount: number): number {
  return Math.max(3, Math.round((questionCount * QUIZ_SECONDS_PER_QUESTION) / 60));
}

export function estimateQuizTargetWordCount(targetDurationMinutes: number, wordsPerSecond: number): number {
  return Math.round(targetDurationMinutes * 60 * Math.max(0.1, wordsPerSecond) * 0.95);
}

export type TopicRun = { generated_at: string; candidates: TopicCandidate[] };

export const allowedEpisodeFiles = new Set([
  "brief.md",
  "research.md",
  "sources.md",
  "treatment.md",
  "outline.md",
  "script.md",
  "visual_bible.md",
  "scene_plan.md",
  "dialogue_script.md",
  "video_prompts.md",
]);
