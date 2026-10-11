import { describe, expect, it } from "vitest";
import { dedupeAssetLocalizer } from "../src/tasks/video/mascotAssetDiskCopier.js";

const STATIC_URL = "/api/mascots/m1/assets/style_core_celebrate_slot2.png";

function countingLocalizer() {
  const calls: string[] = [];
  const localizer = dedupeAssetLocalizer(async (url) => {
    calls.push(url ?? "");
    await new Promise((resolve) => setTimeout(resolve, 5));
    return `./mascot-assets/${url?.split("/").pop()}`;
  });
  return { calls, localizer };
}

describe("mascot asset localizer dedupe", () => {
  it("copies a file named as both image and transparent image only once", async () => {
    const { calls, localizer } = countingLocalizer();
    const context = { styleId: "core", state: "celebrate", slotIndex: 2 };
    const [image, transparent] = await Promise.all([localizer(STATIC_URL, context), localizer(STATIC_URL, context)]);
    expect(image).toBe("./mascot-assets/style_core_celebrate_slot2.png");
    expect(transparent).toBe(image);
    expect(calls).toHaveLength(1);
  });

  it("shares a static asset across slots with different contexts", async () => {
    const { calls, localizer } = countingLocalizer();
    await Promise.all([localizer(STATIC_URL, { slotIndex: 1 }), localizer(STATIC_URL, { slotIndex: 2 })]);
    expect(calls).toHaveLength(1);
  });

  it("keeps animation artifacts apart per slot context", async () => {
    const { calls, localizer } = countingLocalizer();
    const url = "/api/mascots/m1/styles/core/animations/a1/v1/artifacts/clip.webm";
    await Promise.all([localizer(url, { slotIndex: 1 }), localizer(url, { slotIndex: 2 })]);
    expect(calls).toHaveLength(2);
  });

  it("resolves missing urls without calling the copier", async () => {
    const { calls, localizer } = countingLocalizer();
    expect(await localizer(undefined)).toBeUndefined();
    expect(calls).toHaveLength(0);
  });
});
