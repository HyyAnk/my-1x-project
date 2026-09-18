import { describe, expect, it } from "vitest";
import {
  createBatchOutcomeNotice,
  createSlotErrorNotice,
  createSlotSuccessNotice,
  createReconnectedNotice,
  createCatchUpCompletedNotice,
} from "./mascotQueueNotices";

describe("mascotQueueNotices", () => {
  describe("createSlotSuccessNotice", () => {
    it("formats notice with prompt when promptUsed is provided", () => {
      const notice = createSlotSuccessNotice(2, "thinking", "Examining blueprint");
      expect(notice.tone).toBe("good");
      expect(notice.message).toBe('Slot 2 (thinking) generated: "Examining blueprint"');
    });

    it("formats notice without prompt when promptUsed is empty or omitted", () => {
      const notice = createSlotSuccessNotice(3, "celebrate");
      expect(notice.tone).toBe("good");
      expect(notice.message).toBe("Slot 3 (celebrate) generated successfully");
    });
  });

  describe("createSlotErrorNotice", () => {
    it("formats error message from Error instance", () => {
      const notice = createSlotErrorNotice("thinking", new Error("Timeout occurred"));
      expect(notice.tone).toBe("bad");
      expect(notice.message).toBe("Timeout occurred");
    });

    it("formats default error message when error has no message", () => {
      const notice = createSlotErrorNotice("celebrate", {});
      expect(notice.tone).toBe("bad");
      expect(notice.message).toBe("Failed to generate celebrate slot");
    });
  });

  describe("createBatchOutcomeNotice", () => {
    it("returns stopped notice when batch is aborted", () => {
      const notice = createBatchOutcomeNotice(true, 4, 0, 10);
      expect(notice.tone).toBe("good");
      expect(notice.message).toBe("Batch generation stopped (4/10 slots generated)");
    });

    it("returns complete notice when all slots succeed without failure", () => {
      const notice = createBatchOutcomeNotice(false, 10, 0, 10);
      expect(notice.tone).toBe("good");
      expect(notice.message).toBe("Batch generation complete (10/10 slots generated)");
    });

    it("returns partial failure notice when some slots failed", () => {
      const notice = createBatchOutcomeNotice(false, 7, 3, 10);
      expect(notice.tone).toBe("good");
      expect(notice.message).toBe("Batch generation finished: 7/10 slots generated (3 failed)");
    });

    it("returns total failure notice when completed count is 0", () => {
      const notice = createBatchOutcomeNotice(false, 0, 5, 5);
      expect(notice.tone).toBe("bad");
      expect(notice.message).toBe("Batch generation failed: all 5 slots failed");
    });
  });

  describe("createReconnectedNotice", () => {
    it("formats reconnected notice correctly", () => {
      const notice = createReconnectedNotice(3, 10, 2);
      expect(notice.tone).toBe("neutral");
      expect(notice.message).toBe(
        "Reconnected to background generation: 3/10 slots completed (2 active streams)",
      );
    });
  });

  describe("createCatchUpCompletedNotice", () => {
    it("formats catch up completed notice correctly", () => {
      const notice = createCatchUpCompletedNotice(10, 10);
      expect(notice.tone).toBe("good");
      expect(notice.message).toBe(
        "Background generation completed while you were away: 10/10 poses generated successfully.",
      );
    });
  });
});
