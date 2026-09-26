import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { createVideoSlotStore } from "../../src/quiz/mascot/videoAnimation/repository/videoSlotStore.js";
import { recoverInterruptedSlot } from "../../src/quiz/mascot/videoAnimation/repository/interruptedSlotRecovery.js";

it("recovers both orphaned slots after restart, persists recovery, and leaves current work untouched", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "slot-restart-"));
  try {
    const original = createVideoSlotStore(root);
    for (const slot of [1, 2]) {
      await original.transitionSlotState("m1", "core", "celebrate", slot, "uploading");
      await original.transitionSlotState("m1", "core", "celebrate", slot, "processing", `job-${slot}`);
    }
    expect((await original.getSlotProjection("m1", "core", "celebrate", 1)).status).toBe("processing");
    const restarted = createVideoSlotStore(root);
    const slots = await Promise.all([1, 2].map((slot) => restarted.getSlotProjection("m1", "core", "celebrate", slot)));
    for (const slot of slots) {
      expect(slot.status).toBe("failed");
      expect(slot.active_job_id).toBeNull();
      expect(slot.error_code).toBe("PROCESSING_INTERRUPTED");
    }
    const again = createVideoSlotStore(root);
    expect((await again.getSlotProjection("m1", "core", "celebrate", 2)).status).toBe("failed");
    await restarted.transitionSlotState("m1", "core", "celebrate", 1, "retrying", "new-job");
    expect((await restarted.getSlotProjection("m1", "core", "celebrate", 1)).status).toBe("retrying");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("preserves approved revisions and source videos while recovering all interrupted lifecycle states", () => {
  for (const status of ["uploading", "queued", "processing", "retrying", "replacing"] as const) {
    const recovered = recoverInterruptedSlot({
      style_id: "core",
      state: "thinking",
      slot_index: 1,
      status,
      active_job_id: "old-job",
      active_revision_id: "approved",
      active_attempt: 2,
      source_video_url: "/source.mp4",
      updated_at: new Date().toISOString(),
    });
    expect(recovered.status).toBe("ready");
    expect(recovered.active_revision_id).toBe("approved");
    expect(recovered.source_video_url).toBe("/source.mp4");
    expect(recovered.active_attempt).toBe(2);
  }
});
