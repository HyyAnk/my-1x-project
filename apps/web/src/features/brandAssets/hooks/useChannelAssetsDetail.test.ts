import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type {
  ChannelAssetDeleteResponse,
  ChannelAssetMutationResponse,
  ChannelAssetsOverviewResponse,
} from "@studio/shared";
import { api } from "../../../api";
import { useChannelAssetsDetail } from "./useChannelAssetsDetail";

vi.mock("../../../api", () => ({
  api: {
    channelAssets: {
      getChannelAssets: vi.fn(),
      uploadBrandLogo: vi.fn(),
      deleteBrandLogo: vi.fn(),
      uploadSocialAsset: vi.fn(),
      deleteSocialAsset: vi.fn(),
      uploadSocialArt: vi.fn(),
      deleteSocialArt: vi.fn(),
      getExportZipUrl: vi.fn(),
    },
  },
}));

const mockOverview: ChannelAssetsOverviewResponse = {
  channel_id: "ch_alpha",
  channel_slug: "alpha-channel",
  manifest: {
    version: 1,
    updated_at: "2026-09-22T00:00:00.000Z",
    brand: {},
    social: {},
    art: [],
  },
  mascot: {
    mascot_id: "mascot_1",
    name: "Alpha Fox",
    master_image_url: "/mascots/mascot_1/concept.png",
  },
};

describe("useChannelAssetsDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("loads channel assets overview when channelId is provided", async () => {
    vi.mocked(api.channelAssets.getChannelAssets).mockResolvedValueOnce(mockOverview);

    const { result } = renderHook(() =>
      useChannelAssetsDetail({ channelId: "ch_alpha" }),
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.channelAssets.getChannelAssets).toHaveBeenCalledWith("ch_alpha");
    expect(result.current.overview).toEqual(mockOverview);
    expect(result.current.error).toBeNull();
  });

  it("does not fetch when channelId is null or undefined", () => {
    const { result } = renderHook(() =>
      useChannelAssetsDetail({ channelId: null }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.overview).toBeNull();
    expect(api.channelAssets.getChannelAssets).not.toHaveBeenCalled();
  });

  it("handles fetch error and calls onNotice", async () => {
    const onNotice = vi.fn();
    vi.mocked(api.channelAssets.getChannelAssets).mockRejectedValueOnce(
      new Error("Network failed"),
    );

    const { result } = renderHook(() =>
      useChannelAssetsDetail({ channelId: "ch_alpha", onNotice }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network failed");
    expect(onNotice).toHaveBeenCalledWith({
      tone: "bad",
      message: "Network failed",
    });
  });

  it("uploads brand logo and updates overview manifest", async () => {
    vi.mocked(api.channelAssets.getChannelAssets).mockResolvedValueOnce(mockOverview);
    const mockMutation: ChannelAssetMutationResponse = {
      asset: {
        id: "logo_123",
        filename: "logo.png",
        relative_path: "brand/logo.png",
        mime_type: "image/png",
        size_bytes: 1024,
        width: 512,
        height: 512,
        created_at: "2026-09-22T00:00:00.000Z",
        updated_at: "2026-09-22T00:00:00.000Z",
      },
      manifest: {
        ...mockOverview.manifest,
        brand: {
          logo: {
            id: "logo_123",
            filename: "logo.png",
            relative_path: "brand/logo.png",
            mime_type: "image/png",
            size_bytes: 1024,
            width: 512,
            height: 512,
            created_at: "2026-09-22T00:00:00.000Z",
            updated_at: "2026-09-22T00:00:00.000Z",
          },
        },
      },
    };
    vi.mocked(api.channelAssets.uploadBrandLogo).mockResolvedValueOnce(mockMutation);
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useChannelAssetsDetail({ channelId: "ch_alpha", onNotice }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(["dummy content"], "logo.png", { type: "image/png" });

    await act(async () => {
      await result.current.uploadLogo(file);
    });

    expect(api.channelAssets.uploadBrandLogo).toHaveBeenCalled();
    expect(result.current.overview?.manifest.brand.logo?.id).toBe("logo_123");
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "Channel logo uploaded successfully.",
    });
  });

  it("deletes brand logo and updates overview manifest", async () => {
    vi.mocked(api.channelAssets.getChannelAssets).mockResolvedValueOnce(mockOverview);
    const mockDelete: ChannelAssetDeleteResponse = {
      ok: true,
      manifest: {
        ...mockOverview.manifest,
        brand: {},
      },
    };
    vi.mocked(api.channelAssets.deleteBrandLogo).mockResolvedValueOnce(mockDelete);
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useChannelAssetsDetail({ channelId: "ch_alpha", onNotice }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteLogo();
    });

    expect(api.channelAssets.deleteBrandLogo).toHaveBeenCalledWith("ch_alpha");
    expect(result.current.overview?.manifest.brand.logo).toBeUndefined();
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "Channel logo deleted successfully.",
    });
  });

  it("uploads social asset and updates overview manifest", async () => {
    vi.mocked(api.channelAssets.getChannelAssets).mockResolvedValueOnce(mockOverview);
    const mockMutation: ChannelAssetMutationResponse = {
      asset: {
        id: "yt_avatar_1",
        filename: "avatar.png",
        relative_path: "social/youtube/avatar.png",
        mime_type: "image/png",
        size_bytes: 2048,
        width: 800,
        height: 800,
        created_at: "2026-09-22T00:00:00.000Z",
        updated_at: "2026-09-22T00:00:00.000Z",
      },
      manifest: {
        ...mockOverview.manifest,
        social: {
          youtube: {
            avatar: {
              id: "yt_avatar_1",
              filename: "avatar.png",
              relative_path: "social/youtube/avatar.png",
              mime_type: "image/png",
              size_bytes: 2048,
              width: 800,
              height: 800,
              created_at: "2026-09-22T00:00:00.000Z",
              updated_at: "2026-09-22T00:00:00.000Z",
            },
          },
        },
      },
    };
    vi.mocked(api.channelAssets.uploadSocialAsset).mockResolvedValueOnce(mockMutation);
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useChannelAssetsDetail({ channelId: "ch_alpha", onNotice }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(["test avatar"], "avatar.png", { type: "image/png" });

    await act(async () => {
      await result.current.uploadSocialAsset("youtube", "avatar", file);
    });

    expect(api.channelAssets.uploadSocialAsset).toHaveBeenCalled();
    expect(result.current.overview?.manifest.social.youtube?.avatar?.id).toBe("yt_avatar_1");
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "YouTube avatar uploaded successfully.",
    });
  });

  it("deletes social asset and updates overview manifest", async () => {
    vi.mocked(api.channelAssets.getChannelAssets).mockResolvedValueOnce(mockOverview);
    const mockDelete: ChannelAssetDeleteResponse = {
      ok: true,
      manifest: {
        ...mockOverview.manifest,
        social: {
          youtube: {},
        },
      },
    };
    vi.mocked(api.channelAssets.deleteSocialAsset).mockResolvedValueOnce(mockDelete);
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useChannelAssetsDetail({ channelId: "ch_alpha", onNotice }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteSocialAsset("youtube", "avatar");
    });

    expect(api.channelAssets.deleteSocialAsset).toHaveBeenCalledWith("ch_alpha", "youtube", "avatar");
    expect(result.current.overview?.manifest.social.youtube?.avatar).toBeUndefined();
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "YouTube avatar deleted successfully.",
    });
  });

  it("uploads social artwork and updates overview manifest", async () => {
    vi.mocked(api.channelAssets.getChannelAssets).mockResolvedValueOnce(mockOverview);
    const mockArtMutation: ChannelAssetMutationResponse = {
      asset: {
        id: "art_1",
        filename: "sticker.png",
        relative_path: "art/sticker.png",
        mime_type: "image/png",
        size_bytes: 2048,
        width: 512,
        height: 512,
        created_at: "2026-09-22T00:00:00.000Z",
        updated_at: "2026-09-22T00:00:00.000Z",
      },
      manifest: {
        ...mockOverview.manifest,
        art: [
          {
            id: "art_1",
            filename: "sticker.png",
            relative_path: "art/sticker.png",
            mime_type: "image/png",
            size_bytes: 2048,
            width: 512,
            height: 512,
            created_at: "2026-09-22T00:00:00.000Z",
            updated_at: "2026-09-22T00:00:00.000Z",
            tags: [],
            caption: "Fun sticker",
          },
        ],
      },
    };
    vi.mocked(api.channelAssets.uploadSocialArt).mockResolvedValueOnce(mockArtMutation as never);
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useChannelAssetsDetail({ channelId: "ch_alpha", onNotice }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const file = new File(["dummy art"], "sticker.png", { type: "image/png" });
    await act(async () => {
      await result.current.uploadSocialArt(file, "Fun sticker");
    });

    expect(api.channelAssets.uploadSocialArt).toHaveBeenCalledWith(
      "ch_alpha",
      expect.objectContaining({
        filename: "sticker.png",
        caption: "Fun sticker",
      }),
    );
    expect(result.current.overview?.manifest.art).toHaveLength(1);
    expect(result.current.overview?.manifest.art[0].id).toBe("art_1");
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "Social artwork uploaded successfully.",
    });
  });

  it("deletes social artwork and updates overview manifest", async () => {
    vi.mocked(api.channelAssets.getChannelAssets).mockResolvedValueOnce({
      ...mockOverview,
      manifest: {
        ...mockOverview.manifest,
        art: [
          {
            id: "art_1",
            filename: "sticker.png",
            relative_path: "art/sticker.png",
            mime_type: "image/png",
            size_bytes: 2048,
            width: 512,
            height: 512,
            created_at: "2026-09-22T00:00:00.000Z",
            updated_at: "2026-09-22T00:00:00.000Z",
            tags: [],
          },
        ],
      },
    });

    const mockDeleteRes: ChannelAssetDeleteResponse = {
      ok: true,
      manifest: {
        ...mockOverview.manifest,
        art: [],
      },
    };
    vi.mocked(api.channelAssets.deleteSocialArt).mockResolvedValueOnce(mockDeleteRes);
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useChannelAssetsDetail({ channelId: "ch_alpha", onNotice }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteSocialArt("art_1");
    });

    expect(api.channelAssets.deleteSocialArt).toHaveBeenCalledWith("ch_alpha", "art_1");
    expect(result.current.overview?.manifest.art).toHaveLength(0);
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "Social artwork deleted successfully.",
    });
  });

  it("triggers brand kit export via exportBrandKit", async () => {
    vi.mocked(api.channelAssets.getChannelAssets).mockResolvedValueOnce(mockOverview);
    vi.mocked(api.channelAssets.getExportZipUrl).mockReturnValueOnce("/api/channels/ch_alpha/assets/export-zip");
    const onNotice = vi.fn();

    const { result } = renderHook(() =>
      useChannelAssetsDetail({ channelId: "ch_alpha", onNotice }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.exportBrandKit();
    });

    expect(api.channelAssets.getExportZipUrl).toHaveBeenCalledWith("ch_alpha");
    expect(onNotice).toHaveBeenCalledWith({
      tone: "good",
      message: "Brand kit export initiated.",
    });
  });
});
