import type { Task } from "@studio/shared";
import type { CodexAppServerClient, CodexServerRequest } from "../codex.js";
import { decideTaskApproval } from "./taskApprovalManager.js";

export type ApprovalDecision = "accept" | "acceptForSession" | "decline" | "cancel";
export type ApprovalRequestEntry = { taskId: string; request: CodexServerRequest };

type ApprovalLifecycleCallbacks = {
  finish: (taskId: string, status: "CANCELLED", message: string) => Promise<void>;
  update: (taskId: string, patch: Partial<Task>) => Promise<void>;
  getTask: (taskId: string) => Task;
};

/**
 * Owns pending approval requests and the decideTaskApproval wiring.
 *
 * The `TaskManagerRuntime.approvalRequests` field contract is frozen (the
 * stream approval handler and tests access the map directly), so TaskManager
 * exposes this registry's map through that flat property while the registry
 * remains the cohesive owner of the approval lifecycle.
 */
export class TaskApprovalRegistry {
  readonly requests = new Map<number, ApprovalRequestEntry>();

  constructor(
    private readonly codex: CodexAppServerClient,
    private readonly lifecycle: ApprovalLifecycleCallbacks,
  ) {}

  decide(taskId: string, requestId: number, decision: ApprovalDecision): Promise<Task> {
    return decideTaskApproval(
      taskId,
      requestId,
      decision,
      this.requests,
      this.codex,
      this.lifecycle.finish,
      this.lifecycle.update,
      this.lifecycle.getTask,
    );
  }

  clear(): void {
    this.requests.clear();
  }
}
