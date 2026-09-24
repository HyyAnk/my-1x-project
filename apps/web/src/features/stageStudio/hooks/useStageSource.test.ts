import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChannelSchema, type AppConfig, RECOMMENDED_MASCOT_PLACEMENT_PRESET } from "@studio/shared";
import { api } from "../../../api";
import { useStageSource } from "./useStageSource";
import { notifyStageSourceChanged } from "../services/stageSourceEvents";

const channels = [
  ChannelSchema.parse({
    channel_id: "source",
    slug: "source",
    display_name: "Source",
    channel_dna_path: "dna.md",
    created_at: "2026-09-23T00:00:00.000Z",
    updated_at: "2026-09-23T00:00:00.000Z",
    status: "ACTIVE",
    mascot_id: "fox",
  }),
];

afterEach(() => vi.restoreAllMocks());

describe("Stage Studio source synchronization", () => {
  it("refreshes saved assignments and rejects an out-of-order response", async () => {
    let finishOld!: (value: { channels: typeof channels }) => void;
    vi.spyOn(api, "channels")
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockResolvedValue({ channels: [{ ...channels[0], mascot_id: "owl" }] });
    const { result } = renderHook(() => useStageSource(channels, false));
    await act(async () => notifyStageSourceChanged());
    await waitFor(() => expect(result.current.channels[0].mascot_id).toBe("owl"));
    await act(async () => finishOld({ channels }));
    expect(result.current.channels[0].mascot_id).toBe("owl");
  });

  it("reports errors, preserves confirmed data, and recovers on retry", async () => {
    vi.spyOn(api, "channels").mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ channels });
    vi.spyOn(api, "config").mockResolvedValue({ mascot_stage: { default_placement: RECOMMENDED_MASCOT_PLACEMENT_PRESET } } as AppConfig);
    const { result } = renderHook(() => useStageSource(channels));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.channels).toEqual(channels);
    await act(async () => result.current.refresh());
    expect(result.current.error).toBeNull();
    expect(result.current.defaultPlacement).toEqual(RECOMMENDED_MASCOT_PLACEMENT_PRESET);
  });
});
