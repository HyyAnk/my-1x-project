import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Channel, QuizShort, QuizV2 } from "@studio/shared";
import type { RepositoryService } from "../../repository.js";
import { thumbnailInputFingerprint } from "./thumbnailReuseStore.js";

export const QUIZ_SHORT_COVER_MANIFEST_FILENAME = "cover-manifest.json";
export const QUIZ_SHORT_COVER_FILENAME = "cover.png";

export const QuizShortCoverManifestSchema = z.object({
  version: z.literal(1),
  prompt_version: z.string().min(1),
  /** Hash of every input that changes the cover: questions, topic, mascot, prompt version. */
  fingerprint: z.string().min(1),
  asset_path: z.string().min(1),
  hook_text: z.string().min(1),
  badge_text: z.string().min(1),
  archetype_name: z.string().min(1),
  width: z.literal(1080),
  height: z.literal(1920),
  provider: z.string().optional(),
  model: z.string().optional(),
  generated_at: z.string().min(1),
});
export type QuizShortCoverManifest = z.infer<typeof QuizShortCoverManifestSchema>;

export interface QuizShortCoverFingerprintInput {
  promptVersion: string;
  quizShort: Pick<QuizShort, "topic" | "quiz_config">;
  quiz: Pick<QuizV2, "questions">;
  channel: Pick<Channel, "language" | "mascot_id">;
  mascotAnchorFingerprint?: string | null;
}

/** Only the inputs the cover depends on: a voice or timeline change never forces a paid regeneration. */
export function quizShortCoverFingerprint(input: QuizShortCoverFingerprintInput): string {
  return thumbnailInputFingerprint({
    version: 1,
    promptVersion: input.promptVersion,
    topic: input.quizShort.topic,
    style: input.quizShort.quiz_config.resolved_visual_style ?? input.quizShort.quiz_config.visual_style,
    mascotStyle: input.quizShort.quiz_config.mascot_style_id ?? null,
    questions: input.quiz.questions.map(({ question, choices, correct_choice_id }) => ({ question, choices, correct_choice_id })),
    language: input.channel.language,
    mascotId: input.channel.mascot_id,
    mascotAnchorFingerprint: input.mascotAnchorFingerprint ?? null,
  });
}

export async function readQuizShortCoverManifest(
  repository: RepositoryService,
  channelId: string,
  quizShortId: string,
): Promise<QuizShortCoverManifest | null> {
  const location = await repository.locateQuizProduct(channelId, quizShortId);
  try {
    const raw: unknown = JSON.parse(await readFile(path.join(location.directory, QUIZ_SHORT_COVER_MANIFEST_FILENAME), "utf8"));
    return QuizShortCoverManifestSchema.parse(raw);
  } catch {
    return null;
  }
}

export async function writeQuizShortCoverManifest(
  repository: RepositoryService,
  channelId: string,
  quizShortId: string,
  manifest: QuizShortCoverManifest,
): Promise<void> {
  const location = await repository.locateQuizProduct(channelId, quizShortId);
  await repository.writeJsonAtomic(
    path.join(location.directory, QUIZ_SHORT_COVER_MANIFEST_FILENAME),
    QuizShortCoverManifestSchema.parse(manifest),
  );
}
