import { afterEach, describe, expect, it } from "vitest";
import { BrandIdentityExportSchema, synthesizeLegacyCoreStyle } from "@studio/shared";
import { createTestApp, createTestImageBuffer, setupTestChannelWithMascot } from "./channelAssetsTestHelpers.js";
import { parseZipArchive } from "../src/quiz/zipHelper.js";

describe("Brand identity export", () => {
  let cleanup: (() => Promise<void>) | undefined;
  afterEach(async () => {
    await cleanup?.();
  });

  async function fixture() {
    const created = await createTestApp();
    cleanup = created.cleanup;
    const { app } = created;
    const { channel, mascot } = await setupTestChannelWithMascot(app);
    const image = await createTestImageBuffer(8, 8, { r: 32, g: 64, b: 128, alpha: 0.5 });
    const logo = await createTestImageBuffer(8, 8);
    await app.repository.storeBrandLogo(channel.slug, logo, "image/png", "logo.png");
    const url = await app.repository.saveMascotAsset(mascot.id, "style.png", image);
    const opaque = await app.repository.saveMascotAsset(mascot.id, "opaque.png", logo);
    const core = synthesizeLegacyCoreStyle(mascot);
    await app.repository.saveMascot({
      ...mascot,
      styles: [
        { ...core, id: "one", name: "First Style", anchor_image_url: url },
        { ...core, id: "two", name: "Second Style", anchor_image_url: url },
        { ...core, id: "opaque", name: "Opaque Style", anchor_image_url: opaque },
        { ...core, id: "missing", name: "Missing Style", anchor_image_url: null },
      ],
    });
    return { app, channel, logo };
  }

  it("exports every transparent style and the original logo, with explicit skipped warnings", async () => {
    const { app, channel, logo } = await fixture();
    const res = await app.server.inject(`/api/channels/${channel.channel_id}/assets/identity-export`);
    expect(res.statusCode).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    const bundle = BrandIdentityExportSchema.parse(res.json());
    expect(bundle.files.map((file) => file.filename)).toEqual([
      "logo.png",
      expect.stringMatching(/^mascot-\d+-First-Style.png$/),
      expect.stringMatching(/^mascot-\d+-Second-Style.png$/),
    ]);
    expect(Buffer.from(bundle.files[0].base64, "base64")).toEqual(logo);
    expect(bundle.warnings.length).toBeGreaterThanOrEqual(2);
    expect(bundle.warnings.join(" ")).toContain("Opaque Style");
  });

  it("builds a ZIP with the same identity-only files", async () => {
    const { app, channel } = await fixture();
    const res = await app.server.inject(`/api/channels/${channel.channel_id}/assets/identity-export?format=zip`);
    const bundle = BrandIdentityExportSchema.parse(res.json());
    const entries = parseZipArchive(Buffer.from(bundle.files[0].base64, "base64"));
    expect(entries.map((entry) => entry.filename)).toEqual([
      "logo.png",
      expect.stringMatching(/^mascot-\d+-First-Style.png$/),
      expect.stringMatching(/^mascot-\d+-Second-Style.png$/),
    ]);
  });

  it("rejects empty exports and invalid formats", async () => {
    const created = await createTestApp();
    cleanup = created.cleanup;
    const channel = await created.app.repository.createChannel({ name: "Empty Identity", target_audience: "family" });
    const url = `/api/channels/${channel.channel_id}/assets/identity-export`;
    expect((await created.app.server.inject(url)).statusCode).toBe(409);
    expect((await created.app.server.inject(`${url}?format=other`)).statusCode).toBe(400);
    expect((await created.app.server.inject("/api/channels/missing/assets/identity-export")).statusCode).toBe(404);
  });
});
