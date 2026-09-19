import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { MascotAnimationBatch, MascotAnimationJob, MascotProfile } from "@studio/shared";

const apps: Array<{ server: { close: () => Promise<unknown> } }> = [];
const roots: string[] = [];

afterEach(async () => {
  for (const app of apps.splice(0)) {
    await app.server.close().catch(() => {});
  }
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {})),
  );
});

async function setupTestApp() {
  const root = await mkdtemp(path.join(os.tmpdir(), "mascot-anim-route-test-"));
  roots.push(root);
  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style\n", "utf8");

  const app = await buildApp(root);
  apps.push(app);

  const createRes = await app.server.inject({
    method: "POST",
    url: "/api/mascots",
    payload: {
      name: "Professor Bubo",
      description: "A scholar owl mascot",
      visual_style: "pixar_3d",
      master_prompt: "Scholarly owl in library with glasses",
    },
  });
  expect(createRes.statusCode).toBe(201);
  const mascot = createRes.json<{ mascot: MascotProfile }>().mascot;
  const styleId = mascot.styles?.[0]?.id || "core";

  return { app, root, mascot, styleId };
}

describe("Mascot Animation Server API Routes (Stage 10)", { timeout: 60_000 }, () => {
  it("GET /api/mascots/:mascotId/styles/:styleId/animations returns slots and publish eligibility", async () => {
    const { app, mascot, styleId } = await setupTestApp();

    const res = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/styles/${styleId}/animations`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{
      ok: boolean;
      mascotId: string;
      styleId: string;
      readiness: string;
      publishEligibility: { eligible: boolean; readyCount: number; totalRequired: number };
      thinking: unknown[];
      celebrate: unknown[];
    }>();

    expect(body.ok).toBe(true);
    expect(body.mascotId).toBe(mascot.id);
    expect(body.styleId).toBe(styleId);
    expect(body.thinking).toHaveLength(10);
    expect(body.celebrate).toHaveLength(10);
    expect(body.publishEligibility.eligible).toBe(false);
    expect(body.publishEligibility.totalRequired).toBe(20);
    expect(body.publishEligibility.readyCount).toBe(0);
  });

  it("POST /api/mascots/:mascotId/styles/:styleId/animations/plan creates 20 jobs and batch", async () => {
    const { app, mascot, styleId } = await setupTestApp();

    const res = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/${styleId}/animations/plan`,
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{
      ok: boolean;
      batch: MascotAnimationBatch;
      jobs: MascotAnimationJob[];
    }>();

    expect(body.ok).toBe(true);
    expect(body.batch).toBeDefined();
    expect(body.batch.total_jobs).toBe(20);
    expect(body.jobs).toHaveLength(20);

    const thinkingJobs = body.jobs.filter((j) => j.state === "thinking");
    const celebrateJobs = body.jobs.filter((j) => j.state === "celebrate");
    expect(thinkingJobs).toHaveLength(10);
    expect(celebrateJobs).toHaveLength(10);
  });

  it("executes batch, polls batch status and job status", async () => {
    const { app, mascot, styleId } = await setupTestApp();

    // 1. Plan batch
    const planRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/${styleId}/animations/plan`,
      payload: {},
    });
    const { batch } = planRes.json<{ batch: MascotAnimationBatch }>();

    // 2. Start batch with sync: true and fixtureMode: true
    const startRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/animation-batches/${batch.id}/start`,
      payload: { fixtureMode: true, sync: true },
    });
    expect(startRes.statusCode).toBe(200);
    const startBody = startRes.json<{ ok: boolean; batch: MascotAnimationBatch; jobs: MascotAnimationJob[] }>();
    expect(startBody.ok).toBe(true);
    expect(startBody.batch.status).toBe("completed");
    expect(startBody.batch.completed_jobs).toBe(20);

    // 3. Poll batch status via GET /api/mascots/:mascotId/animation-batches/:batchId
    const pollBatchRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/animation-batches/${batch.id}`,
    });
    expect(pollBatchRes.statusCode).toBe(200);
    const pollBody = pollBatchRes.json<{ ok: boolean; batch: MascotAnimationBatch; jobs: MascotAnimationJob[] }>();
    expect(pollBody.batch.status).toBe("completed");
    expect(pollBody.jobs).toHaveLength(20);

    // 4. Poll single job status via GET /api/mascots/:mascotId/animation-jobs/:jobId
    const firstJobId = pollBody.jobs[0].id;
    const pollJobRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/animation-jobs/${firstJobId}`,
    });
    expect(pollJobRes.statusCode).toBe(200);
    const jobBody = pollJobRes.json<{ ok: boolean; job: MascotAnimationJob }>();
    expect(jobBody.job.id).toBe(firstJobId);
    expect(jobBody.job.status).toBe("ready");
  });

  it("handles job cancellation and retry endpoints cleanly", async () => {
    const { app, mascot, styleId } = await setupTestApp();

    // Plan batch
    const planRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/${styleId}/animations/plan`,
      payload: {},
    });
    const { jobs } = planRes.json<{ jobs: MascotAnimationJob[] }>();
    const testJob = jobs[0];

    // Cancel job
    const cancelRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/animation-jobs/${testJob.id}/cancel`,
    });
    expect(cancelRes.statusCode).toBe(200);
    const cancelBody = cancelRes.json<{ ok: boolean; job: MascotAnimationJob }>();
    expect(cancelBody.job.status).toBe("cancelled");

    // Retry job
    const retryRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/animation-jobs/${testJob.id}/retry`,
      payload: { fixtureMode: true },
    });
    expect(retryRes.statusCode).toBe(200);
    const retryBody = retryRes.json<{ ok: boolean; job: MascotAnimationJob }>();
    expect(retryBody.job.status).toBe("ready");
    expect(retryBody.job.attempts.length).toBeGreaterThanOrEqual(1);
  });

  it("records curation decision via POST /curation", async () => {
    const { app, mascot, styleId } = await setupTestApp();

    const planRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/${styleId}/animations/plan`,
      payload: {},
    });
    const { jobs } = planRes.json<{ jobs: MascotAnimationJob[] }>();
    const testJob = jobs[0];

    // Curation approval
    const approveRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/animation-jobs/${testJob.id}/curation`,
      payload: {
        approved: true,
        notes: "Excellent head tilt expression",
        rating: 5,
        selection_tag: "hero",
      },
    });
    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.json<{ ok: boolean; job: MascotAnimationJob }>().job.status).toBe("ready");

    // Curation rejection
    const rejectRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/animation-jobs/${testJob.id}/curation`,
      payload: {
        approved: false,
        notes: "Excessive artifacting on chin",
      },
    });
    expect(rejectRes.statusCode).toBe(200);
    const rejectedJob = rejectRes.json<{ ok: boolean; job: MascotAnimationJob }>().job;
    expect(rejectedJob.status).toBe("qa_failed");
    expect(rejectedJob.error_message).toContain("Excessive artifacting");
  });

  it("POST /publish strictly rejects incomplete style with HTTP 409 and accepts complete style with HTTP 200", async () => {
    const { app, mascot, styleId } = await setupTestApp();

    // 1. Initial publish attempt without running jobs -> must be rejected with 409
    const earlyPublishRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/${styleId}/animations/publish`,
    });

    expect(earlyPublishRes.statusCode).toBe(409);
    const earlyBody = earlyPublishRes.json<{
      ok: boolean;
      error: { code: string; message: string; details: { readyCount: number; totalRequired: number } };
    }>();
    expect(earlyBody.ok).toBe(false);
    expect(earlyBody.error.code).toBe("PUBLISH_GATE_REJECTED");
    expect(earlyBody.error.details.readyCount).toBe(0);
    expect(earlyBody.error.details.totalRequired).toBe(20);

    // 2. Plan and run batch to make all 20 slots ready
    const planRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/${styleId}/animations/plan`,
      payload: {},
    });
    const { batch } = planRes.json<{ batch: MascotAnimationBatch }>();

    await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/animation-batches/${batch.id}/start`,
      payload: { fixtureMode: true, sync: true },
    });

    // 3. Verify slots are now eligible
    const animOverviewRes = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/styles/${styleId}/animations`,
    });
    expect(animOverviewRes.json<{ publishEligibility: { eligible: boolean; readyCount: number } }>().publishEligibility.eligible).toBe(
      true,
    );

    // 4. Publish should now succeed with HTTP 200
    const publishRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/${styleId}/animations/publish`,
    });

    expect(publishRes.statusCode).toBe(200);
    const publishBody = publishRes.json<{
      ok: boolean;
      mascotId: string;
      styleId: string;
      publishedSlotsCount: number;
      publishedAt: string;
    }>();

    expect(publishBody.ok).toBe(true);
    expect(publishBody.publishedSlotsCount).toBe(20);
    expect(publishBody.publishedAt).toBeDefined();
  });

  it("GET /api/mascots/:mascotId/styles/:styleId/animations/:state/:slotIndex/artifacts/:filename streams animation artifact", async () => {
    const { app, mascot, styleId } = await setupTestApp();

    const planRes = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/styles/${styleId}/animations/plan`,
      payload: { force: true },
    });
    const { batch } = planRes.json<{ batch: MascotAnimationBatch }>();

    await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/animation-batches/${batch.id}/start`,
      payload: { fixtureMode: true, sync: true },
    });

    const res = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/styles/${styleId}/animations/thinking/1/artifacts/atlas.png`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.rawPayload.length).toBeGreaterThan(0);

    // Also verify the /mascot/assets/animations/... alias
    const aliasRes = await app.server.inject({
      method: "GET",
      url: `/mascot/assets/animations/${mascot.id}/${styleId}/thinking/1/atlas.png`,
    });
    expect(aliasRes.statusCode).toBe(200);
    expect(aliasRes.headers["content-type"]).toBe("image/png");
  });
});
