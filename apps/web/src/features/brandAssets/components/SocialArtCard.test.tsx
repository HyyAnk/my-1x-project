import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { SocialArtCard } from "./SocialArtCard";
import type { SocialArtAsset } from "@studio/shared";
import * as fileHelpers from "../utils/fileUploadHelpers";

const mockAsset: SocialArtAsset = {
  id: "art_badge_01",
  filename: "golden-badge.png",
  relative_path: "art/golden-badge.png",
  url: "/channels/ch_1/assets/art/golden-badge.png",
  mime_type: "image/png",
  size_bytes: 204800,
  width: 1920,
  height: 1080,
  created_at: "2026-09-22T00:00:00Z",
  updated_at: "2026-09-22T00:00:00Z",
  tags: ["sticker", "overlay"],
  caption: "Special award overlay sticker",
};

describe("SocialArtCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders artwork preview, filename, dimensions, size, and caption", () => {
    render(
      <SocialArtCard
        asset={mockAsset}
        onView={vi.fn()}
        onDeleteRequest={vi.fn()}
      />,
    );

    expect(screen.getByTestId("social-art-card-art_badge_01")).toBeTruthy();
    expect(screen.getByText("golden-badge.png")).toBeTruthy();
    expect(screen.getByText("1920 × 1080 px")).toBeTruthy();
    expect(screen.getByText("200 KB")).toBeTruthy();
    expect(screen.getByText("Special award overlay sticker")).toBeTruthy();

    const img = screen.getByTestId("art-card-img-art_badge_01") as HTMLImageElement;
    expect(img.src).toContain(mockAsset.url);
  });

  it("calls onView when View button in toolbar or overlay is clicked", () => {
    const handleView = vi.fn();
    render(
      <SocialArtCard
        asset={mockAsset}
        onView={handleView}
        onDeleteRequest={vi.fn()}
      />,
    );

    const toolbarViewBtn = screen.getByTestId("view-art-btn-art_badge_01");
    fireEvent.click(toolbarViewBtn);
    expect(handleView).toHaveBeenCalledWith(mockAsset);

    const overlayViewBtn = screen.getByTestId("overlay-view-art_badge_01");
    fireEvent.click(overlayViewBtn);
    expect(handleView).toHaveBeenCalledTimes(2);
  });

  it("triggers file download when Download button is clicked", () => {
    const triggerSpy = vi.spyOn(fileHelpers, "triggerFileDownload").mockImplementation(() => {});
    render(
      <SocialArtCard
        asset={mockAsset}
        onView={vi.fn()}
        onDeleteRequest={vi.fn()}
      />,
    );

    const downloadBtn = screen.getByTestId("download-art-btn-art_badge_01");
    fireEvent.click(downloadBtn);

    expect(triggerSpy).toHaveBeenCalledWith(mockAsset.url, mockAsset.filename);
  });

  it("copies relative path to clipboard and calls onNotice", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const onNotice = vi.fn();
    render(
      <SocialArtCard
        asset={mockAsset}
        onView={vi.fn()}
        onDeleteRequest={vi.fn()}
        onNotice={onNotice}
      />,
    );

    const copyBtn = screen.getByTestId("copy-path-btn-art_badge_01");
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("art/golden-badge.png");
      expect(onNotice).toHaveBeenCalledWith({
        tone: "good",
        message: "Relative path copied to clipboard",
      });
    });
  });

  it("calls onDeleteRequest when Delete button is clicked", () => {
    const handleDeleteRequest = vi.fn();
    render(
      <SocialArtCard
        asset={mockAsset}
        onView={vi.fn()}
        onDeleteRequest={handleDeleteRequest}
      />,
    );

    const deleteBtn = screen.getByTestId("delete-art-btn-art_badge_01");
    fireEvent.click(deleteBtn);

    expect(handleDeleteRequest).toHaveBeenCalledWith(mockAsset);
  });
});
