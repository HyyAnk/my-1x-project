import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TaskManager } from "../src/tasks/manager.js";
import { ContextEngine } from "../src/context.js";
import { StudioLogger } from "../src/logger.js";
import { RepositoryService } from "../src/repository/service.js";
import { beginReelUnitAttempt } from "../src/shortReel/unitLifecycle.js";
import { packageFixture, packageImage } from "./helpers/shortReelPackageFixture.js";
import { repairScript } from "./helpers/shortReelRepairFixture.js";
import { generateFullReelPackage } from "../src/shortReel/packageService.js";
import { executeReelGeneration } from "../src/shortReel/generationWorkflow.js";
import { fakePortraitClient } from "./helpers/shortReelUpgradeFixture.js";

class FakeCodex extends EventEmitter {
  isConnected = false;
}

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

async function fixture() {
  const f = await packageFixture();
  cleanups.push(f.cleanup);
  return f;
}

function createTestTaskManager(repo: RepositoryService) {
  const logger = new StudioLogger(repo.storageRoot);
  const manager = new TaskManager(repo, new ContextEngine(repo, logger), new FakeCodex() as never, 1, 8, logger);
  return manager;
}

const mockShortReelLlm = {
  connect: async () => {},
  generateContent: async (prompt: string) => {
    const p = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
    if (p.includes("copywriter") || p.includes("publishing")) {
      return {
        text: JSON.stringify({
          title: "Restart Test Title",
          description: "Restart Test Description #Shorts",
        }),
      };
    }
    return {
      text: JSON.stringify(repairScript()),
    };
  },
};

describe("Short-Reel Task Restart and Recovery (Phase 07: R01, R02, R03)", () => {
  it("R01: server restart reconciles interrupted pending units as failed/recoverable and preserves accepted siblings", async () => {
    const f = await fixture();

    // 1. Generate full package to reach ready state
    const ready = await generateFullReelPackage(f.repo, f.key, {
      script: repairScript(),
      coverOptions: { imageProvider: f.imageProvider },
    });
    expect(ready.units.script.state).toBe("ready");
    expect(ready.units.publishing.state).toBe("ready");
    expect(ready.units.cover.state).toBe("ready");
    expect(ready.units.references.state).toBe("ready");

    // 2. Simulate an in-flight attempt on cover right before server shutdown
    await beginReelUnitAttempt(f.repo, f.key, "cover", "interrupted_op_123", "fp_cover");
    const pendingRecord = await f.repo.getShortReel(f.key);
    expect(pendingRecord.units.cover.state).toBe("pending");
    expect(pendingRecord.units.cover.current_attempt?.operation_id).toBe("interrupted_op_123");

    // 3. Initialize TaskManager (simulating server startup reconciliation)
    const taskManager = createTestTaskManager(f.repo);
    cleanups.push(async () => {
      taskManager.removeAllListeners();
    });

    // Reconcile orphaned/interrupted tasks (runs on server startup)
    await taskManager.reconcileOrphanedTasks();

    // 4. Verify that the interrupted pending unit was marked cancelled/failed (recoverable)
    const reconciled = await f.repo.getShortReel(f.key);
    expect(reconciled.units.cover.current_attempt?.error).toBe("ABORTED");
    expect(reconciled.units.cover.current_attempt?.completed_at).toBeDefined();

    // 5. Verify that accepted siblings and prior payload were preserved
    expect(reconciled.units.script.state).toBe("ready");
    expect(reconciled.units.references.state).toBe("ready");
    expect(reconciled.units.publishing.state).toBe("ready");
    expect(reconciled.units.cover.last_accepted_payload).toBeDefined();
    expect(reconciled.units.cover.last_accepted_payload?.asset_id).toBe(ready.units.cover.last_accepted_payload?.asset_id);
  });

  it("R01: completed tasks loaded from disk do not rerun and do not trigger paid generation on startup", async () => {
    const f = await fixture();

    // Persist a completed task to disk in runtime/tasks/
    const taskId = "task-completed-prior";
    const completedTask = {
      task_id: taskId,
      task_type: "GENERATE_SHORT_REEL_PACKAGE",
      channel_id: f.key.channel_id,
      episode_id: null,
      reel_id: f.key.reel_id,
      short_reel_request: {
        expected_revision: 1,
        request_id: "prior_req_1",
        target: "package",
      },
      status: "COMPLETED",
      created_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      lock_key: `${f.key.reel_id}:reel`,
      progress_message: "Completed",
    };

    const taskFilePath = f.repo.resolvePath("runtime", "tasks", `${taskId}.json`);
    await mkdir(path.dirname(taskFilePath), { recursive: true });
    await writeFile(taskFilePath, JSON.stringify(completedTask, null, 2), "utf8");

    // Initialize TaskManager - loads tasks from disk
    const taskManager = createTestTaskManager(f.repo);
    cleanups.push(async () => {
      taskManager.removeAllListeners();
    });

    await taskManager.load();
    await taskManager.reconcileOrphanedTasks();

    // The completed task is loaded into state and remains COMPLETED
    const loaded = taskManager.get(taskId);
    expect(loaded).toBeDefined();
    expect(loaded?.status).toBe("COMPLETED");

    // TaskManager running counts remain zero
    expect(taskManager.runningCount).toBe(0);
  });

  it("R02: repairs v1 record without re-charging for already ready units", async () => {
    const f = await fixture();

    // Set up a record with accepted script
    const script = repairScript();
    await f.repo.updateShortReel(f.key, { expected_revision: 1, request_id: "init_script" }, { kind: "update_script", script });

    let imageCalls = 0;
    const client = fakePortraitClient(await packageImage("purple", 720, 1280));
    const countingClient = {
      ...client,
      generate: async (req: any) => {
        imageCalls++;
        return client.generate(req);
      },
    };

    // Execute repair generation workflow
    const result = await executeReelGeneration(
      f.repo,
      f.key,
      { expected_revision: 2, request_id: "repair_job", target: "package", mode: "repair" },
      {
        imageClient: countingClient,
        llmClient: mockShortReelLlm,
        signal: new AbortController().signal,
        onProgress: async () => {},
      },
    );

    expect(result.units.script.state).toBe("ready");
    expect(result.units.references.state).toBe("ready");
    expect(result.units.cover.state).toBe("ready");
    expect(result.units.publishing.state).toBe("ready");

    // 2 image calls made: style reference + cover image
    expect(imageCalls).toBe(2);

    // Running repair AGAIN on a fully ready package makes ZERO new image calls
    const readyAgain = await f.repo.getShortReel(f.key);
    await executeReelGeneration(
      f.repo,
      f.key,
      { expected_revision: readyAgain.revision, request_id: "repair_job_2", target: "package", mode: "repair" },
      {
        imageClient: countingClient,
        llmClient: mockShortReelLlm,
        signal: new AbortController().signal,
        onProgress: async () => {},
      },
    );

    // Call count must remain 2 (zero new calls!)
    expect(imageCalls).toBe(2);
  });
});
