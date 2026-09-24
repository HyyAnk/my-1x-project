import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type {
  MascotGreenScreenAuditResponse,
  MascotGreenScreenAuditStatusResponse,
  MascotProfile,
  WorkspaceGreenScreenAuditResponse,
} from "@studio/shared";
import { buildApp } from "../src/app.js";
import { encodeRgbaToPng } from "../src/utils/imageMatting.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((r) =>
      rm(r, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {}),
    ),
  );
});

function createSolidTestPng(
  width: number,
  height: number,
  color: [number, number, number, number],
): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = color[0];
    data[i * 4 + 1] = color[1];
    data[i * 4 + 2] = color[2];
    data[i * 4 + 3] = color[3];
  }
  return encodeRgbaToPng({ width, height, data });
}

async function setupTestApp() {
  const root = await mkdtemp(path.join(os.tmpdir(), "mascot-audit-routes-test-"));
  roots.push(root);

  await mkdir(path.join(root, "templates"), { recursive: true });
  await writeFile(path.join(root, "templates", "example_channel_dna.md"), "# Channel DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "quiz_channel_dna.md"), "# Quiz DNA\n", "utf8");
  await writeFile(path.join(root, "templates", "example_style_guide.md"), "# Style Guide\n", "utf8");

  const app = await buildApp(root);

  // 1. Create a test mascot
  const mascotRes = await app.server.inject({
    method: "POST",
    url: "/api/mascots",
    payload: {
      name: "Chroma Fox",
      description: "A clever fox tested for chroma compliance",
      visual_style: "pixar_3d",
      master_prompt: "Chroma fox with vibrant orange fur",
    },
  });
  expect(mascotRes.statusCode).toBe(201);
  const mascot = mascotRes.json<{ mascot: MascotProfile }>().mascot;

  // 2. Create a test custom style
  const styleRes = await app.server.inject({
    method: "POST",
    url: `/api/mascots/${mascot.id}/styles`,
    payload: { name: "Neon Cyber", keyword: "glowing neon armor" },
  });
  expect(styleRes.statusCode).toBe(201);
  const style = styleRes.json<{ style: { id: string; name: string } }>().style;

  // 3. Populate a slot in thinking state (with non-existent raw file initially)
  const updatedMascot = await app.repository.updateMascotSlot(mascot.id, {
    style_id: style.id,
    state: "thinking",
    slot_index: 1,
    image_url: `/api/mascots/${mascot.id}/assets/think_1.png`,
    raw_image_url: `/api/mascots/${mascot.id}/assets/think_1_raw.png`,
  });

  return { app, root, mascot: updatedMascot, style };
}

describe("Mascot Green Screen Audit Routes Integration", () => {
  it("POST /api/mascots/:id/green-screen/audit performs audit in scan mode by default", async () => {
    const { app, mascot } = await setupTestApp();

    const response = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/green-screen/audit`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    const data = response.json<MascotGreenScreenAuditResponse>();
    expect(data.mascotId).toBe(mascot.id);
    expect(data.mascotName).toBe("Chroma Fox");
    expect(data.mode).toBe("scan");
    expect(data.summary.totalChecked).toBeGreaterThanOrEqual(1);
    expect(data.summary.violationCount).toBeGreaterThanOrEqual(1); // slot has missing raw file initially
    expect(data.violations.length).toBeGreaterThanOrEqual(1);
    expect(data.violations[0].status).toBe("missing");
    expect(data.violations[0].violationReason).toBe("missing_raw");

    await app.close();
  });

  it("POST /api/mascots/:id/green-screen/audit audits compliant mascot asset correctly", async () => {
    const { app, mascot, style } = await setupTestApp();

    // Save a valid green-screen asset for the pose slot
    const greenPng = createSolidTestPng(128, 72, [0, 255, 0, 255]);
    const assetUrl = await app.repository.saveMascotAsset(mascot.id, "think_1_raw.png", greenPng);

    // Update style with valid raw slot image
    const currentMascot = await app.repository.getMascot(mascot.id);
    expect(currentMascot).not.toBeNull();
    const targetStyle = currentMascot!.styles?.find((s) => s.id === style.id);
    if (targetStyle) {
      const slot = targetStyle.states.thinking.find((s) => s.slot_index === 1);
      if (slot) {
        slot.raw_image_url = assetUrl;
        slot.image_url = assetUrl;
      }
    }
    await app.repository.saveMascot(currentMascot!);

    const response = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/green-screen/audit`,
      payload: { mode: "scan", style_id: style.id },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json<MascotGreenScreenAuditResponse>();
    expect(data.mascotId).toBe(mascot.id);
    expect(data.summary.compliantCount).toBe(1);
    expect(data.summary.violationCount).toBe(0);
    expect(data.violations).toHaveLength(0);

    await app.close();
  });

  it("POST /api/mascots/:id/green-screen/audit triggers auto-repair in repair mode", async () => {
    const { app, mascot, style } = await setupTestApp();

    // Trigger repair on the non-compliant mascot style slots
    const response = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/green-screen/audit`,
      payload: { mode: "repair", style_id: style.id },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json<MascotGreenScreenAuditResponse>();
    expect(data.mode).toBe("repair");
    expect(data.summary.violationCount).toBe(1);
    expect(data.summary.repairedCount).toBe(1);
    expect(data.summary.queuedJobCount).toBe(1);
    expect(data.queuedBatchIds?.slotBatchIds).toBeDefined();

    await app.close();
  });

  it("POST /api/mascots/green-screen/audit-all scans entire workspace", async () => {
    const { app, mascot } = await setupTestApp();

    const response = await app.server.inject({
      method: "POST",
      url: "/api/mascots/green-screen/audit-all",
      payload: { mode: "scan" },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json<WorkspaceGreenScreenAuditResponse>();
    expect(data.mode).toBe("scan");
    expect(data.totalMascots).toBeGreaterThanOrEqual(1);
    expect(data.overallSummary.totalChecked).toBeGreaterThanOrEqual(1);
    const foundMascot = data.mascots.find((m) => m.mascotId === mascot.id);
    expect(foundMascot).toBeDefined();
    expect(foundMascot?.mascotName).toBe("Chroma Fox");

    await app.close();
  });

  it("GET /api/mascots/:id/green-screen/audit-status returns active repair and batch metrics", async () => {
    const { app, mascot } = await setupTestApp();

    const response = await app.server.inject({
      method: "GET",
      url: `/api/mascots/${mascot.id}/green-screen/audit-status`,
    });

    expect(response.statusCode).toBe(200);
    const data = response.json<MascotGreenScreenAuditStatusResponse>();
    expect(data.mascotId).toBe(mascot.id);
    expect(data.mascotName).toBe("Chroma Fox");
    expect(typeof data.isRepairing).toBe("boolean");
    expect(typeof data.activeBatchCount).toBe("number");
    expect(data.styleBatch).toBeDefined();
    expect(Array.isArray(data.slotBatches)).toBe(true);

    await app.close();
  });

  it("returns 404 when mascot does not exist", async () => {
    const { app } = await setupTestApp();

    const auditRes = await app.server.inject({
      method: "POST",
      url: "/api/mascots/nonexistent-mascot-id/green-screen/audit",
      payload: { mode: "scan" },
    });
    expect(auditRes.statusCode).toBe(404);

    const statusRes = await app.server.inject({
      method: "GET",
      url: "/api/mascots/nonexistent-mascot-id/green-screen/audit-status",
    });
    expect(statusRes.statusCode).toBe(404);

    await app.close();
  });

  it("returns 400 when request body contains invalid mode", async () => {
    const { app, mascot } = await setupTestApp();

    const response = await app.server.inject({
      method: "POST",
      url: `/api/mascots/${mascot.id}/green-screen/audit`,
      payload: { mode: "invalid_mode" },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json<{ error: string }>();
    expect(body.error).toBeDefined();

    await app.close();
  });
});
