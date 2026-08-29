import type { Task } from "@studio/shared";
import type { CodexAppServerClient, CodexServerRequest } from "../codex.js";
import { RepositoryError } from "../repository.js";

export type ApprovalRequestMap = Map<number, { taskId: string; request: CodexServerRequest }>;

export async function decideTaskApproval(
  taskId: string,
  requestId: number,
  decision: "accept" | "acceptForSession" | "decline" | "cancel",
  approvalRequests: ApprovalRequestMap,
  codex: CodexAppServerClient,
  finish: (taskId: string, status: "CANCELLED", message: string) => Promise<void>,
  update: (taskId: string, patch: Partial<Task>) => Promise<void>,
  getTask: (taskId: string) => Task,
): Promise<Task> {
  const pending = approvalRequests.get(requestId);
  if (!pending || pending.taskId !== taskId) {
    throw new RepositoryError("Approval request not found", "APPROVAL_NOT_FOUND");
  }

  approvalRequests.delete(requestId);
  codex.respond(requestId, { decision });

  if (decision === "decline" || decision === "cancel") {
    await finish(taskId, "CANCELLED", "Approval denied");
  } else {
    await update(taskId, { status: "RUNNING", progress_message: "Approval granted" });
  }

  return getTask(taskId);
}
