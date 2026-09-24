import { describe, expect, it, vi } from "vitest";
import { ChannelSchema, SandboxPreviewInputBaseSchema, RECOMMENDED_MASCOT_PLACEMENT_PRESET } from "@studio/shared";
import { resolvePreviewStageSource } from "../src/routes/quizV2/resolvePreviewStageSource.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const placement = { position: "bottom_right" as const, scale: 4.2, offset_x: -20, offset_y: 240, flip_x: true };
const channel = ChannelSchema.parse({
  channel_id: "source",
  slug: "source",
  display_name: "Source",
  channel_dna_path: "dna.md",
  created_at: "2026-09-23T00:00:00.000Z",
  updated_at: "2026-09-23T00:00:00.000Z",
  status: "ACTIVE",
  mascot_id: "assigned",
  mascot_config: { enabled: true, placements: { "16:9": placement }, show_in_intro: false },
});

describe("confirmed Stage Studio preview source", () => {
  function dependencies() {
    const getChannel = vi.fn().mockResolvedValue(channel);
    // The resolver only needs this repository read operation.
    return { repository: { getChannel }, state: { config: DEFAULT_CONFIG } };
  }

  it("uses the shared 366 percent default for every unassigned mascot", async () => {
    for (const mascot_id of ["fox", "owl", "cat"]) {
      const result = await resolvePreviewStageSource(
        SandboxPreviewInputBaseSchema.parse({
          mascot_id,
          mascot_placement_source: "stage_default",
          mascot_scale: 0.5,
          mascot_offset_x: 999,
        }),
        dependencies(),
      );
      expect(result).toMatchObject({ mascot_id, mascot_scale: 3.66, mascot_offset_x: 115, mascot_offset_y: 180 });
    }
    expect(RECOMMENDED_MASCOT_PLACEMENT_PRESET.scale).toBe(3.66);
  });

  it("ignores stale caller transforms and mascot identity for a channel source", async () => {
    const result = await resolvePreviewStageSource(
      SandboxPreviewInputBaseSchema.parse({
        mascot_placement_source: "channel",
        mascot_channel_id: "source",
        mascot_id: "stale",
        mascot_scale: 0.5,
        mascot_offset_x: 999,
        mascot_offset_y: 999,
      }),
      dependencies(),
    );
    expect(result).toMatchObject({
      mascot_id: "assigned",
      mascot_scale: 4.2,
      mascot_offset_x: -20,
      mascot_offset_y: 240,
      mascot_position: "bottom_right",
      mascot_flip_x: true,
      mascot_show_in_intro: false,
    });
  });

  it("keeps unsaved Stage Studio draft transforms", async () => {
    const input = SandboxPreviewInputBaseSchema.parse({ mascot_scale: 2, mascot_offset_x: 7 });
    expect(await resolvePreviewStageSource(input, dependencies())).toBe(input);
  });

  it("does not fall back silently when an assignment source is missing", async () => {
    await expect(
      resolvePreviewStageSource(SandboxPreviewInputBaseSchema.parse({ mascot_placement_source: "channel" }), dependencies()),
    ).rejects.toThrow("Select a Stage Studio channel source");
    const deps = dependencies();
    deps.repository.getChannel.mockRejectedValue(new Error("Channel unavailable"));
    await expect(
      resolvePreviewStageSource(
        SandboxPreviewInputBaseSchema.parse({ mascot_placement_source: "channel", mascot_channel_id: "gone" }),
        deps,
      ),
    ).rejects.toThrow("Channel unavailable");
  });
});
