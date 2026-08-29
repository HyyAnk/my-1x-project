import type { FastifyPluginCallback } from "fastify";
import type { TaskEvent } from "@studio/shared";
import type { TaskManager } from "../tasks.js";

export type EventClient = { send: (payload: string) => void; readyState: number; OPEN: number };

export type EventsRouteDeps = {
  tasks: TaskManager;
  clients: Set<EventClient>;
};

export function registerEventsRoutes(deps: EventsRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { tasks, clients } = deps;
    server.get("/api/events", { websocket: true }, (socket) => {
      const client = socket as unknown as EventClient;
      clients.add(client);
      client.send(JSON.stringify({ type: "codex.status", status: tasks.getStatus() } satisfies TaskEvent));
      for (const task of tasks.list().filter((item) => ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(item.status))) {
        client.send(JSON.stringify({ type: "task.updated", task } satisfies TaskEvent));
      }
      socket.on("close", () => clients.delete(client));
    });
    done();
  };
}
