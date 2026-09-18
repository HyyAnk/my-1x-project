import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { MascotProfile, MascotStyleBatchJob, StyleBatchStatusResponse } from "@studio/shared";
import { buildApp } from "../src/app.js";
import { createMascotStyleJobManager, createMascotStyleJobRepository } from "../src/quiz/mascot/styleJobs/index.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {})),
  );
});

async function setupTestApp(customStyleGenerator?: Parameters<typeof createMascotStyleJobManager>[0]["styleGenerator"]) {
  const root = await mkdtemp(path.join(os.tmpdir(), "mascot-style-routes-test-"));
  roots.push(root);

  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

  let app = await buildApp(root);

  if (customStyleGenerator) {
    const jobRepo = createMascotStyleJobRepository(app.repository);
    const customManager = createMascotStyleJobManager({
      repository: app.repository,
      jobRepository: jobRepo,
      styleGenerator: customStyleGenerator,
    });
    await app.close();
    roots.pop();
    roots.push(root);
    app = await buildApp(root, { mascotStyleJobManager: customManager });
  }

  // Create test mascot
  const mascotRes = await app.server.inject({
    method: "POST",
    url: "/api/mascots",
    payload: {
      name: "Cyber Lynx",
      description: "A fast cybernetic lynx",
      visual_style: "pixar_3d",
      master_prompt: "High-tech lynx with holographic goggles",
    },
  });
  expect(mascotRes.statusCode).toBe(201);
  const mascot = mascotRes.json<{ mascot: MascotProfile }>().mascot;

  // Create test styles
  const s1Res = await app.server.inject({
    method: "POST",
    url: `/api/mascots/${mascot.id}/styles`,
    payload: { name: "Neon Runner", keyword: "glowing neon sprint suit" },
  });
  const style1 = s1Res.json<{ style: { id: string; name: string } }>().style;

  const s2Res = await app.server.inject({
    method: "POST",
    url: `/api/mascots/${mascot.id}/styles`,
    payload: { name: "Stealth Shadow", keyword: "matte black nanotech armor" },
  });
  const style2 = s2Res.json<{ style: { id: string; name: string } }>().style;

  return { app, root, mascot, style1, style2 };
}

describe("Mascot Style Job Routes Integration", () => {
  it("queues a style concept generation job and returns 202 Accepted", async () => {
    const { app, mascot, style1 } = await setupTestApp();

    const response = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/jobs/queue`,
      payload: {
        mode: "single",
        styles: [
          {
            style_id: style1.id,
            style_name: style1.name,
            prompt: "cyberpunk sprint pose",
          },
        ],
      },
    });

    expect(response.statusCode).toBe(202);
    const batch = response.json<MascotStyleBatchJob>();
    expect(batch.id).toMatch(/^style_batch_/);
    expect(batch.mascot_id).toBe(mascot.id);
    expect(batch.total_styles).toBe(1);
    expect(batch.items).toHaveLength(1);
    expect(batch.items[0].style_id).toBe(style1.id);

    await app.close();
  });

  it("retrieves current batch status via GET /styles/jobs/status", async () => {
    const { app, mascot, style1, style2 } = await setupTestApp();

    await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/jobs/queue`,
      payload: {
        mode: "batch",
        styles: [
          { style_id: style1.id, style_name: style1.name },
          { style_id: style2.id, style_name: style2.name },
        ],
      },
    });

    const statusRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/styles/jobs/status`,
    });

    expect(statusRes.statusCode).toBe(200);
    const statusData = statusRes.json<StyleBatchStatusResponse>();
    expect(statusData.active_batch).not.toBeNull();
    expect(statusData.active_batch?.total_styles).toBe(2);

    await app.close();
  });

  it("appends new styles to an active batch queue dynamically", async () => {
    // Custom generator that delays so the first job stays in progress
    let releaseGenerator!: () => void;
    const blocker = new Promise<void>((resolve) => {
      releaseGenerator = resolve;
    });

    const customGen = async (_repo: unknown, _mascot: MascotProfile, styleId: string) => {
      await blocker;
      return {
        anchor_image_url: `https://example.com/${styleId}.png`,
        raw_image_url: `https://example.com/${styleId}_raw.png`,
        prompt_used: "prompt",
        placeholder: false,
      };
    };

    const { app, mascot, style1, style2 } = await setupTestApp(customGen);

    // Queue style 1
    const res1 = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/jobs/queue`,
      payload: {
        styles: [{ style_id: style1.id, style_name: style1.name }],
      },
    });
    expect(res1.statusCode).toBe(202);
    const b1 = res1.json<MascotStyleBatchJob>();
    expect(b1.total_styles).toBe(1);

    // Queue style 2 while style 1 is active
    const res2 = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/jobs/queue`,
      payload: {
        styles: [{ style_id: style2.id, style_name: style2.name }],
      },
    });
    expect(res2.statusCode).toBe(202);
    const b2 = res2.json<MascotStyleBatchJob>();
    expect(b2.id).toBe(b1.id);
    expect(b2.total_styles).toBe(2);
    expect(b2.items).toHaveLength(2);

    releaseGenerator();
    await app.close();
  });

  it("cancels an active batch and marks items as cancelled", async () => {
    const blocker = new Promise<void>(() => {}); // Never resolves
    const customGen = async () => {
      await blocker;
      return { anchor_image_url: "", raw_image_url: "", prompt_used: "", placeholder: false };
    };

    const { app, mascot, style1 } = await setupTestApp(customGen);

    await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/jobs/queue`,
      payload: {
        styles: [{ style_id: style1.id, style_name: style1.name }],
      },
    });

    const cancelRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/jobs/cancel`,
      payload: { reason: "User cancelled" },
    });

    expect(cancelRes.statusCode).toBe(200);
    const cancelled = cancelRes.json<{ ok: boolean; batch: MascotStyleBatchJob }>();
    expect(cancelled.ok).toBe(true);
    expect(cancelled.batch.status).toBe("cancelled");

    await app.close();
  });
});
