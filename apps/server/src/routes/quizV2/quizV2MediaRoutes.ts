import type { FastifyInstance } from "fastify";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SandboxPreviewInputBaseSchema, sandboxPreviewLayoutIssues } from "@studio/shared";
import { buildSandboxComposition } from "../../quiz/render/sandboxComposition.js";
import { resolveCandyArcadeFont } from "../../quiz/render/candyArcade/candyArcadeFonts.js";
import { defaultSfxCandidateDirectories, resolveSfxCandidatePath } from "../../quiz/audio/soundtrackSfxPlanner.js";
import { RepositoryError } from "../../repository.js";
import type { QuizV2RouteDeps } from "./quizV2Types.js";

/**
 * Registers media preview, static font resolution, SFX streaming, and soundtrack routes for Quiz V2.
 */
export function registerQuizV2MediaRoutes(server: FastifyInstance, deps: QuizV2RouteDeps): void {
  const { repository } = deps;

  server.post("/api/quiz/preview-composition", async (request, reply) => {
    const input = SandboxPreviewInputBaseSchema.parse(request.body ?? {});
    const layoutIssues = sandboxPreviewLayoutIssues(input);
    if (layoutIssues.length) {
      return reply.code(400).send({
        error: layoutIssues[0].message,
        code: "QUIZ_LAYOUT_INCOMPATIBLE",
        issues: layoutIssues,
      });
    }
    const mascot = input.mascot_id ? await repository.getMascot(input.mascot_id).catch(() => null) : null;
    return buildSandboxComposition(input, mascot);
  });

  server.get("/api/quiz/fonts/:fontId", async (request, reply) => {
    const { fontId } = request.params as { fontId: string };
    const font = resolveCandyArcadeFont(fontId, repository.rootDirectory);
    if (!font) throw new RepositoryError("Quiz font not found", "QUIZ_FONT_NOT_FOUND");
    const content = await readFile(font.absolutePath);
    return reply
      .type(font.mimeType)
      .header("Cache-Control", "public, max-age=31536000, immutable")
      .header("ETag", `"${font.sha256}"`)
      .header("X-Content-Type-Options", "nosniff")
      .send(content);
  });

  server.get("/api/quiz/sfx/:filename", async (request, reply) => {
    const { filename } = request.params as { filename: string };
    const sanitized = path.basename(filename);
    const candidateDirs = [path.resolve(repository.rootDirectory, "assets", "audio", "sfx"), ...defaultSfxCandidateDirectories()];
    const sfxPath = resolveSfxCandidatePath(sanitized, candidateDirs);
    if (!sfxPath) {
      throw new RepositoryError("Quiz SFX audio not found", "QUIZ_SFX_NOT_FOUND");
    }
    try {
      const content = await readFile(sfxPath);
      return reply
        .type(sanitized.endsWith(".mp3") ? "audio/mpeg" : "audio/wav")
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .header("Content-Disposition", `inline; filename="${sanitized}"`)
        .header("X-Content-Type-Options", "nosniff")
        .send(content);
    } catch {
      throw new RepositoryError("Quiz SFX audio not found", "QUIZ_SFX_NOT_FOUND");
    }
  });

  server.get("/api/channels/:channelId/episodes/:episodeId/quiz-v2/soundtrack", async (request, reply) => {
    const params = request.params as { channelId: string; episodeId: string };
    const soundtrackPath = repository.resolvePath("runtime", "hyperframes", params.episodeId, "soundtrack.wav");
    try {
      const content = await readFile(soundtrackPath);
      return reply.type("audio/wav").header("Content-Disposition", 'inline; filename="soundtrack.wav"').send(content);
    } catch {
      throw new RepositoryError("Soundtrack not found for this episode", "SOUNDTRACK_NOT_FOUND");
    }
  });
}
