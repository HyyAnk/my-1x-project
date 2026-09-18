import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MascotProfile, MascotStateVariant } from "@studio/shared";
import { MascotGenerationQueue } from "./MascotGenerationQueue";
import { api } from "../../../api";

const mockMascot: MascotProfile = {
  id: "mascot-queue-test",
  name: "Test Mascot",
  description: "A test mascot",
  visual_style: "pixar_3d",
  master_prompt: "A cute test mascot",
  master_image_url: "https://example.com/master.png",
  color_theme: "#3b82f6",
  actions: {},
  assigned_channel_ids: [],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function createMockSlotResponse(mascot: MascotProfile, promptUsed = "Mock prompt"): {
  mascot: MascotProfile;
  slot: MascotStateVariant;
  prompt_used: string;
} {
  return {
    mascot,
    slot: {
      id: "slot_1",
      slot_index: 1,
      image_url: "https://example.com/slot.png",
      motion_preset: "breathe",
      motion_speed: 1,
      motion_intensity: "normal",
      created_at: "2026-01-01T00:00:00.000Z",
    },
    prompt_used: promptUsed,
  };
}

describe("MascotGenerationQueue", () => {
  let callbacks: {
    onBusySlotChange: ReturnType<typeof vi.fn>;
    onQueuedKeysChange: ReturnType<typeof vi.fn>;
    onProgressChange: ReturnType<typeof vi.fn>;
    onMascotUpdated: ReturnType<typeof vi.fn>;
    onNotice: ReturnType<typeof vi.fn>;
    getLatestMascot: ReturnType<typeof vi.fn>;
  };
  let queue: MascotGenerationQueue;

  beforeEach(() => {
    vi.restoreAllMocks();
    callbacks = {
      onBusySlotChange: vi.fn(),
      onQueuedKeysChange: vi.fn(),
      onProgressChange: vi.fn(),
      onMascotUpdated: vi.fn(),
      onNotice: vi.fn(),
      getLatestMascot: vi.fn().mockReturnValue(mockMascot),
    };
    queue = new MascotGenerationQueue(callbacks);
  });

  describe("Single slot queue", () => {
    it("enqueues and processes single slot generation successfully", async () => {
      const updatedMascot: MascotProfile = {
        ...mockMascot,
        updated_at: "2026-01-02T00:00:00.000Z",
      };

      vi.spyOn(api, "generateMascotStyleSlot").mockResolvedValue(
        createMockSlotResponse(updatedMascot, "Thinking with hand on chin"),
      );

      await queue.enqueueSlot("core", "thinking", 1, "custom modifier");

      expect(api.generateMascotStyleSlot).toHaveBeenCalledWith(
        "mascot-queue-test",
        "core",
        {
          style_id: "core",
          state: "thinking",
          slot_index: 1,
          prompt_modifier: "custom modifier",
          composition: "half_body_16_9",
        },
      );
      expect(callbacks.onMascotUpdated).toHaveBeenCalledWith(updatedMascot);
      expect(callbacks.onNotice).toHaveBeenCalledWith({
        tone: "good",
        message: 'Slot 1 (thinking) generated: "Thinking with hand on chin"',
      });
      expect(callbacks.onBusySlotChange).toHaveBeenLastCalledWith(null);
    });

    it("deduplicates redundant slot enqueue requests", async () => {
      vi.spyOn(api, "generateMascotStyleSlot").mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(createMockSlotResponse(mockMascot)), 50)),
      );

      const p1 = queue.enqueueSlot("core", "thinking", 2);
      const p2 = queue.enqueueSlot("core", "thinking", 2);

      await Promise.all([p1, p2]);
      expect(api.generateMascotStyleSlot).toHaveBeenCalledTimes(1);
    });

    it("reports error notice when api call fails", async () => {
      vi.spyOn(api, "generateMascotStyleSlot").mockRejectedValue(new Error("Generation rate limit"));

      await queue.enqueueSlot("core", "celebrate", 1);

      expect(callbacks.onNotice).toHaveBeenCalledWith({
        tone: "bad",
        message: "Generation rate limit",
      });
      expect(callbacks.onBusySlotChange).toHaveBeenLastCalledWith(null);
    });
  });

  describe("Batch generation", () => {
    it("executes batch slot generation across workers and reports completion notice", async () => {
      vi.spyOn(api, "generateMascotStyleSlot").mockResolvedValue(
        createMockSlotResponse(mockMascot),
      );

      const slotsToGenerate = [
        { state: "thinking" as const, slotIndex: 1 },
        { state: "thinking" as const, slotIndex: 2 },
        { state: "celebrate" as const, slotIndex: 1 },
      ];

      await queue.runBatchGeneration({
        mascot: mockMascot,
        targetStyleId: "core",
        slotsToGenerate,
        stateFilter: "all",
      });

      expect(api.generateMascotStyleSlot).toHaveBeenCalledTimes(3);
      expect(callbacks.onNotice).toHaveBeenCalledWith({
        tone: "good",
        message: "Batch generation complete (3/3 slots generated)",
      });
      expect(callbacks.onBusySlotChange).toHaveBeenLastCalledWith(null);
    });

    it("supports stopping batch generation mid-execution", async () => {
      vi.spyOn(api, "generateMascotStyleSlot").mockImplementation(() => {
        queue.stopBatch();
        return Promise.resolve(createMockSlotResponse(mockMascot));
      });

      const slotsToGenerate = [
        { state: "thinking" as const, slotIndex: 1 },
        { state: "thinking" as const, slotIndex: 2 },
        { state: "thinking" as const, slotIndex: 3 },
        { state: "thinking" as const, slotIndex: 4 },
      ];

      await queue.runBatchGeneration({
        mascot: mockMascot,
        targetStyleId: "core",
        slotsToGenerate,
        stateFilter: "thinking",
      });

      expect(callbacks.onNotice).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: "good",
           
          message: expect.stringContaining("Batch generation stopped"),
        }),
      );
    });
  });
});
