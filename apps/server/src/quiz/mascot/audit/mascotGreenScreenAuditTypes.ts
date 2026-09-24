/**
 * Chroma-Key Green Screen Audit Types
 *
 * Defines contracts, statuses, and data structures for inspecting and remediating
 * mascot style concept anchors and expressive pose slots for authentic green-screen backgrounds.
 */

export type {
  GreenScreenViolationReason,
  GreenScreenAuditItemStatus,
  GreenScreenAuditItem,
  MascotGreenScreenAuditSummary,
  MascotGreenScreenAuditRequest,
  MascotGreenScreenAuditResponse,
  MascotGreenScreenAuditResult,
  WorkspaceGreenScreenAuditResponse,
  WorkspaceGreenScreenAuditResult,
  MascotGreenScreenAuditStyleSlotStatus,
  MascotGreenScreenAuditStatusResponse,
} from "@studio/shared";

export interface AuditMascotOptions {
  mode: "scan" | "repair";
  styleId?: string;
}

export interface AuditAllMascotsOptions {
  mode: "scan" | "repair";
}
