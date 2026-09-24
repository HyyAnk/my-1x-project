import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  GreenScreenViolationReasonSchema,
  GreenScreenAuditItemStatusSchema,
  GreenScreenAuditItemSchema,
  MascotGreenScreenAuditSummarySchema,
  MascotGreenScreenAuditRequestSchema,
  MascotGreenScreenAuditResponseSchema,
  WorkspaceGreenScreenAuditResponseSchema,
  MascotGreenScreenAuditStatusResponseSchema,
  type GreenScreenAuditItem,
  type MascotGreenScreenAuditResponse,
  type WorkspaceGreenScreenAuditResponse,
  type MascotGreenScreenAuditStatusResponse,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;
const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};
const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

describe("Mascot Green Screen Audit Schemas", () => {
  describe("GreenScreenViolationReasonSchema", () => {
    it("accepts valid violation reasons", () => {
      const validReasons = [
        "missing_raw",
        "has_transparency",
        "insufficient_green_chroma",
        "corrupted_file",
      ];
      for (const reason of validReasons) {
        assert.equal(GreenScreenViolationReasonSchema.parse(reason), reason);
      }
    });

    it("rejects invalid violation reasons", () => {
      assert.throws(() => GreenScreenViolationReasonSchema.parse("invalid_reason"));
      assert.throws(() => GreenScreenViolationReasonSchema.parse(""));
      assert.throws(() => GreenScreenViolationReasonSchema.parse(123));
    });
  });

  describe("GreenScreenAuditItemStatusSchema", () => {
    it("accepts valid audit statuses", () => {
      const validStatuses = ["compliant", "violation", "missing"];
      for (const status of validStatuses) {
        assert.equal(GreenScreenAuditItemStatusSchema.parse(status), status);
      }
    });

    it("rejects invalid statuses", () => {
      assert.throws(() => GreenScreenAuditItemStatusSchema.parse("unknown"));
      assert.throws(() => GreenScreenAuditItemStatusSchema.parse("passed"));
    });
  });

  describe("GreenScreenAuditItemSchema", () => {
    it("validates a compliant style anchor item", () => {
      const item: GreenScreenAuditItem = {
        targetType: "style_anchor",
        mascotId: "m1",
        mascotName: "Test Mascot",
        styleId: "s1",
        styleName: "Default Style",
        status: "compliant",
        rawImageUrl: "/path/to/raw.png",
        imageUrl: "/path/to/transparent.png",
        greenRatio: 0.72,
        details: "Valid green screen",
      };
      const parsed = GreenScreenAuditItemSchema.parse(item);
      assert.equal(parsed.targetType, "style_anchor");
      assert.equal(parsed.status, "compliant");
      assert.equal(parsed.greenRatio, 0.72);
    });

    it("validates a violation slot item", () => {
      const item: GreenScreenAuditItem = {
        targetType: "slot",
        mascotId: "m1",
        mascotName: "Test Mascot",
        styleId: "s1",
        styleName: "Default Style",
        state: "thinking",
        slotIndex: 1,
        status: "violation",
        violationReason: "has_transparency",
        rawImageUrl: "/path/to/raw.png",
        details: "Pre-matted transparent background detected",
      };
      const parsed = GreenScreenAuditItemSchema.parse(item);
      assert.equal(parsed.targetType, "slot");
      assert.equal(parsed.state, "thinking");
      assert.equal(parsed.slotIndex, 1);
      assert.equal(parsed.violationReason, "has_transparency");
    });
  });

  describe("MascotGreenScreenAuditSummarySchema", () => {
    it("parses valid summary metrics", () => {
      const summary = {
        totalChecked: 21,
        compliantCount: 19,
        violationCount: 2,
        missingRawCount: 1,
        transparencyCount: 1,
        insufficientChromaCount: 0,
        repairedCount: 2,
        queuedJobCount: 2,
      };
      const parsed = MascotGreenScreenAuditSummarySchema.parse(summary);
      assert.equal(parsed.totalChecked, 21);
      assert.equal(parsed.compliantCount, 19);
      assert.equal(parsed.violationCount, 2);
    });

    it("rejects negative numbers", () => {
      assert.throws(() =>
        MascotGreenScreenAuditSummarySchema.parse({
          totalChecked: -1,
          compliantCount: 0,
          violationCount: 0,
          missingRawCount: 0,
          transparencyCount: 0,
          insufficientChromaCount: 0,
        }),
      );
    });
  });

  describe("MascotGreenScreenAuditRequestSchema", () => {
    it("defaults mode to scan when unspecified", () => {
      const parsed = MascotGreenScreenAuditRequestSchema.parse({});
      assert.equal(parsed.mode, "scan");
      assert.equal(parsed.style_id, undefined);
    });

    it("accepts repair mode and specific style_id", () => {
      const parsed = MascotGreenScreenAuditRequestSchema.parse({
        mode: "repair",
        style_id: "style-xyz",
      });
      assert.equal(parsed.mode, "repair");
      assert.equal(parsed.style_id, "style-xyz");
    });

    it("rejects invalid mode", () => {
      assert.throws(() =>
        MascotGreenScreenAuditRequestSchema.parse({
          mode: "destroy",
        }),
      );
    });
  });

  describe("MascotGreenScreenAuditResponseSchema", () => {
    it("validates full mascot audit response", () => {
      const response: MascotGreenScreenAuditResponse = {
        mascotId: "mascot-alpha",
        mascotName: "Alpha",
        mode: "repair",
        summary: {
          totalChecked: 10,
          compliantCount: 8,
          violationCount: 2,
          missingRawCount: 1,
          transparencyCount: 1,
          insufficientChromaCount: 0,
          repairedCount: 2,
          queuedJobCount: 2,
        },
        violations: [
          {
            targetType: "style_anchor",
            mascotId: "mascot-alpha",
            mascotName: "Alpha",
            styleId: "s1",
            styleName: "Default",
            status: "missing",
            violationReason: "missing_raw",
            details: "Raw anchor image missing",
          },
        ],
        queuedBatchIds: {
          styleBatchId: "style_batch_123",
          slotBatchIds: ["slot_batch_456"],
        },
      };

      const parsed = MascotGreenScreenAuditResponseSchema.parse(response);
      assert.equal(parsed.mascotId, "mascot-alpha");
      assert.equal(parsed.summary.violationCount, 2);
      assert.equal(parsed.queuedBatchIds?.styleBatchId, "style_batch_123");
    });
  });

  describe("WorkspaceGreenScreenAuditResponseSchema", () => {
    it("validates workspace aggregated audit response", () => {
      const response: WorkspaceGreenScreenAuditResponse = {
        mode: "scan",
        totalMascots: 1,
        overallSummary: {
          totalChecked: 5,
          compliantCount: 5,
          violationCount: 0,
          missingRawCount: 0,
          transparencyCount: 0,
          insufficientChromaCount: 0,
        },
        mascots: [
          {
            mascotId: "m1",
            mascotName: "Lynx",
            mode: "scan",
            summary: {
              totalChecked: 5,
              compliantCount: 5,
              violationCount: 0,
              missingRawCount: 0,
              transparencyCount: 0,
              insufficientChromaCount: 0,
            },
            violations: [],
          },
        ],
      };

      const parsed = WorkspaceGreenScreenAuditResponseSchema.parse(response);
      assert.equal(parsed.totalMascots, 1);
      assert.equal(parsed.overallSummary.compliantCount, 5);
      assert.equal(parsed.mascots.length, 1);
    });
  });

  describe("MascotGreenScreenAuditStatusResponseSchema", () => {
    it("validates audit status response with active repairing state", () => {
      const status: MascotGreenScreenAuditStatusResponse = {
        mascotId: "mascot-1",
        mascotName: "Lynx",
        isRepairing: true,
        styleBatch: {
          active_batch: {
            id: "style_batch_1",
            mascot_id: "mascot-1",
            status: "processing",
            total_styles: 1,
            completed_count: 0,
            failed_count: 0,
            active_style_ids: ["style-1"],
            items: [
              {
                id: "job-1",
                mascot_id: "mascot-1",
                style_id: "style-1",
                style_name: "Default",
                status: "generating",
                created_at: new Date().toISOString(),
              },
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          queued_style_ids: [],
          active_style_ids: ["style-1"],
        },
        slotBatches: [],
        activeBatchCount: 1,
      };

      const parsed = MascotGreenScreenAuditStatusResponseSchema.parse(status);
      assert.equal(parsed.mascotId, "mascot-1");
      assert.equal(parsed.isRepairing, true);
      assert.equal(parsed.activeBatchCount, 1);
    });
  });
});
