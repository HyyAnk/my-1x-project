import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MascotProfile } from "@studio/shared";
import { RepositoryService } from "../src/repository/service.js";
import { encodeRgbaToPng } from "../src/utils/imageMatting.js";
import { MascotGreenScreenAuditService } from "../src/quiz/mascot/audit/index.js";
import type { MascotSlotJobManager } from "../src/quiz/mascot/slotJobs/mascotSlotJobManager.js";
import type { MascotStyleJobManager } from "../src/quiz/mascot/styleJobs/mascotStyleJobManager.js";

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

function createTransparentTestPng(width: number, height: number): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (x >= 10 && x < width - 10 && y >= 10 && y < height - 10) {
        data[idx] = 255;
        data[idx + 1] = 120;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
      } else {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }
  }
  return encodeRgbaToPng({ width, height, data });
}

describe("MascotGreenScreenAuditService", () => {
  let tempRoot: string;
  let repository: RepositoryService;
  const tempRoots: string[] = [];

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "mascot-audit-service-test-"));
    tempRoots.push(tempRoot);
    await mkdir(path.join(tempRoot, "mascots"), { recursive: true });
    repository = new RepositoryService(tempRoot);
  });

  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((r) =>
        rm(r, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {}),
      ),
    );
  });

  function createMockJobManagers() {
    const styleJobManager = {
      enqueueBatch: vi.fn(),
    } as unknown as MascotStyleJobManager;

    const slotJobManager = {
      enqueueBatch: vi.fn().mockImplementation(async (mascotId, input) => ({
        id: `slot_batch_mock_${input.style_id}`,
        mascot_id: mascotId,
        style_id: input.style_id,
        status: "queued",
        total_slots: input.slots.length,
        completed_count: 0,
        failed_count: 0,
        active_slots: [],
        items: input.slots.map((s: { state: string; slot_index: number }, idx: number) => ({
          id: `job_slot_${idx}`,
          mascot_id: mascotId,
          style_id: input.style_id,
          state: s.state,
          slot_index: s.slot_index,
          status: "queued",
          created_at: new Date().toISOString(),
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    } as unknown as MascotSlotJobManager;

    return { styleJobManager, slotJobManager };
  }

  it("scans a compliant mascot with green-screen raw assets in expressive pose slots and reports 0 violations", async () => {
    const validWidescreenGreen = createSolidTestPng(128, 72, [0, 255, 0, 255]);

    const mascot = await repository.saveMascot({
      id: "mascot_compliant_1",
      name: "Green Frog",
    });

    const slotUrl = await repository.saveMascotAsset(mascot.id, "think_1.png", validWidescreenGreen);
    const slotRawUrl = await repository.saveMascotAsset(mascot.id, "think_1_raw.png", validWidescreenGreen);

    // Attach valid asset to thinking slot
    const updatedStyles = (mascot.styles || []).map((style) => {
      if (style.id === "core") {
        return {
          ...style,
          states: {
            ...style.states,
            thinking: [
              {
                id: "slot_1",
                slot_index: 1,
                image_url: slotUrl,
                raw_image_url: slotRawUrl,
              },
            ],
          },
        };
      }
      return style;
    });

    await repository.saveMascot({ ...mascot, styles: updatedStyles });

    const auditService = new MascotGreenScreenAuditService(repository);
    const result = await auditService.auditMascot(mascot.id, { mode: "scan" });

    expect(result.mascotId).toBe(mascot.id);
    expect(result.mode).toBe("scan");
    expect(result.summary.totalChecked).toBe(1);
    expect(result.summary.compliantCount).toBe(1);
    expect(result.summary.violationCount).toBe(0);
    expect(result.summary.missingRawCount).toBe(0);
    expect(result.summary.transparencyCount).toBe(0);
    expect(result.summary.insufficientChromaCount).toBe(0);
    expect(result.violations).toHaveLength(0);
  });

  it("scans a mascot with missing raw asset in pose slots and reports missing_raw", async () => {
    const validSquareGreen = createSolidTestPng(64, 64, [0, 255, 0, 255]);

    const mascot = await repository.saveMascot({
      id: "mascot_missing_raw",
      name: "Missing Owl",
    });

    const slot1Url = await repository.saveMascotAsset(mascot.id, "think_1.png", validSquareGreen);
    const slot2Url = await repository.saveMascotAsset(mascot.id, "celebrate_1.png", validSquareGreen);

    // Slot 1 has null raw_image_url; Slot 2 has non-existent file path
    const updatedStyles = (mascot.styles || []).map((style) => {
      if (style.id === "core") {
        return {
          ...style,
          states: {
            ...style.states,
            thinking: [
              {
                id: "slot_1",
                slot_index: 1,
                image_url: slot1Url,
                raw_image_url: "",
              },
            ],
            celebrate: [
              {
                id: "slot_2",
                slot_index: 1,
                image_url: slot2Url,
                raw_image_url: `/api/mascots/${mascot.id}/assets/non_existent_file.png`,
              },
            ],
          },
        };
      }
      return style;
    });

    await repository.saveMascot({ ...mascot, styles: updatedStyles });

    const auditService = new MascotGreenScreenAuditService(repository);
    const result = await auditService.auditMascot(mascot.id, { mode: "scan" });

    expect(result.summary.totalChecked).toBe(2);
    expect(result.summary.compliantCount).toBe(0);
    expect(result.summary.violationCount).toBe(2);
    expect(result.summary.missingRawCount).toBe(2);
    expect(result.violations).toHaveLength(2);

    expect(result.violations[0].targetType).toBe("slot");
    expect(result.violations[0].status).toBe("missing");
    expect(result.violations[0].violationReason).toBe("missing_raw");

    expect(result.violations[1].targetType).toBe("slot");
    expect(result.violations[1].status).toBe("missing");
    expect(result.violations[1].violationReason).toBe("missing_raw");
  });

  it("scans a mascot with transparent raw asset in a pose slot and reports has_transparency", async () => {
    const transparentPng = createTransparentTestPng(64, 64);

    const mascot = await repository.saveMascot({
      id: "mascot_transparent",
      name: "Transparent Fox",
    });

    const rawSlotUrl = await repository.saveMascotAsset(mascot.id, "slot_raw.png", transparentPng);

    const updatedStyles = (mascot.styles || []).map((style) => {
      if (style.id === "core") {
        return {
          ...style,
          states: {
            ...style.states,
            thinking: [
              {
                id: "slot_1",
                slot_index: 1,
                image_url: rawSlotUrl,
                raw_image_url: rawSlotUrl,
              },
            ],
          },
        };
      }
      return style;
    });

    await repository.saveMascot({ ...mascot, styles: updatedStyles });

    const auditService = new MascotGreenScreenAuditService(repository);
    const result = await auditService.auditMascot(mascot.id, { mode: "scan" });

    expect(result.summary.totalChecked).toBe(1);
    expect(result.summary.violationCount).toBe(1);
    expect(result.summary.transparencyCount).toBe(1);
    expect(result.violations[0].targetType).toBe("slot");
    expect(result.violations[0].status).toBe("violation");
    expect(result.violations[0].violationReason).toBe("has_transparency");
  });

  it("scans a mascot with non-green raw asset in pose slots and reports insufficient_green_chroma", async () => {
    const whiteOpaquePng = createSolidTestPng(64, 64, [255, 255, 255, 255]);
    const greenOpaquePng = createSolidTestPng(64, 64, [0, 255, 0, 255]);

    const mascot = await repository.saveMascot({
      id: "mascot_white_bg",
      name: "White BG Bear",
    });

    const rawSlotWhite = await repository.saveMascotAsset(mascot.id, "slot_white_raw.png", whiteOpaquePng);
    const rawSlotGreen = await repository.saveMascotAsset(mascot.id, "slot_green_raw.png", greenOpaquePng);

    const updatedStyles = (mascot.styles || []).map((style) => {
      if (style.id === "core") {
        return {
          ...style,
          states: {
            ...style.states,
            thinking: [
              {
                id: "slot_1",
                slot_index: 1,
                image_url: rawSlotGreen,
                raw_image_url: rawSlotGreen,
              },
              {
                id: "slot_2",
                slot_index: 2,
                image_url: rawSlotWhite,
                raw_image_url: rawSlotWhite,
              },
            ],
          },
        };
      }
      return style;
    });

    await repository.saveMascot({ ...mascot, styles: updatedStyles });

    const auditService = new MascotGreenScreenAuditService(repository);
    const result = await auditService.auditMascot(mascot.id, { mode: "scan" });

    expect(result.summary.totalChecked).toBe(2);
    expect(result.summary.compliantCount).toBe(1);
    expect(result.summary.violationCount).toBe(1);
    expect(result.summary.insufficientChromaCount).toBe(1);

    const slotViolation = result.violations.find((v) => v.targetType === "slot");
    expect(slotViolation).toBeDefined();
    expect(slotViolation?.status).toBe("violation");
    expect(slotViolation?.violationReason).toBe("insufficient_green_chroma");
    expect(slotViolation?.greenRatio).toBe(0);
  });

  it("detects corrupted image file in a pose slot and reports corrupted_file violation", async () => {
    const corruptedBytes = Buffer.from("NOT_A_VALID_PNG_FILE_DATA");

    const mascot = await repository.saveMascot({
      id: "mascot_corrupt",
      name: "Corrupt File Badger",
    });

    const rawSlotUrl = await repository.saveMascotAsset(mascot.id, "slot_corrupt_raw.png", corruptedBytes);

    const updatedStyles = (mascot.styles || []).map((style) => {
      if (style.id === "core") {
        return {
          ...style,
          states: {
            ...style.states,
            thinking: [
              {
                id: "slot_1",
                slot_index: 1,
                image_url: rawSlotUrl,
                raw_image_url: rawSlotUrl,
              },
            ],
          },
        };
      }
      return style;
    });

    await repository.saveMascot({ ...mascot, styles: updatedStyles });

    const auditService = new MascotGreenScreenAuditService(repository);
    const result = await auditService.auditMascot(mascot.id, { mode: "scan" });

    expect(result.summary.totalChecked).toBe(1);
    expect(result.summary.violationCount).toBe(1);
    expect(result.violations[0].targetType).toBe("slot");
    expect(result.violations[0].violationReason).toBe("corrupted_file");
  });

  it("enqueues slot batch jobs in repair mode for all pose slot violations", async () => {
    const transparentPng = createTransparentTestPng(64, 64);
    const whitePng = createSolidTestPng(64, 64, [255, 255, 255, 255]);

    const mascot = await repository.saveMascot({
      id: "mascot_repair_test",
      name: "Repair Robot",
    });

    const rawSlot1Url = await repository.saveMascotAsset(mascot.id, "slot1_raw.png", whitePng);
    const rawSlot2Url = await repository.saveMascotAsset(mascot.id, "slot2_raw.png", transparentPng);

    const updatedStyles = (mascot.styles || []).map((style) => {
      if (style.id === "core") {
        return {
          ...style,
          states: {
            ...style.states,
            thinking: [
              {
                id: "slot_1",
                slot_index: 1,
                image_url: rawSlot1Url,
                raw_image_url: rawSlot1Url,
                prompt_modifier: "scratching metallic head",
              },
            ],
            celebrate: [
              {
                id: "slot_2",
                slot_index: 2,
                image_url: rawSlot2Url,
                raw_image_url: rawSlot2Url,
              },
            ],
          },
        };
      }
      return style;
    });

    await repository.saveMascot({ ...mascot, styles: updatedStyles });

    const { styleJobManager, slotJobManager } = createMockJobManagers();
    const auditService = new MascotGreenScreenAuditService(repository, styleJobManager, slotJobManager);

    const result = await auditService.auditMascot(mascot.id, { mode: "repair" });

    expect(result.mode).toBe("repair");
    expect(result.summary.totalChecked).toBe(2);
    expect(result.summary.violationCount).toBe(2);
    expect(result.summary.repairedCount).toBe(2);
    expect(result.summary.queuedJobCount).toBe(2);

    // StyleJobManager must not be called when only slots are repaired
    expect(styleJobManager.enqueueBatch).not.toHaveBeenCalled();

    expect(slotJobManager.enqueueBatch).toHaveBeenCalledTimes(1);
    expect(slotJobManager.enqueueBatch).toHaveBeenCalledWith(
      mascot.id,
      expect.objectContaining({
        style_id: "core",
        mode: "regenerate_selected",
        slots: [
          { state: "thinking", slot_index: 1, prompt_modifier: "scratching metallic head" },
          { state: "celebrate", slot_index: 2, prompt_modifier: undefined },
        ],
      }),
    );

    expect(result.queuedBatchIds).toBeDefined();
    expect(result.queuedBatchIds?.slotBatchIds).toEqual(["slot_batch_mock_core"]);
  });

  it("executes a workspace-wide audit across multiple mascots and aggregates metrics for pose slots", async () => {
    const validSquareGreen = createSolidTestPng(64, 64, [0, 255, 0, 255]);
    const transparentPng = createTransparentTestPng(64, 64);

    // Mascot 1: Compliant slot
    const m1 = await repository.saveMascot({ id: "ws_m1", name: "Compliant Cat" });
    const m1Slot = await repository.saveMascotAsset(m1.id, "slot_raw.png", validSquareGreen);
    await repository.saveMascot({
      ...m1,
      styles: (m1.styles || []).map((s) =>
        s.id === "core"
          ? {
              ...s,
              states: {
                ...s.states,
                thinking: [{ id: "slot_1", slot_index: 1, image_url: m1Slot, raw_image_url: m1Slot }],
              },
            }
          : s,
      ),
    });

    // Mascot 2: Transparency Violation slot
    const m2 = await repository.saveMascot({ id: "ws_m2", name: "Transparent Tiger" });
    const m2Slot = await repository.saveMascotAsset(m2.id, "slot_raw.png", transparentPng);
    await repository.saveMascot({
      ...m2,
      styles: (m2.styles || []).map((s) =>
        s.id === "core"
          ? {
              ...s,
              states: {
                ...s.states,
                thinking: [{ id: "slot_1", slot_index: 1, image_url: m2Slot, raw_image_url: m2Slot }],
              },
            }
          : s,
      ),
    });

    // Mascot 3: Missing Raw slot
    const m3 = await repository.saveMascot({ id: "ws_m3", name: "Missing raw Monkey" });
    const m3Slot = await repository.saveMascotAsset(m3.id, "slot.png", validSquareGreen);
    await repository.saveMascot({
      ...m3,
      styles: (m3.styles || []).map((s) =>
        s.id === "core"
          ? {
              ...s,
              states: {
                ...s.states,
                thinking: [{ id: "slot_1", slot_index: 1, image_url: m3Slot, raw_image_url: "" }],
              },
            }
          : s,
      ),
    });

    const auditService = new MascotGreenScreenAuditService(repository);
    const wsResult = await auditService.auditAllMascots({ mode: "scan" });

    expect(wsResult.mode).toBe("scan");
    expect(wsResult.totalMascots).toBe(3);
    expect(wsResult.mascots).toHaveLength(3);

    expect(wsResult.overallSummary.totalChecked).toBe(3);
    expect(wsResult.overallSummary.compliantCount).toBe(1);
    expect(wsResult.overallSummary.violationCount).toBe(2);
    expect(wsResult.overallSummary.transparencyCount).toBe(1);
    expect(wsResult.overallSummary.missingRawCount).toBe(1);
    expect(wsResult.overallSummary.insufficientChromaCount).toBe(0);
  });

  it("filters audit scope when styleId is explicitly specified", async () => {
    const validSquareGreen = createSolidTestPng(64, 64, [0, 255, 0, 255]);
    const transparentPng = createTransparentTestPng(64, 64);

    const mascot = await repository.saveMascot({ id: "scoped_mascot", name: "Scoped Mascot" });
    const coreSlot = await repository.saveMascotAsset(mascot.id, "core_slot_raw.png", validSquareGreen);
    const cyberSlot = await repository.saveMascotAsset(mascot.id, "cyber_slot_raw.png", transparentPng);

    const updatedStyles = [
      {
        id: "core",
        name: "Core Style",
        is_default: true,
        keyword: "core",
        states: {
          thinking: [{ id: "slot_1", slot_index: 1, image_url: coreSlot, raw_image_url: coreSlot }],
          celebrate: [],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "cyber",
        name: "Cyber Style",
        is_default: false,
        keyword: "cyber",
        states: {
          thinking: [{ id: "slot_1", slot_index: 1, image_url: cyberSlot, raw_image_url: cyberSlot }],
          celebrate: [],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    await repository.saveMascot({ ...mascot, styles: updatedStyles });

    const auditService = new MascotGreenScreenAuditService(repository);

    // Audit only core style (compliant)
    const coreResult = await auditService.auditMascot(mascot.id, { mode: "scan", styleId: "core" });
    expect(coreResult.summary.totalChecked).toBe(1);
    expect(coreResult.summary.compliantCount).toBe(1);
    expect(coreResult.summary.violationCount).toBe(0);

    // Audit only cyber style (violation)
    const cyberResult = await auditService.auditMascot(mascot.id, { mode: "scan", styleId: "cyber" });
    expect(cyberResult.summary.totalChecked).toBe(1);
    expect(cyberResult.summary.compliantCount).toBe(0);
    expect(cyberResult.summary.violationCount).toBe(1);
    expect(cyberResult.violations[0].styleId).toBe("cyber");
  });
});
