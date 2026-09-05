import type { AntigravityClient } from "../antigravity.js";
import type { CodexAppServerClient, CodexServerRequest } from "../codex.js";
import type { TaskManagerRuntime } from "./runtime.js";

export type ConnectionStatus = "connected" | "disconnected" | "unavailable" | "connecting";

export interface TaskManagerWithClientStatus extends TaskManagerRuntime {
  connectionStatus?: ConnectionStatus;
  antigravityStatus?: ConnectionStatus;
}

export function attachTaskManagerClientEvents(
  taskManager: TaskManagerRuntime,
  codex: CodexAppServerClient,
  antigravity?: AntigravityClient,
): void {
  const target = taskManager as TaskManagerWithClientStatus;

  codex.on("status", (status: ConnectionStatus) => {
    target.connectionStatus = status;
    target.emitEvent({ type: "codex.status", status });
  });

  codex.on("notification", (event: { method: string; params: Record<string, unknown> }) => {
    target.handleNotification(event.method, event.params);
  });

  codex.on("serverRequest", (request: CodexServerRequest) => {
    target.handleServerRequest(request);
  });

  codex.on("exit", () => {
    target.connectionStatus = "unavailable";
    target.emitEvent({ type: "codex.status", status: "unavailable", message: "Codex App Server unavailable" });
  });

  if (antigravity) {
    antigravity.on("status", (status: ConnectionStatus) => {
      target.antigravityStatus = status;
      target.emitEvent({ type: "antigravity.status", status });
    });

    antigravity.on("notification", (event: { method: string; params: Record<string, unknown> }) => {
      target.handleNotification(event.method, event.params);
    });
  }
}
