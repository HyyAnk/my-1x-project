import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMascotGreenScreenAudit } from "./useMascotGreenScreenAudit";
import { mascotGreenScreenAuditApi } from "../services/mascotGreenScreenAuditApi";
import type {
  MascotGreenScreenAuditResponse,
  MascotGreenScreenAuditStatusResponse,
} from "@studio/shared";

vi.mock("../services/mascotGreenScreenAuditApi", () => ({
  mascotGreenScreenAuditApi: {
    runMascotGreenScreenAudit: vi.fn(),
    getMascotGreenScreenAuditStatus: vi.fn(),
    runWorkspaceGreenScreenAudit: vi.fn(),
  },
}));

describe("useMascotGreenScreenAudit", () => {
  const mockMascotId = "mascot_123";
  const mockNotice = vi.fn();

  const mockScanResponse: MascotGreenScreenAuditResponse = {
    mascotId: mockMascotId,
    mascotName: "Test Mascot",
    mode: "scan",
    summary: {
      totalChecked: 10,
      compliantCount: 8,
      violationCount: 2,
      missingRawCount: 1,
      transparencyCount: 1,
      insufficientChromaCount: 0,
    },
    violations: [
      {
        targetType: "style_anchor",
        mascotId: mockMascotId,
        mascotName: "Test Mascot",
        styleId: "core",
        styleName: "Core Style",
        status: "violation",
        violationReason: "has_transparency",
      },
    ],
  };

  const mockStatusResponse: MascotGreenScreenAuditStatusResponse = {
    mascotId: mockMascotId,
    mascotName: "Test Mascot",
    isRepairing: false,
    activeBatchCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() =>
      useMascotGreenScreenAudit({ mascotId: mockMascotId, onNotice: mockNotice }),
    );

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isScanning).toBe(false);
    expect(result.current.isRepairing).toBe(false);
    expect(result.current.activeResult).toBeNull();
    expect(result.current.auditStatus).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should open modal and auto-trigger scan", async () => {
    vi.mocked(mascotGreenScreenAuditApi.runMascotGreenScreenAudit).mockResolvedValueOnce(
      mockScanResponse,
    );
    vi.mocked(mascotGreenScreenAuditApi.getMascotGreenScreenAuditStatus).mockResolvedValueOnce(
      mockStatusResponse,
    );

    const { result } = renderHook(() =>
      useMascotGreenScreenAudit({ mascotId: mockMascotId, onNotice: mockNotice }),
    );

    await act(async () => {
      result.current.openAuditModal();
    });

    expect(result.current.isOpen).toBe(true);
    expect(mascotGreenScreenAuditApi.runMascotGreenScreenAudit).toHaveBeenCalledWith(
      mockMascotId,
      { mode: "scan", style_id: undefined },
    );
    expect(result.current.activeResult).toEqual(mockScanResponse);
  });

  it("should close modal when closeAuditModal is called", () => {
    const { result } = renderHook(() =>
      useMascotGreenScreenAudit({ mascotId: mockMascotId, onNotice: mockNotice }),
    );

    act(() => {
      result.current.openAuditModal();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.closeAuditModal();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("should handle error when scan fails", async () => {
    vi.mocked(mascotGreenScreenAuditApi.runMascotGreenScreenAudit).mockRejectedValueOnce(
      new Error("Network failure"),
    );

    const { result } = renderHook(() =>
      useMascotGreenScreenAudit({ mascotId: mockMascotId, onNotice: mockNotice }),
    );

    await act(async () => {
      await result.current.runScan();
    });

    expect(result.current.error).toBe("Network failure");
    expect(mockNotice).toHaveBeenCalledWith({
      tone: "bad",
      message: "Network failure",
    });
    expect(result.current.isScanning).toBe(false);
  });

  it("should run repair, poll status until complete, and re-scan", async () => {
    const mockRepairResponse: MascotGreenScreenAuditResponse = {
      ...mockScanResponse,
      mode: "repair",
      summary: {
        ...mockScanResponse.summary,
        queuedJobCount: 2,
      },
    };

    const repairingStatus: MascotGreenScreenAuditStatusResponse = {
      mascotId: mockMascotId,
      mascotName: "Test Mascot",
      isRepairing: true,
      activeBatchCount: 1,
    };

    const completedStatus: MascotGreenScreenAuditStatusResponse = {
      mascotId: mockMascotId,
      mascotName: "Test Mascot",
      isRepairing: false,
      activeBatchCount: 0,
    };

    vi.mocked(mascotGreenScreenAuditApi.runMascotGreenScreenAudit).mockResolvedValue(
      mockRepairResponse,
    );
    vi.mocked(mascotGreenScreenAuditApi.getMascotGreenScreenAuditStatus)
      .mockResolvedValueOnce(repairingStatus)
      .mockResolvedValueOnce(completedStatus);

    const { result } = renderHook(() =>
      useMascotGreenScreenAudit({ mascotId: mockMascotId, onNotice: mockNotice }),
    );

    await act(async () => {
      await result.current.runRepair();
    });

    expect(result.current.isRepairing).toBe(true);
    expect(mockNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "neutral",
        message: expect.stringContaining("Queued 2 repair job(s)"),
      }),
    );

    // Fast-forward poll timer 1 (repairing)
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    // Fast-forward poll timer 2 (completed)
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.isRepairing).toBe(false);
    expect(mockNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "good",
      }),
    );
  });
});
