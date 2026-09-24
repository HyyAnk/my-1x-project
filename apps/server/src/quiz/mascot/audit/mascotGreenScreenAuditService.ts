/**
 * Mascot Chroma-Key Green Screen Audit & Remediation Service
 *
 * Scans mascot style anchors and expressive pose slots for authentic chroma-key green compliance.
 * Detects missing raw files, pre-matted transparency leaks, and non-green chroma backgrounds.
 * Supports automated remediation by queuing regenerating batch jobs via MascotStyleJobManager
 * and MascotSlotJobManager.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  isUncustomizedBuiltInMascotStyle,
  type MascotProfile,
  type MascotSlotBatchJob,
  type MascotSlotJobState,
  type MascotStyleBatchJob,
  type QueueSlotGenerationItem,
  type QueueStyleGenerationItem,
} from "@studio/shared";
import { RepositoryError } from "../../../repository/errors.js";
import type { RepositoryService } from "../../../repository/service.js";
import type { StudioLogger } from "../../../logger.js";
import { validateGreenScreenNormalized } from "../../../utils/matting/greenScreenValidator.js";
import type { MascotSlotJobManager } from "../slotJobs/mascotSlotJobManager.js";
import type { MascotStyleJobManager } from "../styleJobs/mascotStyleJobManager.js";
import type {
  AuditAllMascotsOptions,
  AuditMascotOptions,
  GreenScreenAuditItem,
  GreenScreenViolationReason,
  MascotGreenScreenAuditResult,
  MascotGreenScreenAuditSummary,
  WorkspaceGreenScreenAuditResult,
} from "./mascotGreenScreenAuditTypes.js";

export class MascotGreenScreenAuditService {
  constructor(
    private readonly repository: RepositoryService,
    private readonly styleJobManager?: MascotStyleJobManager,
    private readonly slotJobManager?: MascotSlotJobManager,
    private readonly logger?: StudioLogger,
  ) {}

  /**
   * Audits a single mascot by ID for chroma-key green screen compliance.
   * If mode is "repair", automatically enqueues non-compliant assets for generation.
   */
  public async auditMascot(
    mascotId: string,
    options: AuditMascotOptions = { mode: "scan" },
  ): Promise<MascotGreenScreenAuditResult> {
    const mascot = await this.repository.getMascot(mascotId);
    if (!mascot) {
      throw new RepositoryError(`Mascot "${mascotId}" not found`, "MASCOT_NOT_FOUND");
    }

    const allStyles = mascot.styles || [];
    const stylesToAudit = options.styleId
      ? allStyles.filter((s) => s.id === options.styleId)
      : allStyles.filter((s) => !isUncustomizedBuiltInMascotStyle(s));

    if (options.styleId && stylesToAudit.length === 0) {
      throw new RepositoryError(
        `Style "${options.styleId}" not found for mascot "${mascotId}"`,
        "STYLE_NOT_FOUND",
      );
    }

    const auditItems: GreenScreenAuditItem[] = [];

    for (const style of stylesToAudit) {
      // Audit Expressive Pose Slots (thinking & celebrate states only)
      const slotStates: ("thinking" | "celebrate")[] = ["thinking", "celebrate"];
      for (const state of slotStates) {
        const slots = style.states?.[state] || [];
        for (const slot of slots) {
          const isPopulated = Boolean(
            slot.image_url?.trim() ||
            (slot.raw_image_url !== undefined && slot.raw_image_url !== "") ||
            slot.animation ||
            slot.status === "ready",
          );
          if (!isPopulated) continue;

          const slotItem = await this.auditSlot(mascot, style, state, slot);
          auditItems.push(slotItem);
        }
      }
    }

    const compliantCount = auditItems.filter((i) => i.status === "compliant").length;
    const violations = auditItems.filter((i) => i.status !== "compliant");
    const missingRawCount = violations.filter((i) => i.violationReason === "missing_raw").length;
    const transparencyCount = violations.filter((i) => i.violationReason === "has_transparency").length;
    const insufficientChromaCount = violations.filter((i) => i.violationReason === "insufficient_green_chroma").length;

    const summary: MascotGreenScreenAuditSummary = {
      totalChecked: auditItems.length,
      compliantCount,
      violationCount: violations.length,
      missingRawCount,
      transparencyCount,
      insufficientChromaCount,
      repairedCount: 0,
      queuedJobCount: 0,
    };

    let queuedBatchIds: { styleBatchId?: string; slotBatchIds?: string[] } | undefined;

    if (options.mode === "repair" && violations.length > 0) {
      const repairResult = await this.repairViolations(mascot, violations);
      summary.repairedCount = repairResult.queuedJobCount;
      summary.queuedJobCount = repairResult.queuedJobCount;
      queuedBatchIds = repairResult.queuedBatchIds;
    }

    return {
      mascotId: mascot.id,
      mascotName: mascot.name,
      mode: options.mode,
      summary,
      violations,
      queuedBatchIds,
    };
  }

  /**
   * Audits all mascots registered in the repository and aggregates global metrics.
   */
  public async auditAllMascots(
    options: AuditAllMascotsOptions = { mode: "scan" },
  ): Promise<WorkspaceGreenScreenAuditResult> {
    const mascots = await this.repository.listMascots();
    const mascotResults: MascotGreenScreenAuditResult[] = [];

    for (const mascot of mascots) {
      const result = await this.auditMascot(mascot.id, { mode: options.mode });
      mascotResults.push(result);
    }

    const overallSummary: MascotGreenScreenAuditSummary = {
      totalChecked: 0,
      compliantCount: 0,
      violationCount: 0,
      missingRawCount: 0,
      transparencyCount: 0,
      insufficientChromaCount: 0,
      repairedCount: 0,
      queuedJobCount: 0,
    };

    for (const m of mascotResults) {
      overallSummary.totalChecked += m.summary.totalChecked;
      overallSummary.compliantCount += m.summary.compliantCount;
      overallSummary.violationCount += m.summary.violationCount;
      overallSummary.missingRawCount += m.summary.missingRawCount;
      overallSummary.transparencyCount += m.summary.transparencyCount;
      overallSummary.insufficientChromaCount += m.summary.insufficientChromaCount;
      overallSummary.repairedCount = (overallSummary.repairedCount ?? 0) + (m.summary.repairedCount ?? 0);
      overallSummary.queuedJobCount = (overallSummary.queuedJobCount ?? 0) + (m.summary.queuedJobCount ?? 0);
    }

    return {
      mode: options.mode,
      totalMascots: mascots.length,
      overallSummary,
      mascots: mascotResults,
    };
  }

  private async auditSlot(
    mascot: MascotProfile,
    style: NonNullable<MascotProfile["styles"]>[number],
    state: "thinking" | "celebrate",
    slot: NonNullable<NonNullable<MascotProfile["styles"]>[number]["states"]["thinking"]>[number],
  ): Promise<GreenScreenAuditItem> {
    const rawUrl = slot.raw_image_url?.trim() || null;
    const imageUrl = slot.image_url?.trim() || null;

    if (!rawUrl) {
      return {
        targetType: "slot",
        mascotId: mascot.id,
        mascotName: mascot.name,
        styleId: style.id,
        styleName: style.name,
        state,
        slotIndex: slot.slot_index,
        rawImageUrl: null,
        imageUrl,
        status: "missing",
        violationReason: "missing_raw",
        details: "Raw slot image URL is missing",
      };
    }

    const buffer = await this.loadRawBuffer(mascot.id, rawUrl);
    if (!buffer) {
      return {
        targetType: "slot",
        mascotId: mascot.id,
        mascotName: mascot.name,
        styleId: style.id,
        styleName: style.name,
        state,
        slotIndex: slot.slot_index,
        rawImageUrl: rawUrl,
        imageUrl,
        status: "missing",
        violationReason: "missing_raw",
        details: "Raw slot image file not found on disk",
      };
    }

    try {
      const valResult = await validateGreenScreenNormalized(buffer, { composition: "16:9" });
      if (valResult.isValid) {
        return {
          targetType: "slot",
          mascotId: mascot.id,
          mascotName: mascot.name,
          styleId: style.id,
          styleName: style.name,
          state,
          slotIndex: slot.slot_index,
          rawImageUrl: rawUrl,
          imageUrl,
          status: "compliant",
          greenRatio: valResult.greenRatio,
          details: `Valid green screen (green ratio: ${(valResult.greenRatio * 100).toFixed(1)}%)`,
        };
      }

      const violationReason: GreenScreenViolationReason =
        valResult.reason === "native_transparency"
          ? "has_transparency"
          : valResult.reason === "insufficient_green_chroma"
            ? "insufficient_green_chroma"
            : "corrupted_file";

      return {
        targetType: "slot",
        mascotId: mascot.id,
        mascotName: mascot.name,
        styleId: style.id,
        styleName: style.name,
        state,
        slotIndex: slot.slot_index,
        rawImageUrl: rawUrl,
        imageUrl,
        status: "violation",
        violationReason,
        greenRatio: valResult.greenRatio,
        details: this.formatViolationDetails(valResult),
      };
    } catch (err) {
      return {
        targetType: "slot",
        mascotId: mascot.id,
        mascotName: mascot.name,
        styleId: style.id,
        styleName: style.name,
        state,
        slotIndex: slot.slot_index,
        rawImageUrl: rawUrl,
        imageUrl,
        status: "violation",
        violationReason: "corrupted_file",
        details: err instanceof Error ? err.message : "Failed to decode or inspect image",
      };
    }
  }

  private async repairViolations(
    mascot: MascotProfile,
    violations: GreenScreenAuditItem[],
  ): Promise<{ queuedJobCount: number; queuedBatchIds?: { styleBatchId?: string; slotBatchIds?: string[] } }> {
    let queuedJobCount = 0;
    const queuedBatchIds: { styleBatchId?: string; slotBatchIds?: string[] } = {};

    // Repair Expressive Pose Slots (grouped by styleId)
    const slotViolations = violations.filter((v) => v.targetType === "slot");
    if (slotViolations.length > 0) {
      if (!this.slotJobManager) {
        throw new Error("Cannot repair mascot slots: MascotSlotJobManager was not provided");
      }

      const slotsByStyle = new Map<string, GreenScreenAuditItem[]>();
      for (const v of slotViolations) {
        const list = slotsByStyle.get(v.styleId) ?? [];
        list.push(v);
        slotsByStyle.set(v.styleId, list);
      }

      const slotBatchIds: string[] = [];
      for (const [styleId, styleSlotViolations] of slotsByStyle.entries()) {
        const style = mascot.styles?.find((s) => s.id === styleId);
        const queueSlotItems: QueueSlotGenerationItem[] = styleSlotViolations
          .filter((v) => v.state && typeof v.slotIndex === "number")
          .map((v) => {
            const existingSlot = style?.states?.[v.state!]?.find((s) => s.slot_index === v.slotIndex);
            return {
              state: v.state as MascotSlotJobState,
              slot_index: v.slotIndex!,
              prompt_modifier: existingSlot?.prompt_modifier || undefined,
            };
          });

        if (queueSlotItems.length > 0) {
          const slotBatch: MascotSlotBatchJob = await this.slotJobManager.enqueueBatch(mascot.id, {
            style_id: styleId,
            mode: queueSlotItems.length === 1 ? "single" : "regenerate_selected",
            slots: queueSlotItems,
          });
          slotBatchIds.push(slotBatch.id);
          queuedJobCount += queueSlotItems.length;
        }
      }

      if (slotBatchIds.length > 0) {
        queuedBatchIds.slotBatchIds = slotBatchIds;
      }
    }

    return {
      queuedJobCount,
      queuedBatchIds: Object.keys(queuedBatchIds).length > 0 ? queuedBatchIds : undefined,
    };
  }

  private async loadRawBuffer(mascotId: string, rawImageUrl: string): Promise<Buffer | null> {
    if (rawImageUrl.startsWith("data:image/")) {
      const base64Part = rawImageUrl.split(",")[1];
      if (base64Part) {
        return Buffer.from(base64Part, "base64");
      }
    }

    if (path.isAbsolute(rawImageUrl)) {
      try {
        return await readFile(rawImageUrl);
      } catch {
        // Fall through to repository file lookup
      }
    }

    const cleanUrl = rawImageUrl.split("?")[0];
    const filename = cleanUrl.split("/").pop();
    if (!filename) return null;

    if (typeof this.repository.getMascotAssetFile === "function") {
      try {
        const fileInfo = await this.repository.getMascotAssetFile(mascotId, filename);
        return await readFile(fileInfo.absolutePath);
      } catch {
        // Fall through to direct roots lookup
      }
    }

    if (this.repository.roots?.mascots) {
      try {
        const directPath = path.join(this.repository.roots.mascots, mascotId, "assets", filename);
        return await readFile(directPath);
      } catch {
        return null;
      }
    }

    return null;
  }

  private formatViolationDetails(valResult: { reason?: string; greenRatio: number }): string {
    if (valResult.reason === "native_transparency") {
      return "Raw asset contains native alpha transparency (pre-matted cutout)";
    }
    if (valResult.reason === "insufficient_green_chroma") {
      return `Insufficient chroma-key green coverage (${(valResult.greenRatio * 100).toFixed(1)}% green pixels, required >= 65%)`;
    }
    if (valResult.reason === "invalid_image") {
      return "Invalid or unparseable image file format";
    }
    if (valResult.reason === "zero_dimensions") {
      return "Image has zero width or height";
    }
    return `Validation failed (${valResult.reason ?? "unknown"})`;
  }
}
