import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import type { ChannelAssetManifest } from "@studio/shared";
import { SocialDesignSection } from "./SocialDesignSection";

const mockManifest: ChannelAssetManifest = {
  version: 1,
  updated_at: "2026-09-22T00:00:00.000Z",
  brand: {},
  social: {
    youtube: {
      avatar: {
        id: "yt_avatar_1",
        filename: "yt_avatar.png",
        relative_path: "social/youtube/yt_avatar.png",
        url: "/api/channels/ch1/assets/file/social/youtube/yt_avatar.png",
        mime_type: "image/png",
        size_bytes: 4096,
        width: 800,
        height: 800,
        created_at: "2026-09-22T00:00:00.000Z",
        updated_at: "2026-09-22T00:00:00.000Z",
      },
    },
    x: {
      banner: {
        id: "x_banner_1",
        filename: "x_header.png",
        relative_path: "social/x/x_header.png",
        url: "/api/channels/ch1/assets/file/social/x/x_header.png",
        mime_type: "image/png",
        size_bytes: 8192,
        width: 1500,
        height: 500,
        created_at: "2026-09-22T00:00:00.000Z",
        updated_at: "2026-09-22T00:00:00.000Z",
      },
    },
  },
  art: [],
};

describe("SocialDesignSection", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders YouTube tab by default with Avatar and Banner cards", () => {
    render(
      <SocialDesignSection
        manifest={mockManifest}
        onUploadAsset={vi.fn()}
        onDeleteAsset={vi.fn()}
      />,
    );

    expect(screen.getByTestId("youtube-assets-panel")).toBeTruthy();
    expect(screen.getByText("YouTube Profile Avatar")).toBeTruthy();
    expect(screen.getByText("YouTube Channel Banner")).toBeTruthy();
    expect(screen.getByTestId("social-status-pill-youtube-avatar").textContent).toBe("Configured");
    expect(screen.getByTestId("social-status-pill-youtube-banner").textContent).toBe("Missing");
  });

  it("switches to X (Twitter) platform tab when clicked", () => {
    render(
      <SocialDesignSection
        manifest={mockManifest}
        onUploadAsset={vi.fn()}
        onDeleteAsset={vi.fn()}
      />,
    );

    const xTab = screen.getByTestId("subtab-x");
    fireEvent.click(xTab);

    expect(screen.getByTestId("x-assets-panel")).toBeTruthy();
    expect(screen.getByText("X Profile Avatar")).toBeTruthy();
    expect(screen.getByText("X Header / Banner")).toBeTruthy();
    expect(screen.getByTestId("social-status-pill-x-avatar").textContent).toBe("Missing");
    expect(screen.getByTestId("social-status-pill-x-banner").textContent).toBe("Configured");
  });

  it("keeps Facebook and TikTok tabs disabled with Coming Soon badges", () => {
    render(
      <SocialDesignSection
        manifest={mockManifest}
        onUploadAsset={vi.fn()}
        onDeleteAsset={vi.fn()}
      />,
    );

    const fbTab = screen.getByTestId("subtab-facebook") as HTMLButtonElement;
    const ttTab = screen.getByTestId("subtab-tiktok") as HTMLButtonElement;

    expect(fbTab.disabled).toBe(true);
    expect(ttTab.disabled).toBe(true);
    expect(screen.getAllByText("Coming Soon").length).toBe(2);
  });

  it("triggers upload callback when uploading avatar or banner", () => {
    const handleUpload = vi.fn();
    render(
      <SocialDesignSection
        manifest={mockManifest}
        onUploadAsset={handleUpload}
        onDeleteAsset={vi.fn()}
      />,
    );

    const fileInput = screen.getByTestId("social-file-input-youtube-banner") as HTMLInputElement;
    const testFile = new File(["banner data"], "yt_banner.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [testFile] } });
    expect(handleUpload).toHaveBeenCalledWith("youtube", "banner", testFile);
  });

  it("triggers delete callback with confirmation flow", async () => {
    const handleDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <SocialDesignSection
        manifest={mockManifest}
        onUploadAsset={vi.fn()}
        onDeleteAsset={handleDelete}
      />,
    );

    const deleteBtn = screen.getByTestId("delete-asset-youtube-avatar");
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.getByTestId("confirm-delete-youtube-avatar");
    expect(confirmBtn).toBeTruthy();

    fireEvent.click(confirmBtn);
    expect(handleDelete).toHaveBeenCalledWith("youtube", "avatar");
  });
});
