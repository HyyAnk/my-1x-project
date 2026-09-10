import path from "node:path";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import type { FastifyPluginCallback } from "fastify";
import { StoragePathInputSchema, type StorageInfo } from "@studio/shared";
import type { StudioLogger } from "../logger.js";
import { RepositoryError, type RepositoryService } from "../repository.js";
import type { TaskManager } from "../tasks.js";
import type { CodexAppServerClient } from "../codex.js";
import type { AntigravityClient } from "../antigravity.js";
import { saveStorageRoot } from "../config.js";
import type { AppState } from "./state.js";
import { getStorageUsageSummary, pruneStaleHyperframesDirectories } from "../tasks/storage/artifactRetentionPruner.js";

export type SystemRouteDeps = {
  rootDirectory: string;
  repository: RepositoryService;
  tasks: TaskManager;
  codex: CodexAppServerClient;
  antigravity: AntigravityClient;
  logger: StudioLogger;
  state: AppState;
};

export function registerSystemRoutes(deps: SystemRouteDeps): FastifyPluginCallback {
  return (server, _options, done) => {
    const { rootDirectory, repository, tasks, codex, antigravity, logger, state } = deps;
    const getStorageInfo = (): StorageInfo => ({
      path: repository.storageRoot,
      default_path: path.resolve(rootDirectory),
      channel_path: repository.roots.channels,
      configured: state.storageConfigured,
    });

    server.get("/api/health", () => ({
      ok: true,
      service: "ai-quiz-studio",
      active_engine: tasks.getActiveEngine(),
      codex_status: tasks.getCodexStatus(),
      antigravity_status: tasks.getAntigravityStatus(),
    }));
    server.post("/api/shutdown", async (_request, reply) => {
      if (process.platform === "win32") {
        const script = path.join(rootDirectory, "scripts", "stop-dashboard.ps1");
        spawn(
          "powershell.exe",
          ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-ProjectRoot", rootDirectory, "-DelayMilliseconds", "900"],
          {
            detached: true,
            stdio: "ignore",
            windowsHide: true,
          },
        ).unref();
      }
      await reply.code(202).send({ ok: true });
      setTimeout(() => {
        void codex
          .close()
          .catch(() => undefined)
          .finally(() => {
            void antigravity
              .close()
              .catch(() => undefined)
              .finally(() => {
                void server.close().finally(() => process.exit(0));
              });
          });
      }, 500);
    });
    server.get("/api/git", () => repository.getGitInfo());
    server.get("/api/config", () => ({
      ...state.config,
      codex: { ...state.config.codex, api_key: "" },
      antigravity: { ...state.config.antigravity, api_key: "" },
      image_generation: {
        ...state.config.image_generation,
        api_key: "",
        has_api_key: Boolean(state.config.image_generation.api_key),
      },
      image_fallback: {
        ...state.config.image_fallback,
        api_key: "",
        has_api_key: Boolean(state.config.image_fallback?.api_key),
      },
    }));
    server.get("/api/storage", () => getStorageInfo());
    server.post("/api/storage", async (request) => {
      const { path: requestedPath } = StoragePathInputSchema.parse(request.body);
      if (tasks.hasActiveWork()) throw new RepositoryError("Finish active tasks before changing storage", "STORAGE_BUSY");
      const nextStorageRoot = path.resolve(rootDirectory, requestedPath);
      const gitDirectory = path.resolve(rootDirectory, ".git");
      if (nextStorageRoot === gitDirectory || nextStorageRoot.startsWith(`${gitDirectory}${path.sep}`)) {
        throw new RepositoryError("Storage folder cannot be inside .git", "INVALID_STORAGE_PATH");
      }
      await mkdir(nextStorageRoot, { recursive: true });
      await repository.setStorageRoot(nextStorageRoot);
      await repository.ensureBootstrap();
      logger.setRuntimeRoot(repository.roots.runtime);
      await tasks.reload();
      await saveStorageRoot(rootDirectory, nextStorageRoot);
      state.storageConfigured = true;
      logger.ok("Content storage folder updated", { step: "storage" });
      return getStorageInfo();
    });
    server.get("/api/system/storage-health", async () => {
      const summary = await getStorageUsageSummary(repository.rootDirectory, repository.roots.runtime);
      return {
        ok: true,
        runtime_bytes: summary.runtime_bytes,
        hyperframes_bytes: summary.hyperframes_bytes,
        storage_root: repository.storageRoot,
        runtime_root: repository.roots.runtime,
        usage: summary,
      };
    });
    server.post("/api/system/prune-storage", async (request) => {
      const body = (request.body as { max_age_ms?: number; maxAgeMs?: number } | undefined) ?? {};
      const maxAgeMs = body.max_age_ms ?? body.maxAgeMs;
      const hyperframesRoot = repository.resolvePath("runtime", "hyperframes");
      const activeEpisodeIds = new Set(
        tasks
          .list()
          .filter((task) => ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(task.status) && task.episode_id)
          .map((task) => task.episode_id as string),
      );
      const pruneResult = await pruneStaleHyperframesDirectories(hyperframesRoot, maxAgeMs, activeEpisodeIds);
      const summary = await getStorageUsageSummary(repository.rootDirectory, repository.roots.runtime);
      logger.ok("Storage pruning executed", {
        pruned_count: pruneResult.prunedDirs.length,
        reclaimed_bytes: pruneResult.reclaimedBytes,
        step: "storage_prune",
      });
      return {
        ok: true,
        reclaimed_bytes: pruneResult.reclaimedBytes,
        reclaimedBytes: pruneResult.reclaimedBytes,
        pruned_directories: pruneResult.prunedDirs,
        prunedDirs: pruneResult.prunedDirs,
        storage_usage: summary,
        usage: summary,
      };
    });
    done();
  };
}
