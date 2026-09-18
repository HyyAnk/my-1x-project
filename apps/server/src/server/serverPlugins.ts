import path from "node:path";
import { access } from "node:fs/promises";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";

export async function registerFrontend(server: FastifyInstance, rootDirectory: string): Promise<void> {
  const frontendDirectory = path.join(rootDirectory, "apps", "web", "dist");
  try {
    await access(frontendDirectory);
    await server.register(fastifyStatic, { root: frontendDirectory, prefix: "/", index: false });
    server.get("/", async (_request, reply) => reply.sendFile("index.html"));
  } catch {
    // Vite serves the web app during development.
  }
}

export async function registerServerPlugins(server: FastifyInstance, rootDirectory: string): Promise<void> {
  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. same-origin, curl, server-to-server, desktop tools)
      if (!origin) {
        cb(null, true);
        return;
      }
      try {
        const parsed = new URL(origin);
        const isLoopback =
          parsed.hostname === "localhost" ||
          parsed.hostname === "127.0.0.1" ||
          parsed.hostname === "::1" ||
          parsed.hostname === "[::1]" ||
          parsed.hostname.endsWith(".localhost");
        if (isLoopback) {
          cb(null, true);
          return;
        }
      } catch {
        // Invalid URL format
      }
      cb(new Error("Not allowed by CORS"), false);
    },
  });
  await server.register(websocket);
  await registerFrontend(server, rootDirectory);
}
