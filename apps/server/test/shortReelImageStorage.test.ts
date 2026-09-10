import { describe, it, expect } from "vitest";
import { packageFixture } from "./helpers/shortReelPackageFixture.js";

describe("shortReelImageStorage", () => {
  it("does not mistake a reel for an episode", async () => {
    const f = await packageFixture();
    try {
      await expect(f.repo.getBundleImagePath(f.key.channel_id, f.key.reel_id, 1, 1)).rejects.toMatchObject({ code: "EPISODE_NOT_FOUND" });
    } finally {
      await f.cleanup();
    }
  });
});
