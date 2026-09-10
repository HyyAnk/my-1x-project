import { mkdtemp, mkdir, rm, writeFile, utimes, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi, afterEach } from "vitest";
import { EpisodeSchema, TaskSchema } from "@studio/shared";
import { buildApp } from "../src/app.js";
import type { TaskManagerRuntime } from "../src/tasks/runtime.js";
import { reconcileStartupState } from "../src/tasks/taskLifecycle.js";
import {
  pruneRenderRootIntermediateFiles,
  pruneStaleHyperframesDirectories,
  getStorageUsageSummary,
} from "../src/tasks/storage/artifactRetentionPruner.js";
import { runVideoTask } from "../src/tasks/videoRunner.js";

vi.mock("../src/tasks/video/videoCompositionPreparer.js", () => ({
  prepareVideoComposition: vi.fn(),
  pinEpisodeStyleRevision: vi.fn((_repo, _ch, ep) => Promise.resolve(ep)),
}));

vi.mock("../src/tasks/video/videoLayoutChecker.js", () => ({
  verifyAndCheckLayout: vi.fn().mockResolvedValue({ bypassed: false }),
}));

vi.mock("../src/tasks/video/videoRenderExecution.js", () => ({
  executeHyperframesRender: vi.fn().mockResolvedValue({
    probe: { issues: [], probe: { streams: [] } },
    duration: 12.5,
  }),
}));

vi.mock("../src/tasks/video/renderManifestWriter.js", () => ({
  persistVideoRenderArtifacts: vi.fn().mockResolvedValue({
    videoPath: "channels/ch-1/episodes/ep-1/quiz-video.mp4",
    manifestPath: "channels/ch-1/episodes/ep-1/render-manifest.json",
  }),
}));

const cleanupDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(cleanupDirs.splice(0).map((d) => rm(d, { recursive: true, force: true, maxRetries: 3 })));
});

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  cleanupDirs.push(dir);
  return dir;
}

describe("artifactRetentionPruner", () => {
  it("prunes heavy intermediate media files while retaining checkpoints and logs", async () => {
    const renderRoot = await createTempDir("render-prune-");
    const mascotDir = path.join(renderRoot, "mascot-assets");
    await mkdir(mascotDir, { recursive: true });

    await writeFile(path.join(renderRoot, "narration.wav"), Buffer.alloc(1024 * 10, 1));
    await writeFile(path.join(renderRoot, "soundtrack.wav"), Buffer.alloc(1024 * 20, 2));
    await writeFile(path.join(renderRoot, "intro.mp4"), Buffer.alloc(1024 * 5, 3));
    await writeFile(path.join(renderRoot, "outro.mp4"), Buffer.alloc(1024 * 5, 4));
    await writeFile(path.join(renderRoot, "quiz-video.mp4"), Buffer.alloc(1024 * 50, 5));
    await writeFile(path.join(mascotDir, "mascot.png"), Buffer.alloc(1024 * 2, 6));

    const checkpointPath = path.join(renderRoot, "render-checkpoint.json");
    const logPath = path.join(renderRoot, "render-task-1.log");
    const htmlPath = path.join(renderRoot, "index.html");

    await writeFile(checkpointPath, JSON.stringify({ state: "saved" }));
    await writeFile(logPath, "Rendering frame 100\n");
    await writeFile(htmlPath, "<html><body>Quiz</body></html>");

    const result = await pruneRenderRootIntermediateFiles(renderRoot);

    expect(result.reclaimedBytes).toBeGreaterThanOrEqual(1024 * 92);
    expect(result.prunedFiles).toContain("narration.wav");
    expect(result.prunedFiles).toContain("soundtrack.wav");
    expect(result.prunedFiles).toContain("quiz-video.mp4");
    expect(result.prunedFiles).toContain("mascot-assets");

    expect(await stat(checkpointPath)).toBeDefined();
    expect(await stat(logPath)).toBeDefined();
    expect(await stat(htmlPath)).toBeDefined();
    await expect(stat(path.join(renderRoot, "narration.wav"))).rejects.toThrow();
  });

  it("prunes stale hyperframes directories based on age and protects active episode IDs", async () => {
    const hyperRoot = await createTempDir("stale-hyper-");
    const staleDir = path.join(hyperRoot, "ep-stale");
    const activeDir = path.join(hyperRoot, "ep-active");
    const recentDir = path.join(hyperRoot, "ep-recent");

    await mkdir(staleDir, { recursive: true });
    await mkdir(activeDir, { recursive: true });
    await mkdir(recentDir, { recursive: true });

    await writeFile(path.join(staleDir, "narration.wav"), Buffer.alloc(1024, 1));
    await writeFile(path.join(activeDir, "narration.wav"), Buffer.alloc(1024, 2));
    await writeFile(path.join(recentDir, "narration.wav"), Buffer.alloc(1024, 3));

    const pastTime = new Date(Date.now() - 36 * 60 * 60 * 1000);
    await utimes(staleDir, pastTime, pastTime);
    await utimes(path.join(staleDir, "narration.wav"), pastTime, pastTime);
    await utimes(activeDir, pastTime, pastTime);
    await utimes(path.join(activeDir, "narration.wav"), pastTime, pastTime);

    const activeIds = new Set(["ep-active"]);
    const result = await pruneStaleHyperframesDirectories(hyperRoot, 24 * 60 * 60 * 1000, activeIds);

    expect(result.prunedDirs).toEqual(["ep-stale"]);
    expect(result.reclaimedBytes).toBeGreaterThanOrEqual(1024);
    await expect(stat(staleDir)).rejects.toThrow();
    expect(await stat(activeDir)).toBeDefined();
    expect(await stat(recentDir)).toBeDefined();
  });

  it("runVideoTask triggers pruning after persisting artifacts", async () => {
    const renderRoot = await createTempDir("run-video-prune-");
    await writeFile(path.join(renderRoot, "narration.wav"), Buffer.alloc(2048, 1));
    await writeFile(path.join(renderRoot, "quiz-video.mp4"), Buffer.alloc(4096, 2));
    await writeFile(path.join(renderRoot, "render-checkpoint.json"), "{}");
    await writeFile(path.join(renderRoot, "render-task-1.log"), "log");

    const { prepareVideoComposition } = await import("../src/tasks/video/videoCompositionPreparer.js");
    vi.mocked(prepareVideoComposition).mockResolvedValue({
      renderRoot,
      compositionPath: path.join(renderRoot, "index.html"),
      outputPath: path.join(renderRoot, "quiz-video.mp4"),
      checkpointPath: path.join(renderRoot, "render-checkpoint.json"),
      sourceFingerprint: "fp123",
      html: "<html></html>",
      selectedBgmTrackId: null,
      selectedBgmFilename: null,
      assetResolution: null,
      completeQuizV2: false,
      preflightAssessment: null,
    });

    const { verifyAndCheckLayout } = await import("../src/tasks/video/videoLayoutChecker.js");
    vi.mocked(verifyAndCheckLayout).mockResolvedValue({ bypassed: false });

    const { executeHyperframesRender } = await import("../src/tasks/video/videoRenderExecution.js");
    vi.mocked(executeHyperframesRender).mockResolvedValue({
      probe: { issues: [], probe: { streams: [] } },
      duration: 12.5,
    });

    const { persistVideoRenderArtifacts } = await import("../src/tasks/video/renderManifestWriter.js");
    vi.mocked(persistVideoRenderArtifacts).mockResolvedValue({
      videoPath: "channels/ch-1/episodes/ep-1/quiz-video.mp4",
      manifestPath: "channels/ch-1/episodes/ep-1/render-manifest.json",
    });

    let current = TaskSchema.parse({
      task_id: "task-1",
      task_type: "GENERATE_VIDEO",
      channel_id: "ch-1",
      episode_id: "ep-1",
      status: "QUEUED",
      created_at: new Date().toISOString(),
      lock_key: "ep-1",
    });

    const episode = EpisodeSchema.parse({
      episode_id: "ep-1",
      channel_id: "ch-1",
      slug: "ep-1",
      topic: { title: "T", premise: "P", hook: "H" },
      stage: "NARRATION_READY",
      script_path: "script.md",
      scene_plan_path: "scenes.json",
      dialogue_script_path: "dialogue.md",
      video_prompts_path: "prompts.md",
      narration_asset_path: "audio.wav",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const finish = vi.fn().mockResolvedValue(undefined);
    const runtime = {
      activeVideoControllers: new Map<string, AbortController>(),
      videoConfig: { aspect_ratio: "16:9", fps: 30 },
      repository: {
        getEpisode: vi.fn().mockResolvedValue(episode),
        getChannel: vi.fn().mockResolvedValue({ channel_id: "ch-1", slug: "ch-1" }),
        readScenes: vi.fn().mockResolvedValue([{ scene_id: "s1" }]),
        readQuiz: vi.fn().mockResolvedValue(null),
        removeQuestionHistoryEntries: vi.fn().mockResolvedValue(undefined),
      },
      hasValidNarrationAsset: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockImplementation((_id, patch) => {
        current = TaskSchema.parse({ ...current, ...patch });
        return Promise.resolve();
      }),
      get: () => current,
      finish,
      logger: { ok: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    } as unknown as TaskManagerRuntime;

    await runVideoTask.call(runtime, current);

    expect(finish).toHaveBeenCalledWith("task-1", "COMPLETED", null, expect.any(Array));
    await expect(stat(path.join(renderRoot, "narration.wav"))).rejects.toThrow();
    await expect(stat(path.join(renderRoot, "quiz-video.mp4"))).rejects.toThrow();
    expect(await stat(path.join(renderRoot, "render-checkpoint.json"))).toBeDefined();
    expect(await stat(path.join(renderRoot, "render-task-1.log"))).toBeDefined();
  });

  it("reconcileStartupState runs safely and prunes stale directories", async () => {
    const root = await createTempDir("startup-state-");
    const hyperRoot = path.join(root, "runtime", "hyperframes");
    const staleDir = path.join(hyperRoot, "ep-stale-startup");
    await mkdir(staleDir, { recursive: true });
    await writeFile(path.join(staleDir, "soundtrack.wav"), "data");

    const pastTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await utimes(staleDir, pastTime, pastTime);
    await utimes(path.join(staleDir, "soundtrack.wav"), pastTime, pastTime);

    const runtime = {
      repository: {
        resolvePath: (...parts: string[]) => path.join(root, ...parts),
      },
      list: () => [],
      logger: { info: vi.fn(), warn: vi.fn() },
    } as unknown as TaskManagerRuntime;

    const result = await reconcileStartupState.call(runtime);
    expect(result.prunedDirs).toContain("ep-stale-startup");
    await expect(stat(staleDir)).rejects.toThrow();
  });

  it("provides system storage-health and prune-storage HTTP endpoints", async () => {
    const root = await createTempDir("sys-routes-");
    await mkdir(path.join(root, "templates"), { recursive: true });
    await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n");
    await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n");

    const app = await buildApp(root, { llmClient: null });
    try {
      const healthRes = await app.server.inject({ method: "GET", url: "/api/system/storage-health" });
      expect(healthRes.statusCode).toBe(200);
      const healthBody = healthRes.json();
      expect(healthBody.ok).toBe(true);
      expect(typeof healthBody.runtime_bytes).toBe("number");
      expect(typeof healthBody.hyperframes_bytes).toBe("number");

      const staleEpDir = path.join(app.repository.roots.runtime, "hyperframes", "stale-api-ep");
      await mkdir(staleEpDir, { recursive: true });
      await writeFile(path.join(staleEpDir, "dummy.mp4"), "sample");

      const pruneRes = await app.server.inject({
        method: "POST",
        url: "/api/system/prune-storage",
        payload: { max_age_ms: 0 },
      });
      expect(pruneRes.statusCode).toBe(200);
      const pruneBody = pruneRes.json();
      expect(pruneBody.ok).toBe(true);
      expect(pruneBody.pruned_directories).toContain("stale-api-ep");
      await expect(stat(staleEpDir)).rejects.toThrow();
    } finally {
      await app.close();
    }
  });
});
