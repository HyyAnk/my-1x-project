import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  mascotGreenScreenAuditApi,
  runMascotGreenScreenAudit,
  getMascotGreenScreenAuditStatus,
  runWorkspaceGreenScreenAudit,
} from "./mascotGreenScreenAuditApi";
import { request } from "../../../api/client";
import type {
  MascotGreenScreenAuditResponse,
  MascotGreenScreenAuditStatusResponse,
  WorkspaceGreenScreenAuditResponse,
} from "@studio/shared";

vi.mock("../../../api/client", () => ({
  request: vi.fn(),
}));

describe("mascotGreenScreenAuditApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runMascotGreenScreenAudit", () => {
    it("should call POST /api/mascots/:id/green-screen/audit with default scan mode", async () => {
      const mockResponse: MascotGreenScreenAuditResponse = {
        mascotId: "mascot_1",
        mascotName: "Test Mascot",
        mode: "scan",
        summary: {
          totalChecked: 10,
          compliantCount: 10,
          violationCount: 0,
          missingRawCount: 0,
          transparencyCount: 0,
          insufficientChromaCount: 0,
        },
        violations: [],
      };

      vi.mocked(request).mockResolvedValueOnce(mockResponse);

      const result = await mascotGreenScreenAuditApi.runMascotGreenScreenAudit("mascot_1");

      expect(request).toHaveBeenCalledWith(
        "/api/mascots/mascot_1/green-screen/audit",
        {
          method: "POST",
          body: JSON.stringify({ mode: "scan" }),
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should pass repair mode and style_id when specified", async () => {
      const mockResponse: MascotGreenScreenAuditResponse = {
        mascotId: "mascot_1",
        mascotName: "Test Mascot",
        mode: "repair",
        summary: {
          totalChecked: 5,
          compliantCount: 3,
          violationCount: 2,
          missingRawCount: 1,
          transparencyCount: 1,
          insufficientChromaCount: 0,
          queuedJobCount: 2,
        },
        violations: [],
        queuedBatchIds: { styleBatchId: "batch_1" },
      };

      vi.mocked(request).mockResolvedValueOnce(mockResponse);

      const result = await runMascotGreenScreenAudit("mascot_1", {
        mode: "repair",
        style_id: "core",
      });

      expect(request).toHaveBeenCalledWith(
        "/api/mascots/mascot_1/green-screen/audit",
        {
          method: "POST",
          body: JSON.stringify({ mode: "repair", style_id: "core" }),
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getMascotGreenScreenAuditStatus", () => {
    it("should call GET /api/mascots/:id/green-screen/audit-status", async () => {
      const mockStatus: MascotGreenScreenAuditStatusResponse = {
        mascotId: "mascot_1",
        mascotName: "Test Mascot",
        isRepairing: false,
        activeBatchCount: 0,
      };

      vi.mocked(request).mockResolvedValueOnce(mockStatus);

      const result = await getMascotGreenScreenAuditStatus("mascot_1");

      expect(request).toHaveBeenCalledWith(
        "/api/mascots/mascot_1/green-screen/audit-status",
      );
      expect(result).toEqual(mockStatus);
    });
  });

  describe("runWorkspaceGreenScreenAudit", () => {
    it("should call POST /api/mascots/green-screen/audit-all with default scan mode", async () => {
      const mockWorkspaceResponse: WorkspaceGreenScreenAuditResponse = {
        mode: "scan",
        totalMascots: 2,
        overallSummary: {
          totalChecked: 20,
          compliantCount: 18,
          violationCount: 2,
          missingRawCount: 1,
          transparencyCount: 1,
          insufficientChromaCount: 0,
        },
        mascots: [],
      };

      vi.mocked(request).mockResolvedValueOnce(mockWorkspaceResponse);

      const result = await runWorkspaceGreenScreenAudit();

      expect(request).toHaveBeenCalledWith(
        "/api/mascots/green-screen/audit-all",
        {
          method: "POST",
          body: JSON.stringify({ mode: "scan" }),
        },
      );
      expect(result).toEqual(mockWorkspaceResponse);
    });

    it("should support mode=repair for workspace audit", async () => {
      const mockWorkspaceResponse: WorkspaceGreenScreenAuditResponse = {
        mode: "repair",
        totalMascots: 1,
        overallSummary: {
          totalChecked: 10,
          compliantCount: 10,
          violationCount: 0,
          missingRawCount: 0,
          transparencyCount: 0,
          insufficientChromaCount: 0,
        },
        mascots: [],
      };

      vi.mocked(request).mockResolvedValueOnce(mockWorkspaceResponse);

      const result = await runWorkspaceGreenScreenAudit("repair");

      expect(request).toHaveBeenCalledWith(
        "/api/mascots/green-screen/audit-all",
        {
          method: "POST",
          body: JSON.stringify({ mode: "repair" }),
        },
      );
      expect(result).toEqual(mockWorkspaceResponse);
    });
  });
});
