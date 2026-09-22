import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { channelAssetsApi } from "./channelAssetsApi";
import { api, ApiError } from "../api";
import type {
  ChannelAssetDeleteResponse,
  ChannelAssetMutationResponse,
  ChannelAssetsOverviewResponse,
  SocialArtAsset,
} from "@studio/shared";

describe("channelAssetsApi", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes channelAssets on unified api facade", () => {
    expect(api.channelAssets).toBeDefined();
    expect(api.channelAssets.getChannelAssets).toBe(channelAssetsApi.getChannelAssets);
    expect(api.channelAssets.uploadBrandLogo).toBe(channelAssetsApi.uploadBrandLogo);
    expect(api.channelAssets.getExportZipUrl).toBe(channelAssetsApi.getExportZipUrl);
  });

  it("getChannelAssets calls GET /api/channels/:id/assets with encoded channelId", async () => {
    const mockOverview: ChannelAssetsOverviewResponse = {
      channel_id: "ch_123",
      channel_slug: "test-channel",
      manifest: {
        version: 1,
        updated_at: "2026-09-22T00:00:00.000Z",
        brand: {},
        social: {},
        art: [],
      },
      mascot: null,
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockOverview), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await channelAssetsApi.getChannelAssets("ch 123");
    expect(result).toEqual(mockOverview);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/channels/ch%20123/assets");
    expect(init?.headers?.get?.("accept")).toBe("application/json");
  });

  it("uploadBrandLogo calls POST /api/channels/:id/assets/brand/logo with payload", async () => {
    const mockMutation: ChannelAssetMutationResponse = {
      asset: {
        id: "logo_1",
        filename: "brand_logo.png",
        relative_path: "brand/brand_logo.png",
        mime_type: "image/png",
        size_bytes: 1234,
        width: 512,
        height: 512,
        created_at: "2026-09-22T00:00:00.000Z",
        updated_at: "2026-09-22T00:00:00.000Z",
      },
      manifest: {
        version: 1,
        updated_at: "2026-09-22T00:00:00.000Z",
        brand: {},
        social: {},
        art: [],
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockMutation), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const input = { image_data: "data:image/png;base64,ABC", filename: "brand_logo.png" };
    const result = await channelAssetsApi.uploadBrandLogo("ch_1", input);

    expect(result).toEqual(mockMutation);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/channels/ch_1/assets/brand/logo");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(input);
  });

  it("deleteBrandLogo calls DELETE /api/channels/:id/assets/brand/logo", async () => {
    const mockDelete: ChannelAssetDeleteResponse = {
      ok: true,
      manifest: {
        version: 1,
        updated_at: "2026-09-22T00:00:00.000Z",
        brand: {},
        social: {},
        art: [],
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockDelete), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await channelAssetsApi.deleteBrandLogo("ch_1");
    expect(result).toEqual(mockDelete);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/channels/ch_1/assets/brand/logo");
    expect(init?.method).toBe("DELETE");
  });

  it("uploadSocialAsset calls POST /api/channels/:id/assets/social/:platform/:kind", async () => {
    const mockMutation: ChannelAssetMutationResponse = {
      asset: {
        id: "yt_banner_1",
        filename: "youtube_banner.png",
        relative_path: "social/youtube/youtube_banner.png",
        mime_type: "image/png",
        size_bytes: 4567,
        width: 2560,
        height: 1440,
        created_at: "2026-09-22T00:00:00.000Z",
        updated_at: "2026-09-22T00:00:00.000Z",
      },
      manifest: {
        version: 1,
        updated_at: "2026-09-22T00:00:00.000Z",
        brand: {},
        social: {},
        art: [],
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockMutation), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const input = { platform: "youtube" as const, kind: "banner" as const, image_data: "data:image/png;base64,XYZ" };
    const result = await channelAssetsApi.uploadSocialAsset("ch_1", "youtube", "banner", input);

    expect(result).toEqual(mockMutation);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/channels/ch_1/assets/social/youtube/banner");
    expect(init?.method).toBe("POST");
  });

  it("deleteSocialAsset calls DELETE /api/channels/:id/assets/social/:platform/:kind", async () => {
    const mockDelete: ChannelAssetDeleteResponse = {
      ok: true,
      manifest: {
        version: 1,
        updated_at: "2026-09-22T00:00:00.000Z",
        brand: {},
        social: {},
        art: [],
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockDelete), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await channelAssetsApi.deleteSocialAsset("ch_1", "x", "avatar");
    expect(result).toEqual(mockDelete);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/channels/ch_1/assets/social/x/avatar");
    expect(init?.method).toBe("DELETE");
  });

  it("uploadSocialArt calls POST /api/channels/:id/assets/art", async () => {
    const mockArtMutation: ChannelAssetMutationResponse<SocialArtAsset> = {
      asset: {
        id: "art_1",
        filename: "nebula.png",
        relative_path: "art/nebula.png",
        mime_type: "image/png",
        size_bytes: 8888,
        width: 1920,
        height: 1080,
        tags: ["cosmic", "space"],
        caption: "Cosmic Nebula",
        created_at: "2026-09-22T00:00:00.000Z",
        updated_at: "2026-09-22T00:00:00.000Z",
      },
      manifest: {
        version: 1,
        updated_at: "2026-09-22T00:00:00.000Z",
        brand: {},
        social: {},
        art: [],
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockArtMutation), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const input = { image_data: "data:image/png;base64,ART", caption: "Cosmic Nebula", tags: ["cosmic", "space"] };
    const result = await channelAssetsApi.uploadSocialArt("ch_1", input);

    expect(result).toEqual(mockArtMutation);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/channels/ch_1/assets/art");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual(input);
  });

  it("deleteSocialArt calls DELETE /api/channels/:id/assets/art/:assetId", async () => {
    const mockDelete: ChannelAssetDeleteResponse = {
      ok: true,
      manifest: {
        version: 1,
        updated_at: "2026-09-22T00:00:00.000Z",
        brand: {},
        social: {},
        art: [],
      },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockDelete), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await channelAssetsApi.deleteSocialArt("ch_1", "art_123");
    expect(result).toEqual(mockDelete);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/channels/ch_1/assets/art/art_123");
    expect(init?.method).toBe("DELETE");
  });

  it("getExportZipUrl returns correct encoded zip download path", () => {
    const url = channelAssetsApi.getExportZipUrl("ch/special 123");
    expect(url).toBe("/api/channels/ch%2Fspecial%20123/assets/export-zip");
  });

  it("throws ApiError when server returns an error response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Channel assets not found", code: "NOT_FOUND" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(channelAssetsApi.getChannelAssets("missing_channel")).rejects.toThrowError(ApiError);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Channel assets not found", code: "NOT_FOUND" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    );

    try {
      await channelAssetsApi.getChannelAssets("missing_channel");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(404);
      expect(apiErr.message).toBe("Channel assets not found");
      expect(apiErr.code).toBe("NOT_FOUND");
    }
  });
});
