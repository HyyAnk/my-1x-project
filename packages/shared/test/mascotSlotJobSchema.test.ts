import { describe as nodeDescribe, it as nodeIt } from "node:test";
import assert from "node:assert/strict";
import {
  MascotSlotJobStatusSchema,
  MascotSlotBatchStatusSchema,
  MascotSlotGenerationJobSchema,
  MascotSlotBatchJobSchema,
  QueueSlotGenerationInputSchema,
  QueueSlotGenerationItemSchema,
  SlotBatchStatusResponseSchema,
  CancelSlotGenerationInputSchema,
  formatMascotSlotKey,
  parseMascotSlotKey,
  MASCOT_SLOT_JOB_STATUSES,
  MASCOT_SLOT_BATCH_STATUSES,
  QUEUE_SLOT_GENERATION_MODES,
  type MascotSlotGenerationJob,
  type MascotSlotBatchJob,
  type QueueSlotGenerationInput,
  type SlotBatchStatusResponse,
  type CancelSlotGenerationInput,
} from "../src/index.js";

type TestCallback = () => void | Promise<void>;
const describe = (name: string, suite: TestCallback): void => {
  void nodeDescribe(name, suite);
};
const it = (name: string, testCase: TestCallback): void => {
  void nodeIt(name, testCase);
};

describe("Mascot Slot Job Schemas and Utilities", () => {
  describe("MascotSlotJobStatusSchema", () => {
    it("accepts all canonical job statuses", () => {
      for (const status of MASCOT_SLOT_JOB_STATUSES) {
        assert.equal(MascotSlotJobStatusSchema.parse(status), status);
      }
    });

    it("rejects invalid status values", () => {
      assert.throws(() => MascotSlotJobStatusSchema.parse("pending"));
      assert.throws(() => MascotSlotJobStatusSchema.parse("done"));
      assert.throws(() => MascotSlotJobStatusSchema.parse(""));
      assert.throws(() => MascotSlotJobStatusSchema.parse(123));
    });
  });

  describe("MascotSlotBatchStatusSchema", () => {
    it("accepts all canonical batch statuses", () => {
      for (const status of MASCOT_SLOT_BATCH_STATUSES) {
        assert.equal(MascotSlotBatchStatusSchema.parse(status), status);
      }
    });

    it("rejects invalid batch status values", () => {
      assert.throws(() => MascotSlotBatchStatusSchema.parse("generating"));
      assert.throws(() => MascotSlotBatchStatusSchema.parse("in_progress"));
    });
  });

  describe("MascotSlotGenerationJobSchema", () => {
    const validJob: MascotSlotGenerationJob = {
      id: "job-101",
      mascot_id: "mascot-owl",
      style_id: "style-cyberpunk",
      state: "thinking",
      slot_index: 1,
      status: "queued",
      prompt_modifier: "wearing goggles",
      prompt_used: "full prompt with goggles",
      error: null,
      created_at: "2026-09-17T20:00:00.000Z",
      started_at: null,
      completed_at: null,
    };

    it("parses valid complete job record", () => {
      const parsed = MascotSlotGenerationJobSchema.parse(validJob);
      assert.equal(parsed.id, "job-101");
      assert.equal(parsed.state, "thinking");
      assert.equal(parsed.slot_index, 1);
      assert.equal(parsed.status, "queued");
      assert.equal(parsed.prompt_modifier, "wearing goggles");
    });

    it("parses minimal job record with optional fields omitted", () => {
      const minimalJob = {
        id: "job-102",
        mascot_id: "mascot-owl",
        style_id: "style-cyberpunk",
        state: "celebrate" as const,
        slot_index: 10,
        status: "generating" as const,
        created_at: "2026-09-17T20:05:00.000Z",
      };
      const parsed = MascotSlotGenerationJobSchema.parse(minimalJob);
      assert.equal(parsed.id, "job-102");
      assert.equal(parsed.state, "celebrate");
      assert.equal(parsed.slot_index, 10);
      assert.equal(parsed.status, "generating");
    });

    it("rejects out-of-range slot indices", () => {
      assert.throws(() => MascotSlotGenerationJobSchema.parse({ ...validJob, slot_index: 0 }));
      assert.throws(() => MascotSlotGenerationJobSchema.parse({ ...validJob, slot_index: 11 }));
      assert.throws(() => MascotSlotGenerationJobSchema.parse({ ...validJob, slot_index: -1 }));
      assert.throws(() => MascotSlotGenerationJobSchema.parse({ ...validJob, slot_index: 1.5 }));
    });

    it("rejects invalid state values", () => {
      assert.throws(() => MascotSlotGenerationJobSchema.parse({ ...validJob, state: "idle" }));
      assert.throws(() => MascotSlotGenerationJobSchema.parse({ ...validJob, state: "wave" }));
    });

    it("rejects missing required fields", () => {
      const { id: _, ...withoutId } = validJob;
      assert.throws(() => MascotSlotGenerationJobSchema.parse(withoutId));
    });
  });

  describe("MascotSlotBatchJobSchema", () => {
    const validBatch: MascotSlotBatchJob = {
      id: "batch-201",
      mascot_id: "mascot-owl",
      style_id: "style-cyberpunk",
      status: "processing",
      total_slots: 2,
      completed_count: 1,
      failed_count: 0,
      active_slot_keys: ["thinking_2"],
      items: [
        {
          id: "job-1",
          mascot_id: "mascot-owl",
          style_id: "style-cyberpunk",
          state: "thinking",
          slot_index: 1,
          status: "completed",
          created_at: "2026-09-17T20:00:00.000Z",
        },
        {
          id: "job-2",
          mascot_id: "mascot-owl",
          style_id: "style-cyberpunk",
          state: "thinking",
          slot_index: 2,
          status: "generating",
          created_at: "2026-09-17T20:00:00.000Z",
        },
      ],
      created_at: "2026-09-17T20:00:00.000Z",
      updated_at: "2026-09-17T20:01:00.000Z",
    };

    it("parses valid batch job with items and active slot keys", () => {
      const parsed = MascotSlotBatchJobSchema.parse(validBatch);
      assert.equal(parsed.id, "batch-201");
      assert.equal(parsed.total_slots, 2);
      assert.equal(parsed.items.length, 2);
      assert.deepEqual(parsed.active_slot_keys, ["thinking_2"]);
    });

    it("rejects negative slot counters", () => {
      assert.throws(() => MascotSlotBatchJobSchema.parse({ ...validBatch, total_slots: -1 }));
      assert.throws(() => MascotSlotBatchJobSchema.parse({ ...validBatch, completed_count: -1 }));
      assert.throws(() => MascotSlotBatchJobSchema.parse({ ...validBatch, failed_count: -1 }));
    });
  });

  describe("QueueSlotGenerationInputSchema", () => {
    it("parses valid queue generation inputs across all modes", () => {
      for (const mode of QUEUE_SLOT_GENERATION_MODES) {
        const input: QueueSlotGenerationInput = {
          style_id: "style-cyberpunk",
          slots: [
            { state: "thinking", slot_index: 1, prompt_modifier: "focused" },
            { state: "celebrate", slot_index: 5 },
          ],
          mode,
        };
        const parsed = QueueSlotGenerationInputSchema.parse(input);
        assert.equal(parsed.style_id, "style-cyberpunk");
        assert.equal(parsed.mode, mode);
        assert.equal(parsed.slots.length, 2);
      }
    });

    it("rejects invalid slot configurations", () => {
      assert.throws(() => QueueSlotGenerationItemSchema.parse({ state: "thinking", slot_index: 11 }));
      assert.throws(() => QueueSlotGenerationItemSchema.parse({ state: "dance", slot_index: 1 }));
    });

    it("rejects missing style_id or invalid mode", () => {
      assert.throws(() =>
        QueueSlotGenerationInputSchema.parse({
          style_id: "",
          slots: [{ state: "thinking", slot_index: 1 }],
          mode: "single",
        }),
      );
      assert.throws(() =>
        QueueSlotGenerationInputSchema.parse({
          style_id: "style-1",
          slots: [{ state: "thinking", slot_index: 1 }],
          mode: "invalid_mode",
        }),
      );
    });
  });

  describe("SlotBatchStatusResponseSchema", () => {
    it("parses response with null active_batch", () => {
      const response: SlotBatchStatusResponse = {
        active_batch: null,
        queued_slot_keys: [],
        active_slot_keys: [],
      };
      const parsed = SlotBatchStatusResponseSchema.parse(response);
      assert.equal(parsed.active_batch, null);
      assert.deepEqual(parsed.queued_slot_keys, []);
      assert.deepEqual(parsed.active_slot_keys, []);
    });

    it("parses response with active_batch and recent_batches", () => {
      const batchRecord: MascotSlotBatchJob = {
        id: "batch-301",
        mascot_id: "mascot-owl",
        style_id: "style-cyberpunk",
        status: "processing",
        total_slots: 1,
        completed_count: 0,
        failed_count: 0,
        active_slot_keys: ["celebrate_1"],
        items: [],
        created_at: "2026-09-17T20:10:00.000Z",
        updated_at: "2026-09-17T20:10:00.000Z",
      };
      const response: SlotBatchStatusResponse = {
        active_batch: batchRecord,
        queued_slot_keys: ["celebrate_2"],
        active_slot_keys: ["celebrate_1"],
        recent_batches: [batchRecord],
      };
      const parsed = SlotBatchStatusResponseSchema.parse(response);
      assert.ok(parsed.active_batch);
      assert.equal(parsed.active_batch.id, "batch-301");
      assert.equal(parsed.recent_batches?.length, 1);
    });
  });

  describe("CancelSlotGenerationInputSchema", () => {
    it("parses minimal cancellation request", () => {
      const input: CancelSlotGenerationInput = { style_id: "style-cyberpunk" };
      const parsed = CancelSlotGenerationInputSchema.parse(input);
      assert.equal(parsed.style_id, "style-cyberpunk");
      assert.equal(parsed.batch_id, undefined);
    });

    it("parses cancellation request with batch_id and reason", () => {
      const input: CancelSlotGenerationInput = {
        style_id: "style-cyberpunk",
        batch_id: "batch-101",
        reason: "User cancelled request",
      };
      const parsed = CancelSlotGenerationInputSchema.parse(input);
      assert.equal(parsed.batch_id, "batch-101");
      assert.equal(parsed.reason, "User cancelled request");
    });

    it("rejects empty style_id", () => {
      assert.throws(() => CancelSlotGenerationInputSchema.parse({ style_id: "" }));
    });
  });

  describe("Slot Key Helpers", () => {
    it("formats canonical slot keys correctly", () => {
      assert.equal(formatMascotSlotKey("thinking", 1), "thinking_1");
      assert.equal(formatMascotSlotKey("thinking", 10), "thinking_10");
      assert.equal(formatMascotSlotKey("celebrate", 4), "celebrate_4");
      assert.equal(formatMascotSlotKey("celebrate", 10), "celebrate_10");
    });

    it("parses valid slot keys correctly", () => {
      assert.deepEqual(parseMascotSlotKey("thinking_1"), { state: "thinking", slot_index: 1 });
      assert.deepEqual(parseMascotSlotKey("celebrate_10"), { state: "celebrate", slot_index: 10 });
      assert.deepEqual(parseMascotSlotKey("  celebrate_5  "), { state: "celebrate", slot_index: 5 });
    });

    it("returns null for invalid slot keys", () => {
      assert.equal(parseMascotSlotKey("thinking_0"), null);
      assert.equal(parseMascotSlotKey("thinking_11"), null);
      assert.equal(parseMascotSlotKey("idle_1"), null);
      assert.equal(parseMascotSlotKey("celebrate_-1"), null);
      assert.equal(parseMascotSlotKey("invalid"), null);
      assert.equal(parseMascotSlotKey("thinking_abc"), null);
      assert.equal(parseMascotSlotKey(""), null);
    });
  });
});
