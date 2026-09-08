import { describe, expect, it } from "vitest";
import { buildDecoupledChannelMascotConfig } from "./useStageSaveAction";

describe("buildDecoupledChannelMascotConfig", () => {
  it("serializes only the active landscape placement", () => {
    const placement = { position: "bottom_right" as const, scale: 1.5, offset_x: 20, offset_y: 30, flip_x: true };
    const config = buildDecoupledChannelMascotConfig({ activePlacement: placement });
    expect(config.placements).toEqual({ "16:9": placement });
    expect(config).toMatchObject({
      position: placement.position,
      scale: placement.scale,
      offset_x: placement.offset_x,
      offset_y: placement.offset_y,
      flip_x: placement.flip_x,
    });
  });
});
