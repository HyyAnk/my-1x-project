import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyPluginCallback } from "fastify";
import { quizShortProductRef, type QuizAssessment, type QuizShort, type Task } from "@studio/shared";
import { RepositoryError, type RepositoryService } from "../repository.js";
import type { TaskManager } from "../tasks.js";
import { sendRange } from "./audioVideo.js";

export type QuizShortWorkspaceRouteDeps = {
  repository: RepositoryService;
  tasks: TaskManager;
};

type QuizShortParams = { channelId: string; quizShortId: string };

export type QuizShortStageState = "not_started" | "ready" | "stale" | "running" | "failed";

export type QuizShortWorkspaceStages = Record<"questions" | "director" | "timeline" | "qa" | "render", QuizShortStageState>;

function assessmentStage(assessment: QuizAssessment | null): QuizShortStageState {
  if (!assessment) return "not_started";
  return assessment.issues.some((issue) => issue.severity === "blocker") ? "failed" : "ready";
}

function renderStage(quizShort: QuizShort, activeTask: Task | undefined): QuizShortStageState {
  if (activeTask?.task_type === "GENERATE_VIDEO") return "running";
  if (!quizShort.video_asset_path) return "not_started";
  return quizShort.render_stale ? "stale" : "ready";
}

/**
 * Read-only artifact endpoints the Quiz Short workspace view needs: one aggregated workspace
 * payload, the rendered video stream and the render manifest. Writes stay in quizShorts.ts.
 */
export function registerQuizShortWorkspaceRoutes(deps: QuizShortWorkspaceRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { repository, tasks } = deps;
    const base = "/api/channels/:channelId/quiz-shorts/:quizShortId";

    server.get(`${base}/workspace`, async (request) => {
      const params = request.params as QuizShortParams;
      const ref = quizShortProductRef(params.channelId, params.quizShortId);
      const quizShort = await repository.getQuizShort(params.channelId, params.quizShortId);
      const [quiz, directorPlan, timeline, assessment, timings] = await Promise.all([
        repository.readQuiz(params.channelId, ref),
        repository.readDirectorPlan(params.channelId, ref),
        repository.readQuizTimeline(params.channelId, ref),
        repository.readQuizAssessment(params.channelId, ref),
        repository.readQuizStageTimings(params.channelId, ref),
      ]);
      const activeTask = tasks
        .list()
        .find((task) => task.episode_id === params.quizShortId && ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(task.status));
      const stages: QuizShortWorkspaceStages = {
        questions: quiz ? "ready" : "not_started",
        director: directorPlan ? "ready" : "not_started",
        timeline: timeline ? "ready" : "not_started",
        qa: assessmentStage(assessment),
        render: renderStage(quizShort, activeTask),
      };
      return {
        quiz_short: quizShort,
        quiz,
        director_plan: directorPlan,
        timeline,
        assessment,
        timings,
        render_stale: Boolean(quizShort.render_stale),
        stages,
      };
    });

    server.get(`${base}/video`, async (request, reply) => {
      const params = request.params as QuizShortParams;
      const file = await repository.getEpisodeVideoFile(params.channelId, quizShortProductRef(params.channelId, params.quizShortId));
      return sendRange(request.headers.range, file, "video/mp4", reply, `inline; filename="quiz-short.mp4"`);
    });

    server.get(`${base}/render-manifest`, async (request) => {
      const params = request.params as QuizShortParams;
      const location = await repository.locateQuizProduct(params.channelId, quizShortProductRef(params.channelId, params.quizShortId));
      try {
        const raw = await readFile(path.join(location.directory, "assets", "render-manifest.json"), "utf8");
        return { manifest: JSON.parse(raw) as unknown };
      } catch {
        throw new RepositoryError("Render manifest not found", "RENDER_MANIFEST_NOT_FOUND");
      }
    });

    done();
  };
}
