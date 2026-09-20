import { describe, expect, it, vi } from "vitest";
import type { MascotProfile, MascotSlotProjection, MascotVideoProcessingJob } from "@studio/shared";
import { createMascotStudioActivityService } from "../src/quiz/mascot/activity/index.js";
import type { RepositoryService } from "../src/repository.js";
import type { MascotSlotJobManager } from "../src/quiz/mascot/slotJobs/index.js";
import type { MascotStyleJobManager } from "../src/quiz/mascot/styleJobs/index.js";
import type { VideoProcessingRepository } from "../src/quiz/mascot/videoAnimation/index.js";

describe("MascotStudioActivityService", () => {
  it("aggregates style, expressive-state, and animation activity across every style", async () => {
    const now = new Date().toISOString();
    const mascot: MascotProfile = {
      id: "mascot-1",
      name: "Robo Fox",
      description: "Test mascot",
      visual_style: "pixar_3d",
      master_prompt: "Robo fox",
      color_theme: "#06b6d4",
      actions: {},
      assigned_channel_ids: [],
      styles: [
        {
          id: "core",
          name: "Core Style",
          keyword: "classic",
          is_default: true,
          states: { thinking: [], celebrate: [] },
          created_at: now,
          updated_at: now,
        },
        {
          id: "cyber",
          name: "Cyber Neon Pulse",
          keyword: "neon",
          is_default: false,
          states: { thinking: [], celebrate: [] },
          created_at: now,
          updated_at: now,
        },
      ],
      created_at: now,
      updated_at: now,
    };
    const projection: MascotSlotProjection = {
      style_id: "cyber",
      state: "thinking",
      slot_index: 2,
      status: "processing",
      active_job_id: "video-job-1",
      updated_at: now,
    };
    const videoJob: MascotVideoProcessingJob = {
      id: "video-job-1",
      mascot_id: mascot.id,
      style_id: "cyber",
      state: "thinking",
      slot_index: 2,
      attempt: 1,
      source_video_url: "/source.mp4",
      source_video_fingerprint: "source-fingerprint",
      status: "processing",
      progress: 55,
      created_at: now,
      updated_at: now,
    };

    const repository = {
      getMascot: vi.fn().mockResolvedValue(mascot),
    } as unknown as RepositoryService;
    const styleJobManager = {
      getBatchStatus: vi.fn().mockResolvedValue({
        active_batch: null,
        queued_style_ids: [],
        active_style_ids: [],
        recent_batches: [],
      }),
    } as unknown as MascotStyleJobManager;
    const slotJobManager = {
      getBatchStatus: vi.fn().mockImplementation(async (_mascotId: string, styleId: string) => ({
        active_batch:
          styleId === "cyber"
            ? {
                id: "slot-batch-1",
                mascot_id: mascot.id,
                style_id: "cyber",
                status: "processing",
                total_slots: 3,
                completed_count: 1,
                failed_count: 0,
                active_slot_keys: ["thinking_2"],
                items: [],
                created_at: now,
                updated_at: now,
              }
            : null,
        queued_slot_keys: [],
        active_slot_keys: styleId === "cyber" ? ["thinking_2"] : [],
        recent_batches: [],
      })),
    } as unknown as MascotSlotJobManager;
    const videoProcessingRepository = {
      listSlotProjections: vi
        .fn()
        .mockImplementation(async (_mascotId: string, styleId: string) => (styleId === "cyber" ? [projection] : [])),
      getJob: vi.fn().mockResolvedValue(videoJob),
    } as unknown as VideoProcessingRepository;

    const service = createMascotStudioActivityService({
      repository,
      styleJobManager,
      slotJobManager,
      videoProcessingRepository,
    });
    const status = await service.getStatus(mascot.id);

    expect(status.styles).toHaveLength(2);
    expect(status.styles.find((style) => style.style_id === "cyber")?.slot_generation.active_batch?.id).toBe("slot-batch-1");
    expect(status.styles.find((style) => style.style_id === "cyber")?.animation_jobs).toEqual([videoJob]);
    expect(status.warnings).toEqual([]);
  });
});
