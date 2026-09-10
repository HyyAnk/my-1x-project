import { describe, expect, it } from "vitest";
import { parseZipArchive } from "../src/quiz/zipHelper.js";
import { generateFullReelPackage } from "../src/shortReel/packageService.js";
import { attachMascotWithStyle, buildTestApp, createTestChannel, createTestReel, createTestRoot } from "./shortReelRoutesTestUtils.js";

describe("Short-Reel HTTP Routes and Confirmation Discrimination", () => {
  describe("HTTP-01 through HTTP-05: Phase 06 Endpoint Behaviors", () => {
    it("HTTP-01: rejects cross-channel access, invalid IDs/body, and non-existent records with typed status codes", async () => {
      const root = await createTestRoot();
      const app = await buildTestApp(root);

      try {
        const { channel: channelA, reel } = await createTestReel(app);
        const channelB = await createTestChannel(app, "Channel B");

        // Cross-channel access to reel belongs to channel A through channel B path -> 404
        const crossChannelRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channelB.channel_id}/short-reels/${reel.reel_id}`,
        });
        expect(crossChannelRes.statusCode).toBe(404);
        const crossJson = crossChannelRes.json<{ error?: string; stack?: string }>();
        expect(crossJson.error).toBeDefined();
        expect(crossJson.stack).toBeUndefined();

        // Non-existent reel ID -> 404
        const notFoundRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channelA.channel_id}/short-reels/non-existent-reel`,
        });
        expect(notFoundRes.statusCode).toBe(404);

        // Malformed PATCH body -> 400
        const badPatchRes = await app.server.inject({
          method: "PATCH",
          url: `/api/channels/${channelA.channel_id}/short-reels/${reel.reel_id}`,
          payload: { invalid_field: 123 },
        });
        expect(badPatchRes.statusCode).toBe(400);

        // Invalid export revision query param -> 400
        const badExportRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channelA.channel_id}/short-reels/${reel.reel_id}/export?revision=invalid`,
        });
        expect(badExportRes.statusCode).toBe(400);

        // Export with non-ready package units -> 422
        const unreadyExportRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channelA.channel_id}/short-reels/${reel.reel_id}/export?revision=1`,
        });
        expect(unreadyExportRes.statusCode).toBe(422);
      } finally {
        await app.close();
      }
    });

    it("HTTP-02: exports ready package returning 200 with ZIP binary and correct headers", async () => {
      const root = await createTestRoot();
      const app = await buildTestApp(root);

      try {
        const { channel, reel } = await createTestReel(app);
        await attachMascotWithStyle(app, channel.channel_id, "Route Export Mascot");

        const providerPath = `${root}/provider.png`;
        const { packageImage } = await import("./helpers/shortReelPackageFixture.js");
        const { writeFile } = await import("node:fs/promises");
        await writeFile(providerPath, await packageImage());

        const ready = await generateFullReelPackage(
          app.repository,
          {
            channel_id: channel.channel_id,
            reel_id: reel.reel_id,
          },
          {
            coverOptions: { imageProvider: { generateReference: () => Promise.resolve({ asset_path: providerPath }) } },
          },
        );
        expect(ready.units.script.state).toBe("ready");

        const exportRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/export?revision=${ready.revision}`,
        });

        expect(exportRes.statusCode).toBe(200);
        expect(exportRes.headers["content-type"]).toBe("application/zip");
        expect(exportRes.headers["content-disposition"]).toBe(`attachment; filename="short-reel-${reel.reel_id}-rev${ready.revision}.zip"`);

        const zipBuffer = exportRes.rawPayload;
        const entries = parseZipArchive(zipBuffer);
        expect(entries.length).toBeGreaterThanOrEqual(11);
        expect(entries.some((e) => e.filename === "manifest.json")).toBe(true);
        expect(entries.some((e) => e.filename === "publishing.json")).toBe(true);
        expect(entries.some((e) => e.filename === "publishing.txt")).toBe(true);

        // Stale revision query param returns 409
        const staleRes = await app.server.inject({
          method: "GET",
          url: `/api/channels/${channel.channel_id}/short-reels/${reel.reel_id}/export?revision=${ready.revision + 99}`,
        });
        expect(staleRes.statusCode).toBe(409);
      } finally {
        await app.close();
      }
    });
  });
});
