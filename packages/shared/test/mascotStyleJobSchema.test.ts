import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  MascotStyleJobStatusSchema,
  MascotStyleBatchStatusSchema,
  MascotStyleConceptJobSchema,
  MascotStyleBatchJobSchema,
  QueueStyleGenerationInputSchema,
  StyleBatchStatusResponseSchema,
  MASCOT_STYLE_JOB_STATUSES,
  MASCOT_STYLE_BATCH_STATUSES,
  type MascotStyleConceptJob,
  type MascotStyleBatchJob,
  type StyleBatchStatusResponse,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;
const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};
const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

describe("Mascot Style Job Schemas and Contracts", () => {
  describe("MascotStyleJobStatusSchema", () => {
    it("accepts all canonical job statuses", () => {
      for (const status of MASCOT_STYLE_JOB_STATUSES) {
        assert.equal(MascotStyleJobStatusSchema.parse(status), status);
      }
    });

    it("rejects invalid status values", () => {
      assert.throws(() => MascotStyleJobStatusSchema.parse("invalid_status"));
      assert.throws(() => MascotStyleJobStatusSchema.parse(""));
      assert.throws(() => MascotStyleJobStatusSchema.parse(999));
    });
  });

  describe("MascotStyleBatchStatusSchema", () => {
    it("accepts all canonical batch statuses", () => {
      for (const status of MASCOT_STYLE_BATCH_STATUSES) {
        assert.equal(MascotStyleBatchStatusSchema.parse(status), status);
      }
    });

    it("rejects invalid batch status values", () => {
      assert.throws(() => MascotStyleBatchStatusSchema.parse("running"));
      assert.throws(() => MascotStyleBatchStatusSchema.parse("pending"));
    });
  });

  describe("MascotStyleConceptJobSchema", () => {
    const validJob: MascotStyleConceptJob = {
      id: "job-style-1",
      mascot_id: "mascot-1",
      style_id: "style-cyber",
      style_name: "Cyber Neon",
      status: "queued",
      prompt: "cyan armor",
      anchor_image_url: null,
      raw_anchor_image_url: null,
      prompt_used: null,
      error: null,
      created_at: "2026-09-18T10:00:00.000Z",
      started_at: null,
      completed_at: null,
    };

    it("parses valid complete style concept job record", () => {
      const parsed = MascotStyleConceptJobSchema.parse(validJob);
      assert.equal(parsed.id, "job-style-1");
      assert.equal(parsed.style_id, "style-cyber");
      assert.equal(parsed.style_name, "Cyber Neon");
      assert.equal(parsed.status, "queued");
    });
  });

  describe("MascotStyleBatchJobSchema", () => {
    it("parses valid batch job record with items", () => {
      const batch: MascotStyleBatchJob = {
        id: "batch-style-1",
        mascot_id: "mascot-1",
        status: "processing",
        total_styles: 2,
        completed_count: 1,
        failed_count: 0,
        active_style_ids: ["style-2"],
        items: [
          {
            id: "job-s1",
            mascot_id: "mascot-1",
            style_id: "style-1",
            style_name: "Style 1",
            status: "completed",
            anchor_image_url: "https://example.com/s1.png",
            created_at: "2026-09-18T10:00:00.000Z",
          },
          {
            id: "job-s2",
            mascot_id: "mascot-1",
            style_id: "style-2",
            style_name: "Style 2",
            status: "generating",
            created_at: "2026-09-18T10:00:00.000Z",
          },
        ],
        created_at: "2026-09-18T10:00:00.000Z",
        updated_at: "2026-09-18T10:01:00.000Z",
      };

      const parsed = MascotStyleBatchJobSchema.parse(batch);
      assert.equal(parsed.id, "batch-style-1");
      assert.equal(parsed.total_styles, 2);
      assert.equal(parsed.completed_count, 1);
      assert.equal(parsed.items.length, 2);
    });
  });

  describe("QueueStyleGenerationInputSchema", () => {
    it("parses valid batch queue input", () => {
      const input = {
        styles: [
          { style_id: "style-1", style_name: "Cyber" },
          { style_id: "style-2", style_name: "Retro", prompt: "custom 8-bit" },
        ],
        mode: "batch" as const,
      };
      const parsed = QueueStyleGenerationInputSchema.parse(input);
      assert.equal(parsed.styles.length, 2);
      assert.equal(parsed.mode, "batch");
    });

    it("rejects empty styles array", () => {
      assert.throws(() => QueueStyleGenerationInputSchema.parse({ styles: [] }));
    });
  });

  describe("StyleBatchStatusResponseSchema", () => {
    it("parses response with active batch", () => {
      const res: StyleBatchStatusResponse = {
        active_batch: null,
        queued_style_ids: [],
        active_style_ids: [],
      };
      const parsed = StyleBatchStatusResponseSchema.parse(res);
      assert.equal(parsed.active_batch, null);
      assert.deepEqual(parsed.queued_style_ids, []);
    });
  });
});
