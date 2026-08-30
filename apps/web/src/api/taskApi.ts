import type { Task } from "@studio/shared";
import { request } from "./client";

export const taskApi = {
  tasks: () => request<{ tasks: Task[]; codex_status: string }>("/api/tasks"),
  shutdown: () => request<{ ok: true }>("/api/shutdown", { method: "POST", body: "{}" }),
  createTask: (body: unknown) => request<{ task: Task }>("/api/tasks", { method: "POST", body: JSON.stringify(body) }),
  cancelTask: (id: string) => request<Task>(`/api/tasks/${id}/cancel`, { method: "POST", body: "{}" }),
  approve: (id: string, requestId: number, decision: string) =>
    request<Task>(`/api/tasks/${id}/approval`, { method: "POST", body: JSON.stringify({ request_id: requestId, decision }) }),
  git: () => request<{ branch: string | null; dirty: boolean; changed_files: number }>("/api/git"),
  reconnectCodex: () => request<{ status: string; message?: string }>("/api/codex/reconnect", { method: "POST", body: "{}" }),
};
