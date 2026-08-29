import type { FastifyPluginCallback } from "fastify";
import { ApprovalDecisionSchema, type TaskType } from "@studio/shared";
import type { CodexAppServerClient } from "../codex.js";
import { RepositoryError } from "../repository.js";
import type { TaskManager } from "../tasks.js";

export type TasksRouteDeps = {
  tasks: TaskManager;
  codex: CodexAppServerClient;
};

export function registerTasksRoutes(deps: TasksRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { tasks, codex } = deps;
    server.get("/api/tasks", () => ({ tasks: tasks.list(), codex_status: tasks.getStatus() }));
    server.post("/api/tasks", async (request, reply) => {
      const body = request.body as { task_type?: TaskType; channel_id?: string; episode_id?: string | null; scene_number?: number };
      if (!body.task_type || !body.channel_id) throw new RepositoryError("Task type and channel are required", "INVALID_TASK");
      const task = tasks.submit(body.task_type, body.channel_id, body.episode_id ?? null, body.scene_number);
      return reply.code(202).send({ task });
    });
    server.post("/api/tasks/:taskId/cancel", async (request) => tasks.cancel((request.params as { taskId: string }).taskId));
    server.post("/api/tasks/:taskId/approval", async (request) => {
      const params = request.params as { taskId: string };
      const body = request.body as { request_id?: number; decision?: string };
      const parsed = ApprovalDecisionSchema.parse({ decision: body.decision });
      if (typeof body.request_id !== "number") throw new RepositoryError("Approval request id is required", "INVALID_APPROVAL");
      return tasks.decideApproval(params.taskId, body.request_id, parsed.decision);
    });
    server.post("/api/codex/reconnect", async () => {
      await codex.close();
      try {
        await codex.connect();
        return { status: "connected" };
      } catch {
        return { status: "unavailable", message: "Codex App Server unavailable" };
      }
    });
    done();
  };
}
