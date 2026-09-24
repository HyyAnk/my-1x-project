import type {
  MascotGreenScreenAuditRequest,
  MascotGreenScreenAuditResponse,
  MascotGreenScreenAuditStatusResponse,
  WorkspaceGreenScreenAuditResponse,
} from "@studio/shared";
import { request } from "../../../api/client";

/**
 * Service API for Mascot Chroma-Key Green Screen Audit and automated remediation.
 */
export const mascotGreenScreenAuditApi = {
  runMascotGreenScreenAudit: async (
    mascotId: string,
    options?: { mode?: "scan" | "repair"; style_id?: string },
  ): Promise<MascotGreenScreenAuditResponse> => {
    const payload: MascotGreenScreenAuditRequest = {
      mode: options?.mode ?? "scan",
      ...(options?.style_id ? { style_id: options.style_id } : {}),
    };

    return request<MascotGreenScreenAuditResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/green-screen/audit`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  getMascotGreenScreenAuditStatus: async (
    mascotId: string,
  ): Promise<MascotGreenScreenAuditStatusResponse> => {
    return request<MascotGreenScreenAuditStatusResponse>(
      `/api/mascots/${encodeURIComponent(mascotId)}/green-screen/audit-status`,
    );
  },

  runWorkspaceGreenScreenAudit: async (
    mode?: "scan" | "repair",
  ): Promise<WorkspaceGreenScreenAuditResponse> => {
    const payload: MascotGreenScreenAuditRequest = {
      mode: mode ?? "scan",
    };

    return request<WorkspaceGreenScreenAuditResponse>(
      `/api/mascots/green-screen/audit-all`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
};

export const runMascotGreenScreenAudit = mascotGreenScreenAuditApi.runMascotGreenScreenAudit;
export const getMascotGreenScreenAuditStatus = mascotGreenScreenAuditApi.getMascotGreenScreenAuditStatus;
export const runWorkspaceGreenScreenAudit = mascotGreenScreenAuditApi.runWorkspaceGreenScreenAudit;
