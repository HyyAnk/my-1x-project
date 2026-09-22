import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { SocialArtSection } from "./SocialArtSection";
import type { SocialArtAsset } from "@studio/shared";

const mockArtAssets: SocialArtAsset[] = [
  {
    id: "art_1",
    filename: "badge.png",
    relative_path: "art/badge.png",
    url: "/assets/art/badge.png",
    mime_type: "image/png",
    size_bytes: 1024,
    width: 512,
    height: 512,
    created_at: "2026-09-22T00:00:00Z",
    updated_at: "2026-09-22T00:00:00Z",
    tags: [],
    caption: "Badge graphic",
  },
  {
    id: "art_2",
    filename: "wallpaper.jpg",
    relative_path: "art/wallpaper.jpg",
    url: "/assets/art/wallpaper.jpg",
    mime_type: "image/jpeg",
    size_bytes: 2048,
    width: 1920,
    height: 1080,
    created_at: "2026-09-22T00:00:00Z",
    updated_at: "2026-09-22T00:00:00Z",
    tags: [],
  },
];

describe("SocialArtSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders empty state when there are no art assets", () => {
    render(
      <SocialArtSection
        artAssets={[]}
        onUploadArt={vi.fn()}
        onDeleteArt={vi.fn()}
      />,
    );

    expect(screen.getByTestId("social-art-section")).toBeTruthy();
    expect(screen.getByText("Social Art & Auxiliary Media")).toBeTruthy();
    expect(screen.getByTestId("art-count-badge").textContent).toContain("0 assets");
    expect(screen.getByTestId("social-art-empty-state")).toBeTruthy();
    expect(screen.getByText("No auxiliary art assets yet")).toBeTruthy();
  });

  it("renders art cards grid when assets are present", () => {
    render(
      <SocialArtSection
        artAssets={mockArtAssets}
        onUploadArt={vi.fn()}
        onDeleteArt={vi.fn()}
      />,
    );

    expect(screen.getByTestId("art-count-badge").textContent).toContain("2 assets");
    expect(screen.getByTestId("social-art-grid")).toBeTruthy();
    expect(screen.getByTestId("social-art-card-art_1")).toBeTruthy();
    expect(screen.getByTestId("social-art-card-art_2")).toBeTruthy();
    expect(screen.getByText("badge.png")).toBeTruthy();
    expect(screen.getByText("wallpaper.jpg")).toBeTruthy();
  });

  it("handles multi-file upload through file input", async () => {
    const handleUpload = vi.fn().mockResolvedValue(undefined);
    const onNotice = vi.fn();

    render(
      <SocialArtSection
        artAssets={mockArtAssets}
        onUploadArt={handleUpload}
        onDeleteArt={vi.fn()}
        onNotice={onNotice}
      />,
    );

    const input = screen.getByTestId("art-multi-file-input") as HTMLInputElement;
    const file1 = new File(["file1"], "sticker1.png", { type: "image/png" });
    const file2 = new File(["file2"], "sticker2.png", { type: "image/png" });

    fireEvent.change(input, {
      target: { files: [file1, file2] },
    });

    await waitFor(() => {
      expect(handleUpload).toHaveBeenCalledTimes(2);
    });
    expect(handleUpload).toHaveBeenNthCalledWith(1, file1);
    expect(handleUpload).toHaveBeenNthCalledWith(2, file2);

    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        tone: "good",
        message: expect.stringContaining("Uploaded 2 of 2 artworks"),
      }),
    );
  });

  it("opens Lightbox when clicking View on a card and closes when clicking close", () => {
    render(
      <SocialArtSection
        artAssets={mockArtAssets}
        onUploadArt={vi.fn()}
        onDeleteArt={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("art-lightbox-modal")).toBeNull();

    const viewBtn = screen.getByTestId("view-art-btn-art_1");
    fireEvent.click(viewBtn);

    expect(screen.getByTestId("art-lightbox-modal")).toBeTruthy();
    const modal = screen.getByTestId("art-lightbox-modal");
    expect(within(modal).getByText("Badge graphic")).toBeTruthy();

    const closeBtn = screen.getByTestId("lightbox-close-btn");
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId("art-lightbox-modal")).toBeNull();
  });

  it("opens delete confirmation modal and calls onDeleteArt upon confirm", async () => {
    const handleDeleteArt = vi.fn().mockResolvedValue(undefined);

    render(
      <SocialArtSection
        artAssets={mockArtAssets}
        onUploadArt={vi.fn()}
        onDeleteArt={handleDeleteArt}
      />,
    );

    expect(screen.queryByTestId("art-delete-confirm-modal")).toBeNull();

    const deleteBtn = screen.getByTestId("delete-art-btn-art_1");
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId("art-delete-confirm-modal")).toBeTruthy();
    expect(screen.getByText(/Are you sure you want to permanently delete/i)).toBeTruthy();

    const confirmBtn = screen.getByTestId("confirm-delete-artwork-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleDeleteArt).toHaveBeenCalledWith("art_1");
    });
  });

  it("cancels delete modal when clicking Cancel", () => {
    const handleDeleteArt = vi.fn();

    render(
      <SocialArtSection
        artAssets={mockArtAssets}
        onUploadArt={vi.fn()}
        onDeleteArt={handleDeleteArt}
      />,
    );

    const deleteBtn = screen.getByTestId("delete-art-btn-art_1");
    fireEvent.click(deleteBtn);

    const cancelBtn = screen.getByTestId("cancel-delete-artwork-btn");
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId("art-delete-confirm-modal")).toBeNull();
    expect(handleDeleteArt).not.toHaveBeenCalled();
  });
});
