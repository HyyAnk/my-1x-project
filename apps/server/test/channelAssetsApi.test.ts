import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  BrandAssetItem,
  ChannelAssetsOverviewResponse,
  ChannelAssetMutationResponse,
  ChannelAssetDeleteResponse,
} from "@studio/shared";
import type { StudioApp } from "../src/app.js";
import { parseZipArchive } from "../src/quiz/zipHelper.js";
import {
  createTestApp,
  createTestImageBase64,
  setupTestChannelWithMascot,
} from "./channelAssetsTestHelpers.js";

describe("Channel Assets API Integration Endpoints", () => {
  let app: StudioApp;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const created = await createTestApp();
    app = created.app;
    cleanup = created.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it("GET /api/channels/:channelId/assets returns manifest and assigned mascot summary", async () => {
    const { channel, mascot } = await setupTestChannelWithMascot(app, "Cosmic Physics");
    const res = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channel.channel_id}/assets`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<ChannelAssetsOverviewResponse>();
    expect(body.channel_id).toBe(channel.channel_id);
    expect(body.channel_slug).toBe(channel.slug);
    expect(body.mascot).toEqual({
      mascot_id: mascot.id,
      name: mascot.name,
      master_image_url: mascot.master_image_url,
    });
    expect(body.manifest.brand).toBeDefined();
    expect(body.manifest.social.youtube).toBeDefined();
  });

  it("GET /api/channels/:channelId/assets returns 404 for unknown channel", async () => {
    const res = await app.server.inject({
      method: "GET",
      url: "/api/channels/non_existent_channel_id/assets",
    });
    expect(res.statusCode).toBe(404);
  });

  it("handles brand logo upload, serving, and deletion", async () => {
    const { channel } = await setupTestChannelWithMascot(app, "Logo Test Channel");
    const imageBase64 = await createTestImageBase64(400, 400);

    const uploadRes = await app.server.inject({
      method: "POST",
      url: `/api/channels/${channel.channel_id}/assets/brand/logo`,
      payload: { image_data: imageBase64, filename: "brand_logo.png" },
    });
    expect(uploadRes.statusCode).toBe(200);
    const uploadBody = uploadRes.json<ChannelAssetMutationResponse>();
    expect(uploadBody.asset.filename).toBe("brand_logo.png");
    expect(uploadBody.asset.width).toBe(400);
    expect(uploadBody.asset.url).toMatch(/^\/api\/channels\/[^/]+\/assets\/file\/brand\//);

    const fileRes = await app.server.inject({ method: "GET", url: uploadBody.asset.url! });
    expect(fileRes.statusCode).toBe(200);
    expect(fileRes.headers["content-type"]).toBe("image/png");
    const etag = fileRes.headers["etag"] as string;

    const cachedRes = await app.server.inject({
      method: "GET",
      url: uploadBody.asset.url!,
      headers: { "if-none-match": etag },
    });
    expect(cachedRes.statusCode).toBe(304);

    const deleteRes = await app.server.inject({
      method: "DELETE",
      url: `/api/channels/${channel.channel_id}/assets/brand/logo`,
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json<ChannelAssetDeleteResponse>().ok).toBe(true);

    const manifestRes = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channel.channel_id}/assets`,
    });
    expect(manifestRes.json<ChannelAssetsOverviewResponse>().manifest.brand.logo).toBeUndefined();
  });

  it("handles social assets for YouTube and X", async () => {
    const { channel } = await setupTestChannelWithMascot(app, "Social Test Channel");
    const avatarBase64 = await createTestImageBase64(800, 800);
    const bannerBase64 = await createTestImageBase64(1280, 720);

    const ytAvatarRes = await app.server.inject({
      method: "POST",
      url: `/api/channels/${channel.channel_id}/assets/social/youtube/avatar`,
      payload: { image_data: avatarBase64 },
    });
    expect(ytAvatarRes.statusCode).toBe(200);
    expect(ytAvatarRes.json<ChannelAssetMutationResponse>().asset.url).toContain("/assets/file/social/youtube/");

    const xBannerRes = await app.server.inject({
      method: "POST",
      url: `/api/channels/${channel.channel_id}/assets/social/x/banner`,
      payload: { image_data: bannerBase64 },
    });
    expect(xBannerRes.statusCode).toBe(200);
    expect(xBannerRes.json<ChannelAssetMutationResponse>().asset.url).toContain("/assets/file/social/x/");

    const deleteYtAvatar = await app.server.inject({
      method: "DELETE",
      url: `/api/channels/${channel.channel_id}/assets/social/youtube/avatar`,
    });
    expect(deleteYtAvatar.statusCode).toBe(200);
    expect(deleteYtAvatar.json<ChannelAssetDeleteResponse>().manifest.social.youtube?.avatar).toBeUndefined();
  });

  it("handles social art upload, list, and deletion", async () => {
    const { channel } = await setupTestChannelWithMascot(app, "Art Gallery Channel");
    const artBase64 = await createTestImageBase64(1920, 1080);

    const uploadRes = await app.server.inject({
      method: "POST",
      url: `/api/channels/${channel.channel_id}/assets/art`,
      payload: { image_data: artBase64, caption: "Deep Space Nebula Artwork", filename: "space.png" },
    });
    expect(uploadRes.statusCode).toBe(200);
    const artAsset = uploadRes.json<ChannelAssetMutationResponse>().asset;
    expect(artAsset.filename).toBe("space.png");

    const deleteRes = await app.server.inject({
      method: "DELETE",
      url: `/api/channels/${channel.channel_id}/assets/art/${artAsset.id}`,
    });
    expect(deleteRes.statusCode).toBe(200);

    const deleteNotFound = await app.server.inject({
      method: "DELETE",
      url: `/api/channels/${channel.channel_id}/assets/art/non_existent_id`,
    });
    expect(deleteNotFound.statusCode).toBe(404);
  });

  it("blocks path traversal and returns 404 for missing asset files", async () => {
    const { channel } = await setupTestChannelWithMascot(app, "Security Channel");

    const traversalRes = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channel.channel_id}/assets/file/%2e%2e%2f%2e%2e%2fpackage.json`,
    });
    expect(traversalRes.statusCode).toBe(403);

    const missingRes = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channel.channel_id}/assets/file/brand/missing_file.png`,
    });
    expect(missingRes.statusCode).toBe(404);
  });

  it("exports all channel assets in a zip archive", async () => {
    const { channel } = await setupTestChannelWithMascot(app, "Export Channel");
    const logoBase64 = await createTestImageBase64(256, 256);
    await app.server.inject({
      method: "POST",
      url: `/api/channels/${channel.channel_id}/assets/brand/logo`,
      payload: { image_data: logoBase64, filename: "logo.png" },
    });

    const exportRes = await app.server.inject({
      method: "GET",
      url: `/api/channels/${channel.channel_id}/assets/export-zip`,
    });
    expect(exportRes.statusCode).toBe(200);
    expect(exportRes.headers["content-type"]).toBe("application/zip");
    expect(exportRes.headers["content-disposition"]).toContain(`${channel.slug}-brand-kit.zip`);

    const zipBuffer = exportRes.rawPayload;
    const entries = parseZipArchive(zipBuffer);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries.some((e) => e.filename === "manifest.json")).toBe(true);
    expect(entries.some((e) => e.filename.startsWith("brand/"))).toBe(true);
  });
});
