import { describe, expect, it } from "vitest";
import type { MascotStudioActivityStatusResponse } from "@studio/shared";
import { mapMascotStudioActivities } from "./mascotStudioActivityMapper";

function createResponse(): MascotStudioActivityStatusResponse {
  const now = new Date().toISOString();
  return {
    mascot_id: "mascot-1",
    checked_at: now,
    warnings: [],
    style_concepts: {
      active_batch: {
        id: "style-batch-1",
        mascot_id: "mascot-1",
        status: "processing",
        total_styles: 4,
        completed_count: 1,
        failed_count: 1,
        active_style_ids: ["cyber"],
        items: [],
        created_at: now,
        updated_at: now,
      },
      queued_style_ids: ["comic"],
      active_style_ids: ["cyber"],
    },
    styles: [
      {
        style_id: "cyber",
        style_name: "Cyber Neon Pulse",
        slot_generation: {
          active_batch: {
            id: "slot-batch-1",
            mascot_id: "mascot-1",
            style_id: "cyber",
            status: "processing",
            total_slots: 10,
            completed_count: 3,
            failed_count: 1,
            active_slot_keys: ["thinking_4"],
            items: [],
            created_at: now,
            updated_at: now,
          },
          queued_slot_keys: ["thinking_5"],
          active_slot_keys: ["thinking_4"],
        },
        animation_jobs: [
          {
            id: "animation-job-1",
            mascot_id: "mascot-1",
            style_id: "cyber",
            state: "thinking",
            slot_index: 2,
            attempt: 1,
            source_video_url: "/source.mp4",
            source_video_fingerprint: "source-fingerprint",
            status: "processing",
            progress: 47,
            created_at: now,
            updated_at: now,
          },
        ],
      },
    ],
  };
}

describe("mapMascotStudioActivities", () => {
  it("maps every active Mascot Studio process with real progress", () => {
    const activities = mapMascotStudioActivities(createResponse());

    expect(activities).toHaveLength(3);
    expect(activities.find((item) => item.kind === "style_concepts")?.percentage).toBe(50);
    expect(activities.find((item) => item.kind === "expressive_states")).toMatchObject({
      styleId: "cyber",
      percentage: 40,
      failed: 1,
      isActive: true,
    });
    expect(activities.find((item) => item.kind === "animation_processing")).toMatchObject({
      styleId: "cyber",
      slotIndex: 2,
      percentage: 47,
      isActive: true,
    });
  });

  it("keeps a recent terminal batch visible after reload", () => {
    const response = createResponse();
    const completedAt = new Date(Date.now() - 5_000).toISOString();
    response.style_concepts.active_batch = null;
    response.style_concepts.recent_batches = [
      {
        id: "style-batch-complete",
        mascot_id: "mascot-1",
        status: "failed",
        total_styles: 3,
        completed_count: 2,
        failed_count: 1,
        active_style_ids: [],
        items: [],
        created_at: completedAt,
        updated_at: completedAt,
      },
    ];

    const activity = mapMascotStudioActivities(response).find((item) => item.kind === "style_concepts");
    expect(activity).toMatchObject({ status: "partial", percentage: 100, isActive: false });
  });
});
