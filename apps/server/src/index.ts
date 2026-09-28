import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { loadStorageRoot } from "./config.js";
import { acquireStorageMaintenanceLease } from "./quiz/mascot/videoAnimation/storage/maintenanceLease.js";
import { runStartupStorageMaintenance } from "./quiz/mascot/videoAnimation/storage/startupStorageMaintenance.js";

const workspaceRoot = process.env.STUDIO_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
try {
  process.loadEnvFile?.(path.join(workspaceRoot, ".env"));
} catch {
  // .env is optional
}
const storageRoot = (await loadStorageRoot(workspaceRoot)) ?? workspaceRoot;
const releaseStorageLease = acquireStorageMaintenanceLease(storageRoot);
await runStartupStorageMaintenance(storageRoot);
const app = await buildApp(workspaceRoot);
const port = Number(process.env.PORT ?? 4310);
const host = process.env.HOST ?? "127.0.0.1";
await app.server.listen({ port, host });
app.logger.ok(`AI Quiz Studio server listening on http://${host}:${port}`, { step: "startup", workerId: "server" });

const shutdown = async () => {
  await app.close();
  releaseStorageLease();
  process.exit(0);
};
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
